from datetime import timedelta

import pytest
from django.utils import timezone

from core.models import DocumentLifecycleStatus
from rfi_change_control.serializers import ChangeOrderSerializer
from rfi_change_control.services import (
    create_change_order,
    create_rfi,
    flag_silent_rfis,
    get_at_risk_rfis,
    get_master_schedule,
    respond_to_rfi,
)
from trust_evidence.services import get_open_silence_flags


@pytest.mark.django_db
def test_create_rfi_is_under_review_with_sla_deadline(project, contractor_user):
    respond_by = timezone.now() + timedelta(days=3)
    rfi = create_rfi(project=project, raised_by=contractor_user, title="Anchor spec", question="Which anchor?", respond_by=respond_by)
    assert rfi.status == DocumentLifecycleStatus.UNDER_REVIEW
    assert rfi.number == "RFI-001"
    assert rfi.sla_deadline == respond_by


@pytest.mark.django_db
def test_second_rfi_gets_sequential_number(project, contractor_user):
    respond_by = timezone.now() + timedelta(days=1)
    create_rfi(project=project, raised_by=contractor_user, title="A", question="?", respond_by=respond_by)
    rfi2 = create_rfi(project=project, raised_by=contractor_user, title="B", question="?", respond_by=respond_by)
    assert rfi2.number == "RFI-002"


@pytest.mark.django_db
def test_respond_to_rfi_closes_it_and_resolves_silence(project, contractor_user, consultant_user):
    respond_by = timezone.now() - timedelta(hours=1)
    rfi = create_rfi(project=project, raised_by=contractor_user, title="Anchor spec", question="Which anchor?", respond_by=respond_by)
    flag_silent_rfis(project=project)
    assert len(get_open_silence_flags(project)) == 1

    respond_to_rfi(rfi, consultant_user, "Use the M12 anchor per spec section 05120.")
    rfi.refresh_from_db()
    assert rfi.status == DocumentLifecycleStatus.APPROVED
    assert get_open_silence_flags(project) == []


@pytest.mark.django_db
def test_respond_to_rfi_rejects_empty_response(project, contractor_user, consultant_user):
    rfi = create_rfi(project=project, raised_by=contractor_user, title="X", question="?", respond_by=timezone.now() + timedelta(days=1))
    with pytest.raises(ValueError):
        respond_to_rfi(rfi, consultant_user, "   ")


@pytest.mark.django_db
def test_at_risk_rfi_detection(project, contractor_user):
    overdue = create_rfi(project=project, raised_by=contractor_user, title="Overdue", question="?", respond_by=timezone.now() - timedelta(hours=1))
    soon = create_rfi(project=project, raised_by=contractor_user, title="Due soon", question="?", respond_by=timezone.now() + timedelta(hours=2))
    safe = create_rfi(project=project, raised_by=contractor_user, title="Safe", question="?", respond_by=timezone.now() + timedelta(days=5))

    at_risk_ids = {rfi.id for rfi in get_at_risk_rfis(project)}
    assert at_risk_ids == {overdue.id, soon.id}
    assert safe.id not in at_risk_ids


@pytest.mark.django_db
def test_change_order_rejects_placeholder_scope_delta():
    serializer = ChangeOrderSerializer(data={
        "project": 1, "title": "x", "baseline_scope": "some baseline",
        "scope_delta": "n/a", "cost_impact": "100.00", "schedule_impact_days": 1,
    })
    assert serializer.is_valid() is False
    assert "scope_delta" in serializer.errors


@pytest.mark.django_db
def test_change_order_accepts_real_structured_data(project, owner_user):
    co = create_change_order(
        project=project, raised_by=owner_user, title="MEP reroute",
        baseline_scope="Original MEP shaft routing per drawing M-401",
        scope_delta="Reroute shaft 1.2m east to clear structural beam at level 12",
        cost_impact="42000.00", schedule_impact_days=9,
    )
    assert co.cost_impact == 42000
    assert co.status == DocumentLifecycleStatus.DRAFT


@pytest.mark.django_db
def test_master_schedule_includes_handover_milestone(project, owner_user):
    import handover.services as handover

    handover.record_practical_completion(project=project, practical_completion_date=timezone.now().date(), recorded_by=owner_user)
    create_rfi(project=project, raised_by=owner_user, title="X", question="?", respond_by=timezone.now() + timedelta(days=1))

    schedule = get_master_schedule(project)
    types = {item["type"] for item in schedule}
    assert "handover_milestone" in types
    assert "rfi" in types
