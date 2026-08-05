"""
Service layer for Module 15 - five separate signal categories per
skills/observability/SKILL.md, not one generic dashboard: integration
health, webhook delivery (read from platform_api), SLA compliance, usage/
adoption, and security/incident monitoring (read from trust_evidence).
"""

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from core.models import Project

from .models import AlertEvent, AlertSeverity, DigestOpenEvent, HealthStatus, IntegrationHealthCheck

QUIET_PROJECT_THRESHOLD_DAYS = 7


# --- Integration health -------------------------------------------------


def report_integration_health(*, integration_type: str, status: str, project=None, error: str = "", details: dict | None = None) -> IntegrationHealthCheck:
    """
    The write path a real field-capture (WhatsApp) or unified-timeline
    (email OAuth / Balady) health-check would call once built. Also used
    directly by the demo seed to populate a labeled-simulated status.
    """
    check, _ = IntegrationHealthCheck.objects.update_or_create(
        project=project, integration_type=integration_type,
        defaults={"status": status, "last_error": error, "details": details or {}},
    )
    if status == HealthStatus.DOWN:
        raise_alert(severity=AlertSeverity.CRITICAL, source="integration_health", project=project,
                     message=f"{integration_type} is down" + (f": {error}" if error else ""))
    return check


def get_integration_health(project=None) -> list[IntegrationHealthCheck]:
    qs = IntegrationHealthCheck.objects.select_related("project")
    if project is not None:
        # Platform-wide rows (project IS NULL) are visible in every project's
        # view - `project__in=[project, None]` would silently drop them (SQL
        # IN never matches NULL).
        qs = qs.filter(Q(project=project) | Q(project__isnull=True))
    return list(qs)


# --- Internal alerting ----------------------------------------------------


def raise_alert(*, severity: str, source: str, message: str, project=None) -> AlertEvent:
    return AlertEvent.objects.create(severity=severity, source=source, message=message, project=project)


def acknowledge_alert(alert: AlertEvent, user) -> AlertEvent:
    alert.acknowledged = True
    alert.acknowledged_by = user
    alert.acknowledged_at = timezone.now()
    alert.save(update_fields=["acknowledged", "acknowledged_by", "acknowledged_at", "updated_at"])
    return alert


def get_alerts(project=None, unacknowledged_only: bool = False):
    qs = AlertEvent.objects.select_related("project", "acknowledged_by")
    if project is not None:
        qs = qs.filter(project=project)
    if unacknowledged_only:
        qs = qs.filter(acknowledged=False)
    return qs


# --- Usage / adoption -------------------------------------------------------


def record_digest_view(project, user) -> DigestOpenEvent:
    return DigestOpenEvent.objects.create(project=project, user=user)


def get_usage_summary(project) -> dict:
    now = timezone.now()
    opens = DigestOpenEvent.objects.filter(project=project)
    return {
        "digest_opens_last_7_days": opens.filter(created_at__gte=now - timedelta(days=7)).count(),
        "digest_opens_last_30_days": opens.filter(created_at__gte=now - timedelta(days=30)).count(),
        "last_opened_at": opens.order_by("-created_at").values_list("created_at", flat=True).first(),
    }


def get_quiet_projects(quiet_days: int = QUIET_PROJECT_THRESHOLD_DAYS) -> list[dict]:
    """Projects with no audit-log activity in `quiet_days` - a module/project
    'gone quiet' per the skill. Two queries total, never one per project."""
    import trust_evidence.services as trust_evidence

    cutoff = timezone.now() - timedelta(days=quiet_days)
    last_activity = trust_evidence.get_last_activity_by_project()
    quiet = []
    for project_id, project_name in Project.objects.values_list("id", "name"):
        last_at = last_activity.get(project_id)
        if last_at is None or last_at < cutoff:
            quiet.append({"project_id": project_id, "project_name": project_name, "last_activity_at": last_at})
    return quiet


# --- SLA compliance (cross-project - San3-internal, not per-project owner view) ---


def get_sla_compliance_summary() -> dict:
    import approvals.services as approvals

    return approvals.get_sla_compliance_summary()


# --- Security / incident monitoring ------------------------------------
#
# Two distinct sources, deliberately not merged into one shape:
#  - permission_denied is project-scoped (raised inside a project-scoped
#    view) and lives in trust_evidence's project-anchored audit log.
#  - authentication_failed happens *before* any project is resolved (a
#    login attempt isn't project-scoped), so it can't satisfy AuditEvent's
#    "every event is project-anchored" invariant - it's logged as an
#    observability AlertEvent instead (project=None is a supported case
#    there), not forced into the audit log's shape.


def get_permission_denied_events(project=None, limit: int = 100) -> list:
    import trust_evidence.services as trust_evidence

    # One query either way: get_audit_events reads across all projects when
    # project is None (this view is staff-gated, so that's safe here).
    return trust_evidence.get_audit_events(project, event_type="permission_denied", limit=limit)


def record_authentication_failure(email: str) -> AlertEvent:
    return raise_alert(
        severity=AlertSeverity.WARNING, source="security",
        message=f"Failed login attempt for {email}",
    )
