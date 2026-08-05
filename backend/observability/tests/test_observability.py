from datetime import timedelta

import pytest
from django.utils import timezone

from approvals.models import RaciRole
from approvals.services import confirm_hearing, escalate_if_breached, record_agreement, request_decision
from observability.models import AlertSeverity, HealthStatus, IntegrationType
from observability.services import (
    acknowledge_alert,
    get_alerts,
    get_integration_health,
    get_quiet_projects,
    get_sla_compliance_summary,
    get_usage_summary,
    raise_alert,
    record_digest_view,
    report_integration_health,
)


@pytest.mark.django_db
def test_report_integration_health_upserts(project):
    report_integration_health(project=project, integration_type=IntegrationType.WHATSAPP_SESSION, status=HealthStatus.HEALTHY)
    report_integration_health(project=project, integration_type=IntegrationType.WHATSAPP_SESSION, status=HealthStatus.DEGRADED, error="slow responses")

    checks = get_integration_health(project)
    assert len(checks) == 1
    assert checks[0].status == HealthStatus.DEGRADED


@pytest.mark.django_db
def test_down_integration_raises_critical_alert(project):
    report_integration_health(project=project, integration_type=IntegrationType.EMAIL_OAUTH, status=HealthStatus.DOWN, error="invalid_grant")
    alerts = get_alerts(project)
    assert any(a.severity == AlertSeverity.CRITICAL and "email_oauth" in a.message for a in alerts)


@pytest.mark.django_db
def test_acknowledge_alert(project, owner_user):
    alert = raise_alert(severity=AlertSeverity.WARNING, source="test", message="test alert", project=project)
    assert alert.acknowledged is False

    acknowledge_alert(alert, owner_user)
    alert.refresh_from_db()
    assert alert.acknowledged is True
    assert alert.acknowledged_by == owner_user


@pytest.mark.django_db
def test_usage_summary_counts_digest_opens(project, owner_user):
    record_digest_view(project, owner_user)
    record_digest_view(project, owner_user)

    summary = get_usage_summary(project)
    assert summary["digest_opens_last_7_days"] == 2
    assert summary["last_opened_at"] is not None


@pytest.mark.django_db
def test_quiet_project_detection(project, owner_user):
    from trust_evidence.services import record_event

    # No activity at all -> quiet.
    quiet = get_quiet_projects(quiet_days=7)
    assert any(p["project_id"] == project.id for p in quiet)

    record_event(project=project, actor=owner_user, event_type="test_event")
    quiet_after = get_quiet_projects(quiet_days=7)
    assert not any(p["project_id"] == project.id for p in quiet_after)


@pytest.mark.django_db
def test_sla_compliance_summary_reflects_escalations(project, owner_user, contractor_user):
    decision = request_decision(
        project=project, title="Overdue item", requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}], high_stakes=False,
    )
    decision.sla_deadline = timezone.now() - timedelta(hours=1)
    decision.save(update_fields=["sla_deadline"])
    escalate_if_breached(decision)

    summary = get_sla_compliance_summary()
    assert summary["total_decisions"] >= 1
    assert summary["escalated_count"] >= 1
    assert summary["escalation_rate"] > 0


@pytest.mark.django_db
def test_sla_compliance_avg_close_time(project, owner_user):
    decision = request_decision(
        project=project, title="Quick item", requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}], high_stakes=False,
    )
    confirm_hearing(decision, owner_user)
    record_agreement(decision, owner_user)

    summary = get_sla_compliance_summary()
    assert summary["closed_count"] >= 1
    assert summary["avg_hours_to_close"] is not None
