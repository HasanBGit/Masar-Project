"""
Service layer for Module 5 - see skills/trust-evidence/SKILL.md and
references/audit-log-schema.md. Every write to AuditEvent goes through
`record_event`; nothing else creates a row directly.
"""

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from .models import ActorRole, AuditEvent, Channel, EvidenceRecord, SilenceFlag


def _resolve_actor_role(project, actor) -> str:
    if actor is None:
        return ActorRole.SYSTEM
    import accounts.services as accounts  # local import: avoids a hard import-time dependency

    role = accounts.get_role(actor, project)
    return role or ""


def record_event(
    *,
    project,
    actor=None,
    event_type: str,
    channel: str = Channel.PLATFORM_UI,
    subject_type: str = "",
    subject_id: str = "",
    payload: dict | None = None,
    source_message_ref: str = "",
) -> AuditEvent:
    return AuditEvent.objects.create(
        project=project,
        actor=actor,
        actor_role=_resolve_actor_role(project, actor),
        event_type=event_type,
        channel=channel,
        subject_type=subject_type,
        subject_id=str(subject_id),
        payload=payload or {},
        source_message_ref=source_message_ref,
    )


# --- Verified milestone ledger ----------------------------------------------


def submit_evidence(
    *,
    project,
    subject_type: str,
    subject_id,
    submitted_by,
    caption: str,
    captured_at,
    media_url: str = "",
    latitude=None,
    longitude=None,
) -> EvidenceRecord:
    record = EvidenceRecord.objects.create(
        project=project,
        subject_type=subject_type,
        subject_id=str(subject_id),
        submitted_by=submitted_by,
        caption=caption,
        media_url=media_url,
        latitude=latitude,
        longitude=longitude,
        captured_at=captured_at,
    )
    record_event(
        project=project,
        actor=submitted_by,
        event_type="evidence_submitted",
        subject_type=subject_type,
        subject_id=subject_id,
        payload={"caption": caption, "evidence_id": record.id},
    )
    return record


def verify_evidence(record: EvidenceRecord, verifier) -> EvidenceRecord:
    """A photo upload alone is a pending claim - this is what makes it 'count'."""
    record.verified = True
    record.verified_by = verifier
    record.verified_at = timezone.now()
    record.save(update_fields=["verified", "verified_by", "verified_at", "updated_at"])

    record_event(
        project=record.project,
        actor=verifier,
        event_type="evidence_verified",
        subject_type=record.subject_type,
        subject_id=record.subject_id,
        payload={"evidence_id": record.id},
    )

    import platform_api.services as platform_api

    platform_api.dispatch_webhook_event(
        record.project, "evidence.verified", {"evidence_id": record.id, "subject_type": record.subject_type, "subject_id": record.subject_id}
    )
    return record


def get_verification_status(project, subject_type: str, subject_id) -> dict:
    """
    Consumed by contract-payments-style callers: is there verified evidence
    backing this subject? Scoped to the caller's project - subject ids are
    only unique per (project, subject_type), so an unscoped lookup would let
    evidence on one project's subject satisfy another's gate.
    """
    records = EvidenceRecord.objects.filter(project=project, subject_type=subject_type, subject_id=str(subject_id))
    verified = records.filter(verified=True)
    return {
        "has_verified_evidence": verified.exists(),
        "verified_count": verified.count(),
        "pending_count": records.filter(verified=False).count(),
        "latest_verified_at": verified.order_by("-verified_at").values_list("verified_at", flat=True).first(),
    }


def get_evidence_for_subject(project, subject_type: str, subject_id) -> list[EvidenceRecord]:
    return list(
        EvidenceRecord.objects.filter(project=project, subject_type=subject_type, subject_id=str(subject_id))
        .select_related("submitted_by", "verified_by")
    )


def get_evidence_for_project(project):
    return EvidenceRecord.objects.filter(project=project).select_related("submitted_by", "verified_by")


# --- Overdue-update / contractor-silence detection --------------------------


