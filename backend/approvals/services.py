"""
Service layer for the 3 Edges (Hearing -> Understanding -> Agreeing).
Other apps (dashboard, and eventually rfi-change-control / contract-payments)
call these functions - never touch Decision/DecisionParticipant rows
directly. See skills/approvals-workflow/SKILL.md for the rules encoded here.
"""

from datetime import timedelta

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

import trust_evidence.services as trust_evidence

from .exceptions import InvalidTransition, NotAuthorized
from .models import Decision, DecisionParticipant, DecisionStatus, EscalationRule, RaciRole

GENERIC_UNDERSTANDING_PHRASES = {"i agree", "ok", "okay", "agreed", "yes", "approved", "sounds good"}
MIN_UNDERSTANDING_LENGTH = 12


def _get_rule(project) -> EscalationRule:
    rule, _ = EscalationRule.objects.get_or_create(project=project)
    return rule


def _accountable(decision: Decision) -> DecisionParticipant | None:
    return decision.participants.filter(raci_role=RaciRole.ACCOUNTABLE).first()


@transaction.atomic
def request_decision(
    *,
    project,
    title: str,
    requested_by,
    raci: list[dict],
    description: str = "",
    high_stakes: bool = False,
    subject_type: str = "general",
    subject_ref: str = "",
) -> Decision:
    """Attach a new decision workflow. `raci` is a list of {"user": User, "raci_role": "R"|"A"|"C"|"I"}."""
    accountable_count = sum(1 for row in raci if row["raci_role"] == RaciRole.ACCOUNTABLE)
    if accountable_count != 1:
        raise ValueError(f"Exactly one Accountable participant is required, got {accountable_count}.")

    rule = _get_rule(project)
    sla_hours = rule.sla_hours_for(high_stakes)

    decision = Decision.objects.create(
        project=project,
        title=title,
        description=description,
        subject_type=subject_type,
        subject_ref=subject_ref,
        high_stakes=high_stakes,
        status=DecisionStatus.HEARING,
        owner=requested_by,
        sla_deadline=timezone.now() + timedelta(hours=sla_hours),
    )
    DecisionParticipant.objects.bulk_create(
        [DecisionParticipant(decision=decision, user=row["user"], raci_role=row["raci_role"]) for row in raci]
    )

    trust_evidence.record_event(
        project=project,
        actor=requested_by,
        event_type="decision_requested",
        subject_type="decision",
        subject_id=decision.id,
        payload={"title": title, "high_stakes": high_stakes, "sla_hours": sla_hours},
    )

    import platform_api.services as platform_api

    platform_api.dispatch_webhook_event(project, "approval.requested", {"decision_id": decision.id, "title": title, "high_stakes": high_stakes})
    return decision


def _require_participant(decision: Decision, user) -> DecisionParticipant:
    participant = decision.participants.filter(user=user).first()
    if participant is None:
        raise NotAuthorized("You are not a participant on this decision.")
    return participant


@transaction.atomic
def confirm_hearing(decision: Decision, user) -> Decision:
    _require_participant(decision, user)
    if decision.status != DecisionStatus.HEARING:
        raise InvalidTransition(f"Cannot confirm hearing from status '{decision.status}'.")

    decision.hearing_confirmed_at = timezone.now()
    # High-stakes items go through the full teach-back gate; low-risk items
    # collapse Hearing+Agreeing into one step per skills/approvals-workflow.
    decision.status = DecisionStatus.UNDERSTANDING if decision.high_stakes else DecisionStatus.AGREEING
    decision.save(update_fields=["hearing_confirmed_at", "status", "updated_at"])

    trust_evidence.record_event(
        project=decision.project,
        actor=user,
        event_type="decision_hearing_confirmed",
        subject_type="decision",
        subject_id=decision.id,
    )
    return decision


@transaction.atomic
def record_understanding(decision: Decision, user, paraphrase: str) -> Decision:
    participant = _require_participant(decision, user)
    if decision.status != DecisionStatus.UNDERSTANDING:
        raise InvalidTransition(f"Cannot record understanding from status '{decision.status}'.")
    if participant.raci_role != RaciRole.ACCOUNTABLE:
        raise NotAuthorized("Only the Accountable participant's understanding satisfies this gate.")

    normalized = paraphrase.strip()
    if len(normalized) < MIN_UNDERSTANDING_LENGTH or normalized.lower() in GENERIC_UNDERSTANDING_PHRASES:
        raise ValueError("Understanding must restate the decision content, not a generic acknowledgement.")

    decision.understanding_text = normalized
    decision.understanding_confirmed_at = timezone.now()
    decision.understanding_confirmed_by = user
    decision.status = DecisionStatus.AGREEING
    decision.save(
        update_fields=[
            "understanding_text",
            "understanding_confirmed_at",
            "understanding_confirmed_by",
            "status",
            "updated_at",
        ]
    )

    trust_evidence.record_event(
        project=decision.project,
        actor=user,
        event_type="decision_understanding_recorded",
        subject_type="decision",
        subject_id=decision.id,
        payload={"paraphrase": normalized},
    )
    return decision


