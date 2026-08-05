"""
Service layer for Module 6. Every tracked-object type here inherits the
shared TrackedItem base + DocumentLifecycleStatus enum - see models.py.
Approval routing is never reimplemented here; it goes through
approvals.services, same as everyone else.
"""

from datetime import timedelta
from decimal import Decimal

from core.models import DocumentLifecycleStatus
from django.db import transaction
from django.utils import timezone

import trust_evidence.services as trust_evidence

from .models import (
    ChangeOrder,
    CoordinationMessage,
    CoordinationThread,
    Permit,
    QualityCheckpoint,
    RFI,
    Submittal,
    SupplierDelivery,
)

AT_RISK_WINDOW = timedelta(hours=24)


# --- RFI ----------------------------------------------------------------


def _next_rfi_number(project) -> str:
    count = RFI.objects.filter(project=project).count()
    return f"RFI-{count + 1:03d}"


@transaction.atomic
def create_rfi(
    *, project, raised_by, title: str, question: str, respond_by, schedule_impact_days: int = 0, location_tag: str = ""
) -> RFI:
    rfi = RFI.objects.create(
        project=project,
        number=_next_rfi_number(project),
        title=title,
        question=question,
        schedule_impact_days=schedule_impact_days,
        location_tag=location_tag,
        raised_by=raised_by,
        status=DocumentLifecycleStatus.UNDER_REVIEW,
        owner=raised_by,
        sla_deadline=respond_by,
    )
    trust_evidence.record_event(
        project=project, actor=raised_by, event_type="rfi_raised", subject_type="rfi", subject_id=rfi.id,
        payload={"title": title, "respond_by": respond_by.isoformat()},
    )
    return rfi


@transaction.atomic
def respond_to_rfi(rfi: RFI, responder, response_text: str) -> RFI:
    if not response_text.strip():
        raise ValueError("A response is required to answer an RFI.")
    rfi.response = response_text.strip()
    rfi.status = DocumentLifecycleStatus.APPROVED
    rfi.save(update_fields=["response", "status", "updated_at"])

    trust_evidence.record_event(
        project=rfi.project, actor=responder, event_type="rfi_answered", subject_type="rfi", subject_id=rfi.id,
    )
    trust_evidence.resolve_silence_flag("rfi", rfi.id, resolved_by=responder)
    return rfi


def get_at_risk_rfis(project) -> list[RFI]:
    """Overdue, or inside the at-risk window before the response deadline."""
    now = timezone.now()
    pending = RFI.objects.filter(project=project, status=DocumentLifecycleStatus.UNDER_REVIEW)
    return [rfi for rfi in pending if rfi.is_overdue or (rfi.sla_deadline and rfi.sla_deadline - now <= AT_RISK_WINDOW)]


def flag_silent_rfis(project=None) -> int:
    """Sweep: any RFI overdue on its respond-by deadline gets a SilenceFlag. Returns count newly flagged."""
    qs = RFI.objects.filter(status=DocumentLifecycleStatus.UNDER_REVIEW)
    if project is not None:
        qs = qs.filter(project=project)
    flagged = 0
    for rfi in qs:
        if rfi.is_overdue:
            flag = trust_evidence.flag_if_silent(
                project=rfi.project, subject_type="rfi", subject_id=rfi.id, expected_by=rfi.sla_deadline
            )
            if flag is not None:
                flagged += 1
    return flagged


def get_rfis(project) -> list[RFI]:
    return list(RFI.objects.filter(project=project))


# --- Change orders --------------------------------------------------------


def create_change_order(
    *, project, raised_by, title: str, baseline_scope: str, scope_delta: str, cost_impact, schedule_impact_days: int, evidence_ref: str = ""
) -> ChangeOrder:
    return ChangeOrder.objects.create(
        project=project,
        title=title,
        baseline_scope=baseline_scope,
        scope_delta=scope_delta,
        cost_impact=Decimal(str(cost_impact)),
        schedule_impact_days=schedule_impact_days,
        evidence_ref=evidence_ref,
        raised_by=raised_by,
        status=DocumentLifecycleStatus.DRAFT,
        owner=raised_by,
    )


def get_change_orders(project) -> list[ChangeOrder]:
    return list(ChangeOrder.objects.filter(project=project))


# --- Submittals / Permits / Supplier deliveries / Quality checkpoints -----


