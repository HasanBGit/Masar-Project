"""HTTP-level tests for handover: record POST validation, O&M verify RBAC, defect lifecycle."""

import pytest
from rest_framework.test import APIClient

from handover.models import PostHandoverStatus
from handover.services import create_om_item, report_defect

BASE = "/api/v1/handover"


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_record_post_valid_date_computes_decennial_window(project, owner_user):
    response = _client(owner_user).post(
        f"{BASE}/record/", {"project": project.id, "practical_completion_date": "2026-01-01"}
    )
    assert response.status_code == 201
    assert response.data["practical_completion_date"] == "2026-01-01"
    assert response.data["decennial_liability_expires_at"] == "2036-01-01"


@pytest.mark.django_db
def test_record_post_invalid_date_returns_400(project, owner_user):
    response = _client(owner_user).post(
        f"{BASE}/record/", {"project": project.id, "practical_completion_date": "not-a-date"}
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_record_post_missing_date_returns_400(project, owner_user):
    response = _client(owner_user).post(f"{BASE}/record/", {"project": project.id})
    assert response.status_code == 400


@pytest.mark.django_db
def test_record_post_requires_owner_role(project, contractor_user):
    response = _client(contractor_user).post(
        f"{BASE}/record/", {"project": project.id, "practical_completion_date": "2026-01-01"}
    )
    assert response.status_code == 403


@pytest.fixture
def om_item(project):
    return create_om_item(project=project, category="HVAC", description_en="Chiller manual")


@pytest.mark.django_db
def test_om_verify_rejected_for_contractor(project, om_item, contractor_user):
    response = _client(contractor_user).post(f"{BASE}/om-checklist/{om_item.id}/verify/")
    assert response.status_code == 403
    om_item.refresh_from_db()
    assert om_item.installed_verified is False


@pytest.mark.django_db
def test_om_verify_allowed_for_consultant_and_owner(project, consultant_user, owner_user):
    consultant_item = create_om_item(project=project, category="HVAC", description_en="Chiller manual")
    owner_item = create_om_item(project=project, category="Fire", description_ar="", description_en="Alarm certificate")

    assert _client(consultant_user).post(f"{BASE}/om-checklist/{consultant_item.id}/verify/").status_code == 200
    assert _client(owner_user).post(f"{BASE}/om-checklist/{owner_item.id}/verify/").status_code == 200

    consultant_item.refresh_from_db()
    assert consultant_item.installed_verified is True
    assert consultant_item.verified_by == consultant_user


@pytest.mark.django_db
def test_defect_resolve_twice_second_is_400(project, owner_user, contractor_user):
    defect = report_defect(project=project, reported_by=owner_user, unit_or_zone="Unit 4B", title="Leak")
    client = _client(owner_user)

    _client(contractor_user).post(f"{BASE}/post-handover-defects/{defect.id}/acknowledge/")
    first = client.post(f"{BASE}/post-handover-defects/{defect.id}/resolve/")
    assert first.status_code == 200

    second = client.post(f"{BASE}/post-handover-defects/{defect.id}/resolve/")
    assert second.status_code == 400
    defect.refresh_from_db()
    assert defect.status == PostHandoverStatus.RESOLVED


@pytest.mark.django_db
def test_defect_resolve_rejected_for_contractor(project, owner_user, contractor_user):
    defect = report_defect(project=project, reported_by=owner_user, unit_or_zone="Unit 4B", title="Leak")
    response = _client(contractor_user).post(f"{BASE}/post-handover-defects/{defect.id}/resolve/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_defect_acknowledge_rejected_for_consultant(project, owner_user, consultant_user):
    defect = report_defect(project=project, reported_by=owner_user, unit_or_zone="Unit 4B", title="Leak")
    response = _client(consultant_user).post(f"{BASE}/post-handover-defects/{defect.id}/acknowledge/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_defect_resolve_only_logs_one_audit_event(project, owner_user, contractor_user):
    from trust_evidence.services import get_audit_events

    defect = report_defect(project=project, reported_by=owner_user, unit_or_zone="Unit 4B", title="Leak")
    client = _client(owner_user)
    client.post(f"{BASE}/post-handover-defects/{defect.id}/resolve/")
    client.post(f"{BASE}/post-handover-defects/{defect.id}/resolve/")

    events = get_audit_events(project, event_type="post_handover_defect_resolved")
    assert len(events) == 1
