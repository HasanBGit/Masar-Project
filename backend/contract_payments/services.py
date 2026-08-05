"""
Service layer for Module 12 - see skills/contract-payments/SKILL.md. Other
apps/views never touch Contract/PaymentMilestone/Invoice rows directly.

RAG note (legal-agent section at the bottom of this file): this project uses
retrieval-augmented generation to answer contract/ZATCA questions grounded in
this project's own contract data plus the static ZATCA reference doc already
checked into skills/contract-payments/references/. No live web-fetching of
external documentation happens anywhere in this module - if that's added
later (e.g. pulling ZATCA's own published spec), any outbound HTTP request
must use a neutral User-Agent and must not include a personal email address
or the project name in headers, query params, or referrers.
"""

import math
from decimal import Decimal
from pathlib import Path

import httpx
from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from pgvector.django import CosineDistance

from .exceptions import CeilingBreach, LegalAgentNotConfigured, MilestoneAlreadyReleased, PaymentNotVerified
from .models import (
    Contract,
    ContractAmendment,
    Invoice,
    LegalAgentDocument,
    PaymentMilestone,
    PaymentMilestoneStatus,
    ZatcaInvoiceStatus,
)

ZATCA_REFERENCE_DOC = Path(settings.BASE_DIR).parent / "skills" / "contract-payments" / "references" / "zatca-fatoora-compliance.md"


# --- Contract & payment schedule ---------------------------------------------


def create_contract(
    *,
    project,
    title: str,
    contract_value,
    scope_baseline: str,
    currency: str = "SAR",
    plain_arabic_summary: str = "",
    retention_percentage=0,
    ceiling_threshold_percentage=10,
) -> Contract:
    contract = Contract.objects.create(
        project=project,
        title=title,
        contract_value=contract_value,
        currency=currency,
        scope_baseline=scope_baseline,
        plain_arabic_summary=plain_arabic_summary,
        retention_percentage=retention_percentage,
        ceiling_threshold_percentage=ceiling_threshold_percentage,
    )

    import trust_evidence.services as trust_evidence

    trust_evidence.record_event(
        project=project, actor=None, event_type="contract_created",
        subject_type="contract", subject_id=contract.id, payload={"title": title, "contract_value": str(contract_value)},
    )
    return contract


def add_payment_milestone(*, contract: Contract, name: str, due_condition: str, amount, retention_held=0) -> PaymentMilestone:
    return PaymentMilestone.objects.create(
        contract=contract, project=contract.project, name=name,
        due_condition=due_condition, amount=amount, retention_held=retention_held,
    )


def get_payment_milestones(project) -> list[PaymentMilestone]:
    return list(PaymentMilestone.objects.filter(project=project))


# --- Payment gating on verified evidence -------------------------------------


@transaction.atomic
def release_payment_milestone(milestone: PaymentMilestone, released_by) -> PaymentMilestone:
    """
    The core Module 12 rule: a payment only unlocks once trust_evidence has a
    verified acknowledgment for this milestone - never on contractor
    self-assertion alone. "No teeth without Module 5" per both modules' skills.
    """
    if milestone.status == PaymentMilestoneStatus.RELEASED:
        # Idempotency guard: a double release must not re-fire the webhook,
        # re-log the audit event, or overwrite released_at/released_by.
        raise MilestoneAlreadyReleased(f"Milestone {milestone.id} has already been released.")

    import trust_evidence.services as trust_evidence

    status = trust_evidence.get_verification_status(milestone.project, milestone.evidence_subject_type, milestone.id)
    if not status["has_verified_evidence"]:
        raise PaymentNotVerified(
            f"Milestone {milestone.id} has no verified evidence acknowledgment - cannot release payment."
        )

    milestone.status = PaymentMilestoneStatus.RELEASED
    milestone.released_at = timezone.now()
    milestone.released_by = released_by
    milestone.save(update_fields=["status", "released_at", "released_by", "updated_at"])

    trust_evidence.record_event(
        project=milestone.project, actor=released_by, event_type="payment_milestone_released",
        subject_type="payment_milestone", subject_id=milestone.id, payload={"amount": str(milestone.amount)},
    )

    import platform_api.services as platform_api

    platform_api.dispatch_webhook_event(
        milestone.project, "payment.released", {"milestone_id": milestone.id, "amount": str(milestone.amount)}
    )

    generate_invoice_for_milestone(milestone)
    return milestone


