"""
Service layer for Module 7. Punch-list closure routes through
approvals.services (owner sign-off) rather than reimplementing approval
logic here - see skills/handover-closeout/SKILL.md.
"""

from django.db import transaction
from django.utils import timezone

import approvals.services as approvals
import trust_evidence.services as trust_evidence

from .models import HandoverRecord, OMChecklistItem, PostHandoverDefect, PostHandoverStatus, PunchListItem, PunchListStatus

PUNCH_LIST_SUBJECT_TYPE = "punch_list_item"


# --- Handover record / decennial liability window --------------------------


def record_practical_completion(*, project, practical_completion_date, recorded_by) -> HandoverRecord:
    record, _ = HandoverRecord.objects.update_or_create(
        project=project,
        defaults={"practical_completion_date": practical_completion_date, "recorded_by": recorded_by},
    )
    trust_evidence.record_event(
        project=project, actor=recorded_by, event_type="practical_completion_recorded",
        subject_type="handover_record", subject_id=record.id,
        payload={"practical_completion_date": practical_completion_date.isoformat()},
    )
    return record


def get_handover_record(project) -> HandoverRecord | None:
    return HandoverRecord.objects.filter(project=project).first()


def is_within_liability_window(project) -> bool:
    record = get_handover_record(project)
    if record is None:
        return False
    return timezone.now().date() <= record.decennial_liability_expires_at


# --- Punch list --------------------------------------------------------------


def create_punch_list_item(*, project, raised_by, unit_or_zone: str, title: str, description: str = "") -> PunchListItem:
    item = PunchListItem.objects.create(
        project=project, unit_or_zone=unit_or_zone, title=title, description=description,
        raised_by=raised_by, status=PunchListStatus.OPEN, owner=raised_by,
    )
    trust_evidence.record_event(
        project=project, actor=raised_by, event_type="punch_list_item_raised",
        subject_type=PUNCH_LIST_SUBJECT_TYPE, subject_id=item.id, payload={"unit_or_zone": unit_or_zone},
    )
    return item


@transaction.atomic
def request_closure_signoff(item: PunchListItem, *, requested_by, accountable_user, sla_hours: int = 48):
    if item.status != PunchListStatus.OPEN:
        raise ValueError(f"Cannot request sign-off from status '{item.status}'.")

    decision = approvals.request_decision(
        project=item.project,
        title=f"Sign off punch-list item: {item.title}",
        description=item.description,
        requested_by=requested_by,
        raci=[{"user": accountable_user, "raci_role": "A"}],
        high_stakes=False,
        subject_type=PUNCH_LIST_SUBJECT_TYPE,
        subject_ref=str(item.id),
    )
    item.status = PunchListStatus.PENDING_SIGNOFF
    item.assigned_approver = accountable_user
    item.save(update_fields=["status", "assigned_approver", "updated_at"])
    return decision


def sync_closure_from_decision(item: PunchListItem) -> PunchListItem:
    """Call after the linked Decision may have progressed (e.g. on read) to reflect owner sign-off here."""
    if item.status != PunchListStatus.PENDING_SIGNOFF:
        return item
    decision = approvals.get_decision_for_subject(PUNCH_LIST_SUBJECT_TYPE, item.id)
    if decision is not None and decision.status == "closed":
        item.status = PunchListStatus.VERIFIED_CLOSED
        item.save(update_fields=["status", "updated_at"])
        trust_evidence.record_event(
            project=item.project, actor=decision.agreement_confirmed_by, event_type="punch_list_item_verified_closed",
            subject_type=PUNCH_LIST_SUBJECT_TYPE, subject_id=item.id,
        )
    return item


def get_punch_list(project, unit_or_zone: str | None = None):
    """Read-only. Items pending sign-off are synced against their Decision via
    `sync_closure_from_decision` - called from the explicit sync action /
    write paths, never lazily during a GET."""
    qs = PunchListItem.objects.filter(project=project).select_related("raised_by", "assigned_approver")
    if unit_or_zone:
        qs = qs.filter(unit_or_zone=unit_or_zone)
    return qs


# --- O&M documentation checklist ---------------------------------------------


def create_om_item(*, project, category: str, description_en: str, description_ar: str = "", document_ref: str = "") -> OMChecklistItem:
    return OMChecklistItem.objects.create(
        project=project, category=category, description_en=description_en,
        description_ar=description_ar, document_ref=document_ref,
    )


def verify_om_item(item: OMChecklistItem, verifier) -> OMChecklistItem:
    item.installed_verified = True
    item.verified_by = verifier
    item.verified_at = timezone.now()
    item.save(update_fields=["installed_verified", "verified_by", "verified_at", "updated_at"])
    trust_evidence.record_event(
        project=item.project, actor=verifier, event_type="om_item_verified",
        subject_type="om_checklist_item", subject_id=item.id,
    )
    return item


def get_om_checklist(project) -> list[OMChecklistItem]:
    return list(OMChecklistItem.objects.filter(project=project))


# --- Post-handover defects ----------------------------------------------------


def report_defect(*, project, reported_by, unit_or_zone: str, title: str, description: str = "") -> PostHandoverDefect:
    defect = PostHandoverDefect.objects.create(
        project=project, unit_or_zone=unit_or_zone, title=title, description=description,
        reported_by=reported_by, status=PostHandoverStatus.REPORTED, owner=reported_by,
    )
    trust_evidence.record_event(
        project=project, actor=reported_by, event_type="post_handover_defect_reported",
        subject_type="post_handover_defect", subject_id=defect.id,
        payload={"unit_or_zone": unit_or_zone, "within_liability_window": is_within_liability_window(project)},
    )
    return defect


def acknowledge_defect(defect: PostHandoverDefect, user) -> PostHandoverDefect:
    if defect.status != PostHandoverStatus.REPORTED:
        raise ValueError(f"Cannot acknowledge from status '{defect.status}'.")
    defect.status = PostHandoverStatus.ACKNOWLEDGED
    defect.save(update_fields=["status", "updated_at"])
    trust_evidence.record_event(
        project=defect.project, actor=user, event_type="post_handover_defect_acknowledged",
        subject_type="post_handover_defect", subject_id=defect.id,
    )
    return defect


def resolve_defect(defect: PostHandoverDefect, user) -> PostHandoverDefect:
    if defect.status == PostHandoverStatus.RESOLVED:
        raise ValueError("This defect is already resolved.")
    defect.status = PostHandoverStatus.RESOLVED
    defect.save(update_fields=["status", "updated_at"])
    trust_evidence.record_event(
        project=defect.project, actor=user, event_type="post_handover_defect_resolved",
        subject_type="post_handover_defect", subject_id=defect.id,
    )
    return defect


def get_defects(project) -> list[PostHandoverDefect]:
    return list(PostHandoverDefect.objects.filter(project=project))


# --- Master schedule integration (read by rfi_change_control) ---------------


def get_master_schedule_items(project) -> list[dict]:
    record = get_handover_record(project)
    if record is None:
        return []
    completion_dt = timezone.make_aware(timezone.datetime.combine(record.practical_completion_date, timezone.datetime.min.time()))
    return [{"type": "handover_milestone", "id": record.id, "title": "Practical completion", "date": completion_dt, "status": "approved"}]