@transaction.atomic
def record_agreement(decision: Decision, user) -> Decision:
    participant = _require_participant(decision, user)
    if decision.status != DecisionStatus.AGREEING:
        raise InvalidTransition(f"Cannot record agreement from status '{decision.status}'.")
    if participant.raci_role != RaciRole.ACCOUNTABLE:
        raise NotAuthorized("Only the Accountable participant can close this decision.")

    decision.agreement_confirmed_at = timezone.now()
    decision.agreement_confirmed_by = user
    decision.status = DecisionStatus.CLOSED
    decision.save(update_fields=["agreement_confirmed_at", "agreement_confirmed_by", "status", "updated_at"])

    trust_evidence.record_event(
        project=decision.project,
        actor=user,
        event_type="decision_agreement_recorded",
        subject_type="decision",
        subject_id=decision.id,
    )
    return decision


@transaction.atomic
def escalate_if_breached(decision: Decision) -> Decision:
    """Idempotent: safe to call repeatedly (lazily on read, or from a cron/management command)."""
    if decision.status in (DecisionStatus.CLOSED, DecisionStatus.ESCALATED):
        return decision
    if not decision.sla_deadline or timezone.now() <= decision.sla_deadline:
        return decision

    rule = _get_rule(decision.project)
    accountable_participant = _accountable(decision)
    fallback_qs = decision.project.memberships.filter(role=rule.fallback_role)
    if accountable_participant:
        fallback_qs = fallback_qs.exclude(user=accountable_participant.user)
    fallback_membership = fallback_qs.first()

    decision.status = DecisionStatus.ESCALATED
    decision.escalated_at = timezone.now()
    if fallback_membership:
        decision.fallback_approver = fallback_membership.user
    decision.save(update_fields=["status", "escalated_at", "fallback_approver", "updated_at"])

    trust_evidence.record_event(
        project=decision.project,
        actor=None,
        event_type="decision_escalated",
        channel="system",
        subject_type="decision",
        subject_id=decision.id,
        payload={"fallback_role": rule.fallback_role},
    )
    return decision


def escalate_overdue_decisions(project=None) -> int:
    """Bulk sweep for a cron/management command. Returns count escalated."""
    qs = Decision.objects.exclude(status__in=[DecisionStatus.CLOSED, DecisionStatus.ESCALATED])
    if project is not None:
        qs = qs.filter(project=project)
    count = 0
    for decision in qs.filter(sla_deadline__lt=timezone.now()):
        escalate_if_breached(decision)
        count += 1
    return count


# --- Read helpers (consumed by dashboard.services - never import Decision
# directly from another app, per the modular-monolith app-boundary rule) ---


def get_visible_decisions(project, user) -> QuerySet[Decision]:
    return (
        Decision.objects.filter(project=project, participants__user=user)
        .prefetch_related("participants__user")
        .distinct()
    )


def get_all_project_decisions(project) -> QuerySet[Decision]:
    return Decision.objects.filter(project=project).prefetch_related("participants__user")


def get_all_decisions() -> list[Decision]:
    """
    Unscoped, cross-project read - for Truepoint-internal aggregation only
    (observability's SLA-compliance view), never for a per-project owner
    view. Callers must gate this behind staff-level access, not project
    RBAC - an owner shouldn't see another owner's project data this way.
    """
    return list(Decision.objects.all())


def get_decision_for_subject(subject_type: str, subject_id) -> Decision | None:
    """Lets other modules (e.g. handover's punch-list sign-off) check decision state without owning it."""
    return (
        Decision.objects.filter(subject_type=subject_type, subject_ref=str(subject_id))
        .order_by("-created_at")
        .first()
    )


def get_digest_items(project, user, limit: int = 3) -> list[Decision]:
    qs = get_visible_decisions(project, user).exclude(status=DecisionStatus.CLOSED).order_by("sla_deadline")
    return list(qs[:limit])


def get_project_decision_stats(project) -> dict:
    qs = Decision.objects.filter(project=project)
    return {
        "total": qs.count(),
        "pending": qs.exclude(status__in=[DecisionStatus.CLOSED]).count(),
        "overdue": sum(1 for d in qs.exclude(status__in=[DecisionStatus.CLOSED, DecisionStatus.ESCALATED]) if d.is_overdue),
        "high_stakes_pending": qs.filter(high_stakes=True).exclude(status=DecisionStatus.CLOSED).count(),
        "closed": qs.filter(status=DecisionStatus.CLOSED).count(),
    }


def get_sla_compliance_summary() -> dict:
    """Cross-project aggregation for observability's SLA-compliance signal - lives here since
    only approvals owns Decision/DecisionStatus, per the modular-monolith app-boundary rule."""
    decisions = get_all_decisions()
    total = len(decisions)
    escalated = sum(1 for d in decisions if d.status == DecisionStatus.ESCALATED)
    closed = [d for d in decisions if d.status == DecisionStatus.CLOSED and d.agreement_confirmed_at]
    breached_open = sum(1 for d in decisions if d.status not in (DecisionStatus.CLOSED, DecisionStatus.ESCALATED) and d.is_overdue)

    avg_hours_to_close = None
    if closed:
        total_seconds = sum((d.agreement_confirmed_at - d.created_at).total_seconds() for d in closed)
        avg_hours_to_close = round((total_seconds / len(closed)) / 3600, 1)

    return {
        "total_decisions": total,
        "escalated_count": escalated,
        "escalation_rate": round(escalated / total, 3) if total else 0.0,
        "currently_breached_unescalated": breached_open,  # would indicate the sweep isn't firing correctly
        "closed_count": len(closed),
        "avg_hours_to_close": avg_hours_to_close,
    }