def create_submittal(*, project, submitted_by, title: str, spec_section: str = "", description: str = "", revision_number: int = 1) -> Submittal:
    return Submittal.objects.create(
        project=project, title=title, spec_section=spec_section, description=description,
        revision_number=revision_number, current_as_of=timezone.now(), submitted_by=submitted_by,
        status=DocumentLifecycleStatus.UNDER_REVIEW, owner=submitted_by,
    )


def create_permit(*, project, title: str, authority: str = "Balady", permit_number: str = "") -> Permit:
    return Permit.objects.create(
        project=project, title=title, authority=authority, permit_number=permit_number,
        current_as_of=timezone.now(), status=DocumentLifecycleStatus.UNDER_REVIEW,
    )


def create_supplier_delivery(*, project, material: str, supplier_name: str, committed_date) -> SupplierDelivery:
    return SupplierDelivery.objects.create(
        project=project, material=material, supplier_name=supplier_name, committed_date=committed_date,
        status=DocumentLifecycleStatus.DRAFT,
    )


def get_at_risk_supplier_deliveries(project) -> list[SupplierDelivery]:
    today = timezone.now().date()
    return list(
        SupplierDelivery.objects.filter(project=project, committed_date__lt=today).exclude(
            status__in=[DocumentLifecycleStatus.APPROVED, DocumentLifecycleStatus.ARCHIVED]
        )
    )


def create_quality_checkpoint(*, project, title: str, inspector, milestone_ref: str = "", location_tag: str = "") -> QualityCheckpoint:
    return QualityCheckpoint.objects.create(
        project=project, title=title, milestone_ref=milestone_ref, location_tag=location_tag, inspector=inspector,
        status=DocumentLifecycleStatus.UNDER_REVIEW, assigned_approver=inspector,
    )


# --- Coordination threads --------------------------------------------------


def create_coordination_thread(*, project, created_by, location_tag: str, title: str, opening_message: str = "") -> CoordinationThread:
    thread = CoordinationThread.objects.create(project=project, location_tag=location_tag, title=title, created_by=created_by)
    if opening_message.strip():
        CoordinationMessage.objects.create(thread=thread, author=created_by, body=opening_message.strip())
    return thread


def post_coordination_message(thread: CoordinationThread, author, body: str) -> CoordinationMessage:
    if not body.strip():
        raise ValueError("Message body cannot be empty.")
    return CoordinationMessage.objects.create(thread=thread, author=author, body=body.strip())


def get_coordination_threads(project, location_tag: str | None = None) -> list[CoordinationThread]:
    qs = CoordinationThread.objects.filter(project=project).prefetch_related("messages__author")
    if location_tag:
        qs = qs.filter(location_tag=location_tag)
    return list(qs)


# --- Master schedule / critical-path view ----------------------------------


def get_master_schedule(project) -> list[dict]:
    """
    Chronological consolidated view - RFIs, change orders, permits, supplier
    deliveries, and handover milestones on one timeline. Not a true CPM
    critical-path calculation (dependency-graph slack analysis) - that's a
    larger, unbuilt capability; this is the "single timeline" view the
    skill describes as the near-term win.
    """
    import handover.services as handover  # local import: one-directional dependency, avoids app-load coupling

    items = []
    for rfi in RFI.objects.filter(project=project):
        items.append({"type": "rfi", "id": rfi.id, "title": f"RFI {rfi.number}: {rfi.title}", "date": rfi.sla_deadline, "status": rfi.status})
    for co in ChangeOrder.objects.filter(project=project):
        items.append({"type": "change_order", "id": co.id, "title": co.title, "date": co.created_at, "status": co.status})
    for permit in Permit.objects.filter(project=project):
        items.append({"type": "permit", "id": permit.id, "title": permit.title, "date": permit.current_as_of, "status": permit.status})
    for delivery in SupplierDelivery.objects.filter(project=project):
        items.append({
            "type": "supplier_delivery", "id": delivery.id, "title": f"{delivery.material} ({delivery.supplier_name})",
            "date": timezone.make_aware(timezone.datetime.combine(delivery.committed_date, timezone.datetime.min.time())),
            "status": delivery.status,
        })
    items.extend(handover.get_master_schedule_items(project))

    return sorted(items, key=lambda item: item["date"] or timezone.now())