@transaction.atomic
def flag_if_silent(*, project, subject_type: str, subject_id, expected_by) -> SilenceFlag | None:
    """Idempotent: safe to call repeatedly (e.g. from another module's escalation sweep)."""
    if timezone.now() <= expected_by:
        return None
    already_open = SilenceFlag.objects.filter(
        project=project, subject_type=subject_type, subject_id=str(subject_id), resolved=False
    ).exists()
    if already_open:
        return None

    flag = SilenceFlag.objects.create(
        project=project, subject_type=subject_type, subject_id=str(subject_id), expected_by=expected_by
    )
    record_event(
        project=project,
        actor=None,
        event_type="silence_flagged",
        channel=Channel.SYSTEM,
        subject_type=subject_type,
        subject_id=subject_id,
        payload={"expected_by": expected_by.isoformat()},
    )

    import platform_api.services as platform_api

    platform_api.dispatch_webhook_event(project, "contractor.overdue", {"subject_type": subject_type, "subject_id": str(subject_id)})
    return flag


def resolve_silence_flag(project, subject_type: str, subject_id, resolved_by=None) -> int:
    """Called once activity resumes on the subject (e.g. an RFI gets answered). Returns count resolved."""
    # Capture the target rows before the bulk update - re-querying afterwards
    # could pick up a different (e.g. freshly re-flagged) row.
    open_flags = list(
        SilenceFlag.objects.filter(project=project, subject_type=subject_type, subject_id=str(subject_id), resolved=False)
    )
    if not open_flags:
        return 0
    SilenceFlag.objects.filter(id__in=[flag.id for flag in open_flags]).update(resolved=True, resolved_at=timezone.now())
    record_event(
        project=project,
        actor=resolved_by,
        event_type="silence_resolved",
        subject_type=subject_type,
        subject_id=subject_id,
    )
    return len(open_flags)


def get_open_silence_flags(project) -> list[SilenceFlag]:
    return list(SilenceFlag.objects.filter(project=project, resolved=False))


# --- Access audit log reads (consumed by accounts/access-control-admin and
# observability - same underlying stream, different filter, never a
# separate log per platform-architecture.md) ---


def get_audit_events(project, actor=None, event_type: str | None = None, limit: int = 200) -> list[AuditEvent]:
    """`project=None` reads across all projects - for staff-gated internal
    consumers (observability's security signal) only, never a member view."""
    qs = AuditEvent.objects.select_related("actor")
    if project is not None:
        qs = qs.filter(project=project)
    if actor is not None:
        qs = qs.filter(actor=actor)
    if event_type:
        qs = qs.filter(event_type=event_type)
    return list(qs[:limit])


def get_last_activity_by_project() -> dict:
    """project_id -> most recent audit-event timestamp, in one query - for
    observability's quiet-project sweep (staff-gated, cross-project)."""
    return dict(
        AuditEvent.objects.values("project_id")
        .annotate(last=Max("created_at"))
        .values_list("project_id", "last")
    )


# --- Case-ready dispute export -----------------------------------------------


def export_dispute_bundle(project) -> list[dict]:
    """
    Chronological, tamper-evident (append-only source) export for SCCA
    arbitration use. Always preserves `source_message_ref` verbatim - 
    summarization happens at read time elsewhere, never in this export.
    """
    events = AuditEvent.objects.filter(project=project).select_related("actor").order_by("created_at")
    return [
        {
            "id": e.id,
            "timestamp": e.created_at.isoformat(),
            "actor": e.actor.get_full_name() if e.actor else None,
            "actor_role": e.actor_role,
            "event_type": e.event_type,
            "channel": e.channel,
            "subject_type": e.subject_type,
            "subject_id": e.subject_id,
            "payload": e.payload,
            "source_message_ref": e.source_message_ref or None,
        }
        for e in events
    ]


# --- Change-order cost/schedule rollup ---------------------------------------


def get_change_order_rollup(project) -> dict:
    """Aggregated here per skill; the underlying ChangeOrder data is owned and read from rfi_change_control."""
    import rfi_change_control.services as rfi_change_control  # local import: avoids app-load-order coupling

    change_orders = rfi_change_control.get_change_orders(project)
    cumulative_cost = sum((co.cost_impact for co in change_orders), start=0)
    cumulative_days = sum((co.schedule_impact_days for co in change_orders), start=0)
    return {
        "count": len(change_orders),
        "cumulative_cost_impact": cumulative_cost,
        "cumulative_schedule_impact_days": cumulative_days,
    }
