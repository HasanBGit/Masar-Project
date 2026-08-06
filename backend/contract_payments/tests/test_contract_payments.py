from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from core.models import DocumentLifecycleStatus
from django.utils import timezone

from contract_payments.exceptions import CeilingBreach, LegalAgentNotConfigured, PaymentNotVerified
from contract_payments.models import LEGAL_AGENT_EMBEDDING_DIMENSIONS, PaymentMilestoneStatus, ZatcaInvoiceStatus
from contract_payments.services import (
    add_payment_milestone,
    ask_legal_agent,
    check_ceiling_breach,
    create_contract,
    generate_invoice_for_milestone,
    get_contract_vs_actual,
    ingest_contract_for_legal_agent,
    raise_if_ceiling_breach,
    release_payment_milestone,
    request_contract_signing,
)

# Must match LEGAL_AGENT_EMBEDDING_DIMENSIONS - pgvector's VectorField rejects
# a stored vector of the wrong length, so a mocked embedding still has to be
# full-size even though its actual values don't matter for these tests.
FAKE_EMBEDDING = [1.0] + [0.0] * (LEGAL_AGENT_EMBEDDING_DIMENSIONS - 1)


@pytest.fixture
def contract(project):
    return create_contract(
        project=project, title="Villa build contract", contract_value=Decimal("1000000"),
        scope_baseline="Single villa, 4 bedrooms, 350 sqm.", ceiling_threshold_percentage=Decimal("10"),
    )


@pytest.fixture
def milestone(contract):
    return add_payment_milestone(contract=contract, name="Structural completion", due_condition="40% structural complete", amount=Decimal("300000"))


@pytest.mark.django_db
def test_create_contract_records_audit_event(project):
    contract = create_contract(
        project=project, title="Test", contract_value=Decimal("500000"), scope_baseline="Baseline scope."
    )
    assert contract.status == DocumentLifecycleStatus.DRAFT

    import trust_evidence.services as trust_evidence

    events = trust_evidence.get_audit_events(project, event_type="contract_created")
    assert len(events) == 1


@pytest.mark.django_db
def test_release_payment_milestone_rejects_unverified_evidence(milestone, owner_user):
    with pytest.raises(PaymentNotVerified):
        release_payment_milestone(milestone, owner_user)
    milestone.refresh_from_db()
    assert milestone.status == PaymentMilestoneStatus.PENDING


@pytest.mark.django_db
def test_release_payment_milestone_succeeds_with_verified_evidence_and_generates_invoice(milestone, owner_user, project_manager_user):
    import trust_evidence.services as trust_evidence

    record = trust_evidence.submit_evidence(
        project=milestone.project, subject_type="payment_milestone", subject_id=milestone.id,
        submitted_by=project_manager_user, caption="Slab poured", captured_at=timezone.now(),
    )
    trust_evidence.verify_evidence(record, owner_user)

    released = release_payment_milestone(milestone, owner_user)
    assert released.status == PaymentMilestoneStatus.RELEASED
    assert released.released_by == owner_user

    invoice = released.invoice
    assert invoice.zatca_status == ZatcaInvoiceStatus.NOT_CONFIGURED  # deliberately not fabricated - see skill doc


@pytest.mark.django_db
def test_generate_invoice_for_milestone_is_idempotent(milestone):
    first = generate_invoice_for_milestone(milestone)
    second = generate_invoice_for_milestone(milestone)
    assert first.id == second.id


@pytest.mark.django_db
def test_contract_vs_actual_counts_only_approved_change_orders(project, contract, project_manager_user):
    import rfi_change_control.services as rfi_change_control

    approved_co = rfi_change_control.create_change_order(
        project=project, raised_by=project_manager_user, title="Extra bathroom", baseline_scope="4 bed",
        scope_delta="+1 bathroom", cost_impact=Decimal("50000"), schedule_impact_days=5,
    )
    approved_co.status = DocumentLifecycleStatus.APPROVED
    approved_co.save(update_fields=["status"])

    rfi_change_control.create_change_order(
        project=project, raised_by=project_manager_user, title="Draft-only change", baseline_scope="4 bed",
        scope_delta="+pool", cost_impact=Decimal("200000"), schedule_impact_days=10,
    )  # left in DRAFT - must not count

    tracker = get_contract_vs_actual(project)
    assert tracker["has_contract"] is True
    assert tracker["approved_change_order_total"] == Decimal("50000")
    assert tracker["adjusted_contract_value"] == Decimal("1050000")
    assert tracker["paid_to_date"] == Decimal("0")
    assert tracker["remaining_balance"] == Decimal("1050000")