# --- Contract-vs-actual tracker & ceiling alerts -----------------------------


def get_contract_vs_actual(project) -> dict:
    """
    Running comparison of contract value + *approved* change orders vs. paid
    to date - visible at all times, never reconstructed at dispute time.
    Only APPROVED change orders count toward the adjusted contract value,
    per the skill's "original contract value + approved change orders"
    wording (a pending/draft change order hasn't changed the contract yet).
    """
    contract = Contract.objects.filter(project=project).first()
    if contract is None:
        return {"has_contract": False}

    import rfi_change_control.services as rfi_change_control

    approved_change_order_total = rfi_change_control.get_approved_change_order_total(project)

    paid_to_date = PaymentMilestone.objects.filter(project=project, status=PaymentMilestoneStatus.RELEASED).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")

    adjusted_contract_value = contract.contract_value + approved_change_order_total

    return {
        "has_contract": True,
        "original_contract_value": contract.contract_value,
        "approved_change_order_total": approved_change_order_total,
        "adjusted_contract_value": adjusted_contract_value,
        "paid_to_date": paid_to_date,
        "remaining_balance": adjusted_contract_value - paid_to_date,
    }


def check_ceiling_breach(project, additional_amount=0) -> dict:
    """
    Called before approving a change order or releasing a payment - "fire
    before a breach, not after" per the skill's rules. Returns the numbers
    either way; caller decides whether to block or just warn. `additional_amount`
    is coerced through str() first so a raw query-param string, an int, or a
    Decimal all work the same way without a caller needing to know the type.
    """
    contract = Contract.objects.filter(project=project).first()
    if contract is None:
        return {"has_contract": False, "would_breach": False}

    tracker = get_contract_vs_actual(project)
    ceiling = contract.contract_value * (1 + contract.ceiling_threshold_percentage / 100)
    projected_total = tracker["paid_to_date"] + Decimal(str(additional_amount)) + tracker["approved_change_order_total"]

    return {
        "has_contract": True,
        "would_breach": projected_total > ceiling,
        "ceiling": ceiling,
        "projected_total": projected_total,
    }


def raise_if_ceiling_breach(project, additional_amount=0) -> None:
    """Convenience wrapper for callers that want a hard stop instead of reading the dict."""
    result = check_ceiling_breach(project, additional_amount)
    if result["would_breach"]:
        import trust_evidence.services as trust_evidence

        trust_evidence.record_event(
            project=project, actor=None, event_type="ceiling_alert_raised",
            payload={"projected_total": str(result["projected_total"]), "ceiling": str(result["ceiling"])},
        )
        raise CeilingBreach(
            f"Projected total {result['projected_total']} would exceed the contract ceiling {result['ceiling']}."
        )


# --- ZATCA e-invoicing (Fatoora Phase 2) -------------------------------------


def generate_invoice_for_milestone(milestone: PaymentMilestone) -> Invoice:
    """
    Creates the Invoice row at the correct trigger point (a verified,
    released milestone) but does NOT fabricate XML/signing/ZATCA
    submission - see skills/contract-payments/references/zatca-fatoora-compliance.md:
    "confirm current detail against ZATCA's published spec before
    implementing... do not hardcode from this summary alone." Status stays
    NOT_CONFIGURED until that follow-up implementation exists.
    """
    invoice, _ = Invoice.objects.get_or_create(milestone=milestone, defaults={"zatca_status": ZatcaInvoiceStatus.NOT_CONFIGURED})
    return invoice


