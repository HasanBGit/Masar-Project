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
