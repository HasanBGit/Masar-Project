"""HTTP-level trust_evidence tests: subject scoping of the verification gate,
serializer validation, and dispute-export access control."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Project
from trust_evidence.services import get_verification_status, submit_evidence, verify_evidence

BASE = "/api/v1/trust-evidence"


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_evidence_on_decision_does_not_satisfy_payment_milestone_gate(project, owner_user, project_manager_user):
    """Regression: subject lookups must be scoped by (project, subject_type) -
    verified evidence on Decision #N must never satisfy the payment gate for
    PaymentMilestone #N just because the numeric ids collide."""
    from contract_payments.exceptions import PaymentNotVerified
    from contract_payments.services import add_payment_milestone, create_contract, release_payment_milestone

    contract = create_contract(
        project=project, title="Villa", contract_value=Decimal("1000000"), scope_baseline="Villa."
    )
    milestone = add_payment_milestone(
        contract=contract, name="Structural", due_condition="40%", amount=Decimal("100000")
    )

    record = submit_evidence(
        project=project, subject_type="decision", subject_id=milestone.id,
        submitted_by=project_manager_user, caption="Wrong subject type", captured_at=timezone.now(),
    )
    verify_evidence(record, owner_user)

    with pytest.raises(PaymentNotVerified):
        release_payment_milestone(milestone, owner_user)


@pytest.mark.django_db
def test_verification_is_project_scoped(project, owner_user, project_manager_user):
    """Verified evidence in project A must not satisfy the same subject_type/subject_id in project B."""
    other = Project.objects.create(name="Other Tower", slug="other-tower")

    record = submit_evidence(
        project=project, subject_type="payment_milestone", subject_id=7,
        submitted_by=project_manager_user, caption="Project A evidence", captured_at=timezone.now(),
    )
    verify_evidence(record, owner_user)

    assert get_verification_status(project, "payment_milestone", 7)["has_verified_evidence"] is True
    assert get_verification_status(other, "payment_milestone", 7)["has_verified_evidence"] is False


@pytest.mark.django_db
@pytest.mark.parametrize(
    "field,value",
    [("latitude", "95.0"), ("latitude", "-95.0"), ("longitude", "181.0"), ("longitude", "-181.0")],
)
def test_evidence_rejects_out_of_range_coordinates(project, project_manager_user, field, value):
    payload = {
        "project": project.id,
        "subject_type": "milestone",
        "subject_id": "1",
        "caption": "Slab poured",
        "captured_at": timezone.now().isoformat(),
        field: value,
    }
    response = _client(project_manager_user).post(f"{BASE}/evidence/", payload)
    assert response.status_code == 400
    assert field in response.data


@pytest.mark.django_db
def test_evidence_rejects_future_captured_at(project, project_manager_user):
    payload = {
        "project": project.id,
        "subject_type": "milestone",
        "subject_id": "1",
        "caption": "Slab poured",
        "captured_at": (timezone.now() + timedelta(days=2)).isoformat(),
    }
    response = _client(project_manager_user).post(f"{BASE}/evidence/", payload)
    assert response.status_code == 400
    assert "captured_at" in response.data


@pytest.mark.django_db
def test_dispute_export_restricted_to_owner_admin(project, owner_user, consultant_user, project_manager_user):
    assert _client(project_manager_user).get(f"{BASE}/dispute-export/", {"project": project.id}).status_code == 403
    assert _client(consultant_user).get(f"{BASE}/dispute-export/", {"project": project.id}).status_code == 403
    assert _client(owner_user).get(f"{BASE}/dispute-export/", {"project": project.id}).status_code == 200


@pytest.mark.django_db
def test_evidence_create_with_unknown_project_is_client_error_not_500(project_manager_user):
    payload = {
        "project": 999999,
        "subject_type": "milestone",
        "subject_id": "1",
        "caption": "Slab poured",
        "captured_at": timezone.now().isoformat(),
    }
    response = _client(project_manager_user).post(f"{BASE}/evidence/", payload)
    # Serializer validation catches it first (400); the perform_create
    # DoesNotExist guard maps any straggler to 404 - never a 500.
    assert response.status_code in (400, 404)