# --- Digital contract signing & amendment log --------------------------------


def request_contract_signing(*, contract: Contract, requested_by, raci: list[dict], version_number: int, summary: str) -> ContractAmendment:
    """Routes through approvals-workflow's 3-Edges infrastructure - never a parallel signing mechanism."""
    import approvals.services as approvals

    decision = approvals.request_decision(
        project=contract.project, title=f"Sign {contract.title} v{version_number}", requested_by=requested_by,
        raci=raci, description=summary, high_stakes=True, subject_type="contract_amendment", subject_ref=str(contract.id),
    )
    return ContractAmendment.objects.create(
        contract=contract, version_number=version_number, summary=summary, decision_id=decision.id,
    )


def get_amendments(contract: Contract) -> list[ContractAmendment]:
    return list(contract.amendments.all())


# --- Legal-agent chatbot (RAG) -----------------------------------------------


def _embed(text: str) -> list[float]:
    """
    Pluggable embedding provider. Checks OPENROUTER_API_KEY first (using
    openai/text-embedding-3-small truncated & L2-normalized to 1024 dims),
    then VOYAGE_API_KEY (voyage-3). Raises LegalAgentNotConfigured if no key is set.
    """
    openrouter_key = getattr(settings, "OPENROUTER_API_KEY", "") or ""
    if openrouter_key:
        try:
            url = "https://openrouter.ai/api/v1/embeddings"
            headers = {"Authorization": f"Bearer {openrouter_key}", "Content-Type": "application/json"}
            payload = {"model": "openai/text-embedding-3-small", "input": text}
            r = httpx.post(url, headers=headers, json=payload, timeout=15.0)
            if r.status_code == 200:
                raw_emb = r.json()["data"][0]["embedding"]
                vec = raw_emb[:1024]
                if len(vec) < 1024:
                    vec = vec + [0.0] * (1024 - len(vec))
                norm = math.sqrt(sum(x * x for x in vec))
                return [x / norm for x in vec] if norm > 0 else vec
        except Exception:
            pass

    voyage_key = getattr(settings, "VOYAGE_API_KEY", "") or ""
    if voyage_key:
        import voyageai  # local import: optional dependency, only needed once a key is actually set

        client = voyageai.Client(api_key=voyage_key)
        result = client.embed([text], model="voyage-3", input_type="document")
        return result.embeddings[0]

    raise LegalAgentNotConfigured("No embedding provider configured (set OPENROUTER_API_KEY or VOYAGE_API_KEY).")


def _contract_chunks(contract: Contract) -> list[tuple[str, str]]:
    """Returns (source_ref, content) pairs built from this project's own structured contract data."""
    chunks = [
        (f"contract:{contract.id}:scope_baseline", contract.scope_baseline),
        (
            f"contract:{contract.id}:terms",
            f"Contract value: {contract.contract_value} {contract.currency}. "
            f"Retention percentage: {contract.retention_percentage}%. "
            f"Ceiling alert threshold: {contract.ceiling_threshold_percentage}% over contract value.",
        ),
    ]
    if contract.plain_arabic_summary:
        chunks.append((f"contract:{contract.id}:plain_arabic_summary", contract.plain_arabic_summary))
    for milestone in contract.payment_milestones.all():
        chunks.append((
            f"contract:{contract.id}:milestone:{milestone.id}",
            f"Payment milestone '{milestone.name}': {milestone.due_condition}. "
            f"Amount: {milestone.amount} {contract.currency}. Status: {milestone.status}.",
        ))
    if ZATCA_REFERENCE_DOC.exists():
        chunks.append(("zatca-fatoora-compliance.md", ZATCA_REFERENCE_DOC.read_text()))
    return chunks


