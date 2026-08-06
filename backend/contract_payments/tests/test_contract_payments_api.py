"""
HTTP-level tests, distinct from test_contract_payments.py's service-layer
tests. These exercise views/serializers/URLs directly - the exact surface
the frontend calls - which is how the ContractAmendment perform_create bug
(never called serializer.save() or set serializer.instance, so the create
response would have blown up serializing a bare validated_data dict) got
caught before the frontend shipped against it.
"""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from contract_payments.models import Contract, PaymentMilestone


@pytest.fixture
def contract(project):
    return Contract.objects.create(
        project=project, title="Villa build contract", contract_value=Decimal("1000000"),
        scope_baseline="Single villa, 4 bedrooms, 350 sqm.",
    )


@pytest.mark.django_db
def test_create_contract_via_api(project, owner_user):
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post(
        "/api/v1/contract-payments/contracts/",
        {"project": project.id, "title": "New contract", "contract_value": "500000", "scope_baseline": "Baseline."},
    )
    assert response.status_code == 201
    assert response.data["title"] == "New contract"


@pytest.mark.django_db
def test_create_contract_via_api_rejects_non_financial_role(project, consultant_user):
    client = APIClient()
    client.force_authenticate(consultant_user)
    response = client.post(
        "/api/v1/contract-payments/contracts/",
        {"project": project.id, "title": "New contract", "contract_value": "500000", "scope_baseline": "Baseline."},
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_contract_vs_actual_endpoint(contract, owner_user):
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.get(f"/api/v1/contract-payments/contracts/{contract.id}/contract_vs_actual/")
    assert response.status_code == 200
    assert response.data["has_contract"] is True
    assert Decimal(response.data["original_contract_value"]) == Decimal("1000000")


@pytest.mark.django_db
def test_release_milestone_via_api_returns_409_when_unverified(contract, owner_user):
    milestone = PaymentMilestone.objects.create(
        contract=contract, project=contract.project, name="Structural", due_condition="40% complete", amount=Decimal("100000"),
    )
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post(f"/api/v1/contract-payments/payment-milestones/{milestone.id}/release/")
    assert response.status_code == 409


@pytest.mark.django_db
def test_request_amendment_via_api_returns_real_created_object(contract, owner_user):
    """Regression test for the perform_create bug: the response must be the actual saved row, not a broken partial serialization."""
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post(
        "/api/v1/contract-payments/amendments/",
        {"contract": contract.id, "version_number": 2, "summary": "Add a pool to scope."},
    )
    assert response.status_code == 201
    assert response.data["id"] is not None
    assert response.data["version_number"] == 2
    assert response.data["decision_id"] is not None

    from contract_payments.models import ContractAmendment

    assert ContractAmendment.objects.filter(id=response.data["id"]).exists()


@pytest.mark.django_db
def test_legal_agent_ask_endpoint_returns_503_when_not_configured(contract, owner_user):
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post(
        f"/api/v1/contract-payments/contracts/{contract.id}/legal-agent/ask/",
        {"question": "What is the retention percentage?"},
    )
    assert response.status_code == 503


# --- P1 regressions: idempotent release, duplicate-guarded creates, RBAC ---


@pytest.mark.django_db
def test_double_release_is_400_with_single_webhook_and_audit_event(contract, owner_user, project_manager_user):
    from unittest.mock import Mock, patch

    from django.utils import timezone

    import trust_evidence.services as trust_evidence
    from platform_api.models import WebhookDelivery
    from platform_api.services import create_webhook_subscription

    create_webhook_subscription(
        project=contract.project, target_url="https://example.com/hook",
        event_types=["payment.released"], created_by=owner_user,
    )
    milestone = PaymentMilestone.objects.create(
        contract=contract, project=contract.project, name="Structural", due_condition="40%", amount=Decimal("100000"),
    )
    record = trust_evidence.submit_evidence(
        project=contract.project, subject_type="payment_milestone", subject_id=milestone.id,
        submitted_by=project_manager_user, caption="Slab poured", captured_at=timezone.now(),
    )
    trust_evidence.verify_evidence(record, owner_user)

    client = APIClient()
    client.force_authenticate(owner_user)
    with patch("platform_api.services.requests.post", return_value=Mock(status_code=200)):
        first = client.post(f"/api/v1/contract-payments/payment-milestones/{milestone.id}/release/")
        second = client.post(f"/api/v1/contract-payments/payment-milestones/{milestone.id}/release/")

    assert first.status_code == 200
    assert second.status_code == 400
    assert WebhookDelivery.objects.filter(event_type="payment.released").count() == 1
    audit = trust_evidence.get_audit_events(contract.project, event_type="payment_milestone_released")
    assert len(audit) == 1


@pytest.mark.django_db
def test_duplicate_amendment_version_returns_400(contract, owner_user):
    client = APIClient()
    client.force_authenticate(owner_user)
    payload = {"contract": contract.id, "version_number": 2, "summary": "Add a pool to scope."}
    assert client.post("/api/v1/contract-payments/amendments/", payload).status_code == 201

    response = client.post("/api/v1/contract-payments/amendments/", payload)
    assert response.status_code == 400

    from contract_payments.models import ContractAmendment

    assert ContractAmendment.objects.filter(contract=contract, version_number=2).count() == 1


@pytest.mark.django_db
def test_second_contract_for_project_returns_400(contract, project, owner_user):
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post(
        "/api/v1/contract-payments/contracts/",
        {"project": project.id, "title": "Second contract", "contract_value": "500", "scope_baseline": "Dup."},
    )
    assert response.status_code == 400
    assert Contract.objects.filter(project=project).count() == 1


@pytest.mark.django_db
def test_project_manager_blocked_from_contract_vs_actual_and_ceiling(contract, project_manager_user):
    client = APIClient()
    client.force_authenticate(project_manager_user)
    assert client.get(f"/api/v1/contract-payments/contracts/{contract.id}/contract_vs_actual/").status_code == 403
    assert client.get(f"/api/v1/contract-payments/contracts/{contract.id}/ceiling_check/").status_code == 403
    assert client.get(f"/api/v1/contract-payments/ceiling-check/?project={contract.project_id}").status_code == 403


@pytest.mark.django_db
def test_contract_rejects_nonpositive_value_and_bad_retention(project, owner_user):
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post(
        "/api/v1/contract-payments/contracts/",
        {"project": project.id, "title": "Bad", "contract_value": "0", "scope_baseline": "x"},
    )
    assert response.status_code == 400
    assert "contract_value" in response.data

    response = client.post(
        "/api/v1/contract-payments/contracts/",
        {"project": project.id, "title": "Bad", "contract_value": "100", "scope_baseline": "x", "retention_percentage": "150"},
    )
    assert response.status_code == 400
    assert "retention_percentage" in response.data


@pytest.mark.django_db
def test_milestone_project_must_match_contract_project(contract, owner_user):
    from core.models import Project

    other = Project.objects.create(name="Other", slug="other-cp")
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post(
        "/api/v1/contract-payments/payment-milestones/",
        {"contract": contract.id, "project": other.id, "name": "M1", "due_condition": "40%", "amount": "1000"},
    )
    assert response.status_code == 400