@pytest.mark.django_db
def test_ceiling_check_fires_before_breach_not_after(project, contract):
    # Ceiling = 1,000,000 * 1.10 = 1,100,000. With zero paid-to-date and no
    # change orders yet, a pending 1,200,000 addition alone pushes projected
    # total past the ceiling - caught *before* the payment/CO actually happens.
    result = check_ceiling_breach(project, additional_amount=Decimal("1200000"))
    assert result["would_breach"] is True
    assert result["ceiling"] == Decimal("1100000.00")

    with pytest.raises(CeilingBreach):
        raise_if_ceiling_breach(project, additional_amount=Decimal("1200000"))

    safe = check_ceiling_breach(project, additional_amount=Decimal("50000"))
    assert safe["would_breach"] is False


@pytest.mark.django_db
def test_ceiling_check_accepts_string_amount_from_query_params(project, contract):
    result = check_ceiling_breach(project, additional_amount="1200000")
    assert result["would_breach"] is True


@pytest.mark.django_db
def test_request_contract_signing_routes_through_approvals(contract, owner_user):
    amendment = request_contract_signing(
        contract=contract, requested_by=owner_user, raci=[{"user": owner_user, "raci_role": "A"}],
        version_number=2, summary="Add pool to scope.",
    )
    assert amendment.version_number == 2
    assert amendment.decision_id is not None

    import approvals.models as approvals_models

    decision = approvals_models.Decision.objects.get(id=amendment.decision_id)
    assert decision.high_stakes is True


# --- Legal-agent (RAG) --------------------------------------------------------


@pytest.mark.django_db
def test_ask_legal_agent_fails_closed_with_no_embedding_key(settings, contract):
    settings.OPENROUTER_API_KEY = ""
    settings.VOYAGE_API_KEY = ""
    with pytest.raises(LegalAgentNotConfigured):
        ask_legal_agent(project=contract.project, question="What is the retention percentage?")


@pytest.mark.django_db
def test_ingest_falls_back_to_unembedded_rows_without_a_key(settings, contract, milestone):
    settings.OPENROUTER_API_KEY = ""
    settings.VOYAGE_API_KEY = ""
    count = ingest_contract_for_legal_agent(contract)
    assert count > 0

    from contract_payments.models import LegalAgentDocument

    docs = LegalAgentDocument.objects.filter(project=contract.project)
    assert docs.exists()
    assert all(d.embedding is None for d in docs)


@pytest.mark.django_db
@patch("contract_payments.services._embed", return_value=FAKE_EMBEDDING)
def test_ingest_and_ask_legal_agent_with_mocked_providers(mock_embed, settings, contract, milestone, owner_user):
    settings.OPENROUTER_API_KEY = ""
    settings.VOYAGE_API_KEY = "test-voyage-key"
    settings.ANTHROPIC_API_KEY = "test-anthropic-key"

    ingest_contract_for_legal_agent(contract)

    from contract_payments.models import LegalAgentDocument

    assert LegalAgentDocument.objects.filter(project=contract.project).exclude(embedding=None).exists()

    mock_text_block = MagicMock(type="text", text="The retention percentage is 0%. [contract:1:terms]")
    mock_message = MagicMock(content=[mock_text_block])
    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("anthropic.Anthropic", return_value=mock_client):
        result = ask_legal_agent(project=contract.project, question="What is the retention percentage?", asked_by=owner_user, language="en")

    assert "retention" in result["answer"].lower()
    assert len(result["sources"]) > 0
    assert result["language"] == "en"

    import trust_evidence.services as trust_evidence

    events = trust_evidence.get_audit_events(contract.project, event_type="legal_agent_query")
    assert len(events) == 1


@pytest.mark.django_db
@patch("contract_payments.services._embed", return_value=FAKE_EMBEDDING)
def test_ask_legal_agent_openrouter_gemini_flash(mock_embed, settings, contract, milestone, owner_user):
    settings.OPENROUTER_API_KEY = "sk-or-v1-testkey"
    settings.OPENROUTER_MODEL = "google/gemini-2.5-flash"

    ingest_contract_for_legal_agent(contract)

    mock_response = MagicMock(status_code=200)
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "According to [contract:1:terms], retention percentage is 0%."}}]
    }

    with patch("httpx.post", return_value=mock_response):
        result = ask_legal_agent(project=contract.project, question="What is the retention percentage?", asked_by=owner_user, language="en")

    assert "retention" in result["answer"].lower()
    assert len(result["sources"]) > 0
    assert result["language"] == "en"