@transaction.atomic
def ingest_contract_for_legal_agent(contract: Contract) -> int:
    """
    (Re)indexes a contract's chunks for the legal agent. Safe to call
    repeatedly (e.g. after editing the contract) - replaces this project's
    prior chunks rather than accumulating stale duplicates. Atomic so a
    mid-ingest failure never leaves the project with its old chunks deleted
    and no replacements.
    """
    LegalAgentDocument.objects.filter(project=contract.project).delete()
    rows = []
    for source_ref, content in _contract_chunks(contract):
        try:
            embedding = _embed(content)
        except LegalAgentNotConfigured:
            embedding = None
        rows.append(LegalAgentDocument(
            project=contract.project, source_ref=source_ref, content=content,
            embedding=embedding, embedding_model="openrouter/text-embedding-3-small" if embedding else "",
        ))
    LegalAgentDocument.objects.bulk_create(rows)
    return len(rows)


def _retrieve_top_chunks(project, question_embedding: list[float], k: int = 5) -> list[LegalAgentDocument]:
    """DB-side vector search via pgvector's HNSW cosine-distance index - not an in-Python scan."""
    return list(
        LegalAgentDocument.objects.filter(project=project)
        .exclude(embedding=None)
        .annotate(distance=CosineDistance("embedding", question_embedding))
        .order_by("distance")[:k]
    )


def ask_legal_agent(*, project, question: str, asked_by=None, language: str = "ar") -> dict:
    """
    Answers a contract/ZATCA question grounded only in this project's own
    indexed chunks - supports OpenRouter (Gemini Flash) as primary LLM.
    """
    if not LegalAgentDocument.objects.filter(project=project).exclude(embedding=None).exists():
        raise LegalAgentNotConfigured(
            "This project has no indexed legal-agent documents with embeddings - run ingest_contract_for_legal_agent first, "
            "and make sure OPENROUTER_API_KEY is set."
        )

    question_embedding = _embed(question)
    top_chunks = _retrieve_top_chunks(project, question_embedding)

    context_block = "\n\n".join(f"[{c.source_ref}]\n{c.content}" for c in top_chunks)
    language_name = "Arabic" if language == "ar" else "English"
    system_prompt = (
        "You are a contract and ZATCA e-invoicing assistant for a construction project. "
        "Answer only using the CONTEXT below - never invent contract terms or legal detail that "
        "isn't in it. Cite the bracketed source tag for every factual claim. If the context doesn't "
        f"contain the answer, say so plainly instead of guessing. Respond in {language_name}.\n\n"
        f"CONTEXT:\n{context_block}"
    )

    openrouter_key = getattr(settings, "OPENROUTER_API_KEY", "") or ""
    model_name = getattr(settings, "OPENROUTER_MODEL", "google/gemini-2.5-flash")
    answer = ""

    if openrouter_key:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://masar.sa",
            "X-Title": "Masar Construction Governance",
        }
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
        }
        r = httpx.post(url, headers=headers, json=payload, timeout=20.0)
        if r.status_code == 200:
            answer = r.json()["choices"][0]["message"]["content"]
        else:
            raise LegalAgentNotConfigured(f"OpenRouter API error {r.status_code}: {r.text}")
    else:
        anthropic_key = getattr(settings, "ANTHROPIC_API_KEY", "") or ""
        if not anthropic_key:
            raise LegalAgentNotConfigured("No LLM provider configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY).")

        import anthropic  # local import: optional dependency, only needed once a key is actually set

        client = anthropic.Anthropic(api_key=anthropic_key)
        message = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": question}],
        )
        answer = "".join(block.text for block in message.content if block.type == "text")

    import trust_evidence.services as trust_evidence

    trust_evidence.record_event(
        project=project, actor=asked_by, event_type="legal_agent_query",
        payload={"question": question, "sources": [c.source_ref for c in top_chunks], "language": language},
    )

    return {
        "answer": answer,
        "sources": [{"source_ref": c.source_ref, "excerpt": c.content[:300]} for c in top_chunks],
        "language": language,
    }

