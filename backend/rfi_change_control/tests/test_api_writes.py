"""
HTTP-level regression tests for every write endpoint in this app - each of
these previously 500'd (TypeError/IntegrityError/KeyError) or silently
created rows with a blank status.
"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import DocumentLifecycleStatus, Project
from rfi_change_control.models import (
    ChangeOrder,
    CoordinationThread,
    Permit,
    QualityCheckpoint,
    RFI,
    Submittal,
    SupplierDelivery,
)

BASE = "/api/v1/rfi-change-control"


@pytest.fixture
def client(project_manager_user):
    client = APIClient()
    client.force_authenticate(project_manager_user)
    return client


@pytest.fixture
def outsider_client(db, django_user_model):
    outsider = django_user_model.objects.create(email="outsider@other.local", username="outsider@other.local")
    client = APIClient()
    client.force_authenticate(outsider)
    return client


@pytest.mark.django_db
def test_create_rfi_with_sla_deadline(project, client):
    respond_by = (timezone.now() + timedelta(days=2)).isoformat()
    response = client.post(
        f"{BASE}/rfis/",
        {"project": project.id, "title": "Anchor spec", "question": "Which anchor?", "sla_deadline": respond_by},
    )
    assert response.status_code == 201
    rfi = RFI.objects.get(id=response.data["id"])
    assert rfi.number == "RFI-001"
    assert rfi.sla_deadline is not None
    assert rfi.status == DocumentLifecycleStatus.UNDER_REVIEW


@pytest.mark.django_db
def test_create_rfi_without_sla_deadline_does_not_500(project, client):
    response = client.post(
        f"{BASE}/rfis/",
        {"project": project.id, "title": "No deadline", "question": "When?"},
    )
    assert response.status_code == 201
    rfi = RFI.objects.get(id=response.data["id"])
    assert rfi.sla_deadline is None


@pytest.mark.django_db
def test_rfi_numbers_do_not_collide_after_deletion(project, client):
    first = client.post(f"{BASE}/rfis/", {"project": project.id, "title": "A", "question": "?"})
    second = client.post(f"{BASE}/rfis/", {"project": project.id, "title": "B", "question": "?"})
    assert second.data["number"] == "RFI-002"

    RFI.objects.get(id=first.data["id"]).delete()
    third = client.post(f"{BASE}/rfis/", {"project": project.id, "title": "C", "question": "?"})
    assert third.status_code == 201
    assert third.data["number"] == "RFI-003"  # max+1, not COUNT+1 (which would collide on RFI-002)


@pytest.mark.django_db
def test_respond_to_rfi_via_api(project, client, consultant_user):
    created = client.post(f"{BASE}/rfis/", {"project": project.id, "title": "Anchor spec", "question": "Which anchor?"})
    consultant = APIClient()
    consultant.force_authenticate(consultant_user)
    response = consultant.post(f"{BASE}/rfis/{created.data['id']}/respond/", {"response": "Use the M12 anchor."})
    assert response.status_code == 200
    assert RFI.objects.get(id=created.data["id"]).status == DocumentLifecycleStatus.APPROVED


@pytest.mark.django_db
def test_create_change_order_via_api(project, client):
    response = client.post(
        f"{BASE}/change-orders/",
        {
            "project": project.id,
            "title": "MEP reroute",
            "baseline_scope": "Original MEP shaft routing per drawing M-401",
            "scope_delta": "Reroute shaft 1.2m east to clear the level 12 transfer beam",
            "cost_impact": "42000.00",
            "schedule_impact_days": 9,
        },
    )
    assert response.status_code == 201
    co = ChangeOrder.objects.get(id=response.data["id"])
    assert co.project == project
    assert co.status == DocumentLifecycleStatus.DRAFT


@pytest.mark.django_db
def test_create_submittal_via_api(project, client, project_manager_user):
    response = client.post(
        f"{BASE}/submittals/",
        {"project": project.id, "title": "Lobby marble sample", "spec_section": "09 30 00"},
    )
    assert response.status_code == 201
    submittal = Submittal.objects.get(id=response.data["id"])
    assert submittal.current_as_of is not None
    assert submittal.submitted_by == project_manager_user
    assert submittal.status == DocumentLifecycleStatus.UNDER_REVIEW


@pytest.mark.django_db
def test_create_permit_via_api(project, client):
    response = client.post(
        f"{BASE}/permits/",
        {"project": project.id, "title": "Excavation extension", "permit_number": "RY-2026-1"},
    )
    assert response.status_code == 201
    permit = Permit.objects.get(id=response.data["id"])
    assert permit.current_as_of is not None
    assert permit.status == DocumentLifecycleStatus.UNDER_REVIEW


@pytest.mark.django_db
def test_create_supplier_delivery_via_api(project, client):
    response = client.post(
        f"{BASE}/supplier-deliveries/",
        {"project": project.id, "material": "Glazing units", "supplier_name": "Gulf Glass", "committed_date": "2026-09-01"},
    )
    assert response.status_code == 201
    delivery = SupplierDelivery.objects.get(id=response.data["id"])
    assert delivery.status == DocumentLifecycleStatus.DRAFT  # not ""


@pytest.mark.django_db
def test_create_quality_checkpoint_without_inspector_defaults_to_requester(project, client, project_manager_user):
    response = client.post(
        f"{BASE}/quality-checkpoints/",
        {"project": project.id, "title": "Rebar inspection - Level 16"},
    )
    assert response.status_code == 201
    checkpoint = QualityCheckpoint.objects.get(id=response.data["id"])
    assert checkpoint.inspector == project_manager_user
    assert checkpoint.status == DocumentLifecycleStatus.UNDER_REVIEW


@pytest.mark.django_db
def test_create_thread_and_post_message_via_api(project, client):
    thread_response = client.post(
        f"{BASE}/coordination-threads/",
        {"project": project.id, "location_tag": "Level 9", "title": "Ductwork clash"},
    )
    assert thread_response.status_code == 201
    thread = CoordinationThread.objects.get(id=thread_response.data["id"])

    message_response = client.post(f"{BASE}/coordination-threads/{thread.id}/messages/", {"body": "Shift 200mm north."})
    assert message_response.status_code == 201
    assert thread.messages.count() == 1


@pytest.mark.django_db
def test_cross_project_user_cannot_list_or_create(project, outsider_client):
    assert outsider_client.get(f"{BASE}/rfis/", {"project": project.id}).status_code == 404
    response = outsider_client.post(f"{BASE}/rfis/", {"project": project.id, "title": "X", "question": "?"})
    assert response.status_code == 404
    assert not RFI.objects.filter(project=project).exists()


@pytest.mark.django_db
def test_cross_project_user_cannot_read_detail(project, client, outsider_client):
    created = client.post(f"{BASE}/rfis/", {"project": project.id, "title": "A", "question": "?"})
    assert outsider_client.get(f"{BASE}/rfis/{created.data['id']}/").status_code == 404


@pytest.mark.django_db
def test_member_of_other_project_cannot_use_own_membership_elsewhere(project, client, django_user_model):
    other_project = Project.objects.create(name="Other", slug="other")
    from accounts.models import ProjectMembership, Role

    other_user = django_user_model.objects.create(email="other@test.local", username="other@test.local")
    ProjectMembership.objects.create(user=other_user, project=other_project, role=Role.OWNER)

    other_client = APIClient()
    other_client.force_authenticate(other_user)
    response = other_client.post(f"{BASE}/rfis/", {"project": project.id, "title": "X", "question": "?"})
    assert response.status_code == 404
