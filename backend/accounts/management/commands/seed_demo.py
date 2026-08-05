from datetime import date, timedelta

from accounts.models import ProjectMembership, Role, User
from approvals.models import EscalationRule, RaciRole
from approvals.services import (
    confirm_hearing,
    escalate_overdue_decisions,
    record_agreement,
    record_understanding,
    request_decision,
)
from core.models import Project
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

import handover.services as handover
import rfi_change_control.services as rfi_change_control
import trust_evidence.services as trust_evidence

DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    ("owner@truepoint.sa", "Sara Al-Otaibi", Role.OWNER),
    ("investor@truepoint.sa", "Faisal Al-Harbi", Role.INVESTOR),
    ("consultant@truepoint.sa", "Nora Al-Qahtani", Role.CONSULTANT),
    ("contractor@truepoint.sa", "Khalid Al-Zahrani", Role.CONTRACTOR),
    ("ops@truepoint.sa", "San3 Ops", Role.ADMIN),
]


class Command(BaseCommand):
    help = "Seed a demo project, one user per role, and sample decisions across every 3-Edges state."

    @transaction.atomic
    def handle(self, *args, **options):
        project, _ = Project.objects.get_or_create(
            slug="riyadh-tower-phase-1",
            defaults={"name": "Riyadh Tower - Phase 1", "description": "Demo project for Truepoint MVP."},
        )

        users = {}
        for email, full_name, role in DEMO_USERS:
            first_name, _, last_name = full_name.partition(" ")
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"username": email, "first_name": first_name, "last_name": last_name},
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                if role == Role.ADMIN:
                    user.is_staff = True  # San3-internal ops - gates the observability dashboard, not project RBAC
                user.save()
            ProjectMembership.objects.get_or_create(user=user, project=project, defaults={"role": role})
            users[role] = user
            self.stdout.write(f"  user: {email} ({role})")

        EscalationRule.objects.get_or_create(
            project=project,
            defaults={"default_sla_hours": 48, "high_stakes_sla_hours": 24, "fallback_role": Role.OWNER},
        )

        owner, investor, consultant, contractor = (
            users[Role.OWNER],
            users[Role.INVESTOR],
            users[Role.CONSULTANT],
            users[Role.CONTRACTOR],
        )

        def raci(accountable, responsible=None, consulted=None, informed=None):
            rows = [{"user": accountable, "raci_role": RaciRole.ACCOUNTABLE}]
            if responsible:
                rows.append({"user": responsible, "raci_role": RaciRole.RESPONSIBLE})
            if consulted:
                rows.append({"user": consulted, "raci_role": RaciRole.CONSULTED})
            if informed:
                rows.append({"user": informed, "raci_role": RaciRole.INFORMED})
            return rows

        if project.decisions.exists():
            self.stdout.write(self.style.WARNING("Decisions already exist for this project - skipping decision seed."))
            d2 = project.decisions.filter(subject_type="payment_milestone").first()
        else:
            # 1. Sitting in Hearing - high stakes, freshly requested.
            request_decision(
                project=project,
                title="Change order: MEP shaft rerouting (+SAR 42,000, +9 days)",
                description="Consultant flags a clash between the mechanical shaft and the structural beam on level 12; "
                "requires rerouting and a contract amendment.",
                requested_by=consultant,
                raci=raci(accountable=owner, responsible=contractor, consulted=consultant, informed=investor),
                high_stakes=True,
                subject_type="change_order",
            )

            # 2. Understanding stage - hearing already acknowledged.
            d2 = request_decision(
                project=project,
                title="Payment milestone 4 sign-off (SAR 1,250,000)",
                description="Structural frame complete through level 15, verified against the site report and progress photos.",
                requested_by=contractor,
                raci=raci(accountable=owner, responsible=contractor, informed=investor),
                high_stakes=True,
                subject_type="payment_milestone",
            )
            confirm_hearing(d2, owner)

            # 3. Agreeing stage - understanding already recorded.
            d3 = request_decision(
                project=project,
                title="Approve revised finishing-material submittal (lobby marble)",
                description="Contractor proposes an alternate marble supplier due to a 6-week import delay on the spec'd material.",
                requested_by=contractor,
                raci=raci(accountable=owner, responsible=contractor, consulted=consultant),
                high_stakes=True,
                subject_type="submittal",
            )
            confirm_hearing(d3, owner)
            record_understanding(
                d3,
                owner,
                "Contractor wants to swap the lobby marble supplier because the original one has a 6-week import "
                "delay; the alternate is the same grade at a comparable price.",
            )

            # 4. Closed - full 3 Edges walked, low-stakes.
            d4 = request_decision(
                project=project,
                title="Weekly site-access schedule for Ramadan hours",
                description="Adjust daily site working hours for the Ramadan month per municipal guidance.",
                requested_by=owner,
                raci=raci(accountable=owner, informed=contractor),
                high_stakes=False,
                subject_type="general",
            )
            confirm_hearing(d4, owner)  # low-stakes: collapses straight to "agreeing"
            record_agreement(d4, owner)

            # 5. Escalated - SLA already breached at creation time (backdated).
            d5 = request_decision(
                project=project,
                title="RFI response: façade anchor spec clarification",
                description="Contractor needs consultant sign-off on the façade anchor spec before ordering - blocking level 9 work.",
                requested_by=contractor,
                raci=raci(accountable=consultant, responsible=contractor, informed=owner),
                high_stakes=True,
                subject_type="rfi",
            )
            d5.sla_deadline = timezone.now() - timedelta(hours=6)
            d5.save(update_fields=["sla_deadline"])
            escalate_overdue_decisions(project=project)

        self._seed_trust_evidence_rfi_and_handover(project, owner, investor, consultant, contractor, d2)
        self._seed_access_control_observability_and_platform_api(project, owner, contractor)

        self.stdout.write(self.style.SUCCESS("Demo data ready. Log in as owner@truepoint.sa / demo1234 (or investor/consultant/contractor@truepoint.sa)."))

    def _seed_access_control_observability_and_platform_api(self, project, owner, contractor):
        import accounts.services as accounts_services
        import observability.services as observability
        import platform_api.services as platform_api
        from observability.models import HealthStatus, IntegrationType
        from platform_api.models import ApiKeyScope, ApiKeyTier

        if project.api_keys.exists():
            self.stdout.write(self.style.WARNING("Modules 14/15/17 demo data already exists - skipping."))
            return

        # --- Module 17: data retention & residency ---
        accounts_services.get_retention_policy(project)  # creates the default policy row (7y, Saudi Arabia)

        # --- Module 15: observability ---
        # No real WhatsApp/email integration exists yet (field-capture /
        # unified-timeline aren't built) - these are labeled-simulated
        # statuses via the same API a real integration would call.
        observability.report_integration_health(
            project=project, integration_type=IntegrationType.WHATSAPP_SESSION, status=HealthStatus.HEALTHY,
            details={"note": "simulated - field-capture (Module 1) isn't built yet"},
        )
        observability.report_integration_health(
            project=project, integration_type=IntegrationType.EMAIL_OAUTH, status=HealthStatus.DOWN,
            error="invalid_grant: token revoked", details={"note": "simulated - unified-timeline (Module 2) isn't built yet"},
        )  # auto-raises a critical AlertEvent
        observability.report_integration_health(
            project=None, integration_type=IntegrationType.GOVERNMENT_PORTAL, status=HealthStatus.HEALTHY,
        )
        observability.raise_alert(severity="info", source="usage", project=project, message="Weekly digest open rate is steady at 4/5 active members.")
        observability.record_digest_view(project, owner)
        observability.record_digest_view(project, contractor)

        # --- Module 14: platform API ---
        raw_key, _ = platform_api.generate_api_key(
            project=project, label="Demo partner integration", scope=ApiKeyScope.OWNER, tier=ApiKeyTier.PARTNER, created_by=owner,
        )
        subscription = platform_api.create_webhook_subscription(
            project=project, target_url="https://httpbin.org/post",
            event_types=["approval.requested", "evidence.verified", "contractor.overdue"], created_by=owner,
        )
        # Fire one real delivery so the demo shows a genuine attempt (success
        # or failure both demonstrate the real dispatch/retry path - not faked).
        platform_api.dispatch_webhook_event(project, "approval.requested", {"note": "seed-demo test delivery"})

        self.stdout.write(f"  API key (shown once): {raw_key}")
        self.stdout.write(f"  Webhook subscription -> {subscription.target_url}")

    def _seed_trust_evidence_rfi_and_handover(self, project, owner, investor, consultant, contractor, milestone_decision):
        if project.rfis.exists():
            self.stdout.write(self.style.WARNING("Modules 5-7 demo data already exists - skipping."))
            return

        # --- Module 5: Trust & Evidence ---
        verified = trust_evidence.submit_evidence(
            project=project, subject_type="payment_milestone", subject_id=milestone_decision.id,
            submitted_by=contractor, caption="Level 15 structural frame - south elevation",
            captured_at=timezone.now() - timedelta(days=2), media_url="https://example.com/evidence/level15-south.jpg",
            latitude=24.7136, longitude=46.6753,
        )
        trust_evidence.verify_evidence(verified, owner)
        trust_evidence.submit_evidence(
            project=project, subject_type="payment_milestone", subject_id=milestone_decision.id,
            submitted_by=contractor, caption="Level 15 structural frame - north elevation",
            captured_at=timezone.now() - timedelta(hours=6), media_url="https://example.com/evidence/level15-north.jpg",
            latitude=24.7137, longitude=46.6754,
        )  # left unverified on purpose - a pending claim, not yet "counting"

        # --- Module 6: RFI, Change Order & Version Control ---
        answered = rfi_change_control.create_rfi(
            project=project, raised_by=contractor, title="Waterproofing membrane spec at podium level",
            question="Which waterproofing membrane spec applies at the podium slab - drawing A-204 or the updated M-112 addendum?",
            respond_by=timezone.now() + timedelta(days=2), location_tag="Podium",
        )
        rfi_change_control.respond_to_rfi(answered, consultant, "Use the M-112 addendum spec - it supersedes A-204 for this zone.")

        rfi_change_control.create_rfi(
            project=project, raised_by=contractor, title="Elevator shaft fire-rating clarification",
            question="Fire-rating requirement for the elevator shaft wall at levels 8-10 - 2hr or 3hr per the updated code review?",
            respond_by=timezone.now() + timedelta(hours=6), schedule_impact_days=4, location_tag="Core, Levels 8-10",
        )  # inside the at-risk window

        overdue = rfi_change_control.create_rfi(
            project=project, raised_by=contractor, title="Façade curtain-wall bracket spacing",
            question="Bracket spacing for the curtain wall on the east façade - spec sheet is ambiguous between 600mm and 900mm centers.",
            respond_by=timezone.now() - timedelta(days=1), schedule_impact_days=6, location_tag="East façade",
        )
        rfi_change_control.flag_silent_rfis(project=project)

        rfi_change_control.create_change_order(
            project=project, raised_by=consultant, title="Podium waterproofing membrane upgrade",
            baseline_scope="Standard bituminous membrane per original spec A-204",
            scope_delta="Upgrade to the M-112 addendum membrane system across the full podium slab per RFI response",
            cost_impact="18500.00", schedule_impact_days=3, evidence_ref=f"evidence:{verified.id}",
        )
        rfi_change_control.create_submittal(
            project=project, submitted_by=contractor, title="Lobby marble - alternate supplier sample",
            spec_section="09 30 00", description="Alternate supplier sample submitted for lobby marble finish.",
        )
        rfi_change_control.create_permit(project=project, title="Podium excavation extension", authority="Balady", permit_number="RY-2026-8841")
        rfi_change_control.create_supplier_delivery(
            project=project, material="Curtain wall glazing units (east façade)", supplier_name="Gulf Glass Industries",
            committed_date=timezone.now().date() - timedelta(days=3),
        )  # already at-risk: committed date passed, not yet delivered
        rfi_change_control.create_quality_checkpoint(
            project=project, title="Rebar inspection before pour - Level 16", inspector=consultant,
            milestone_ref="Level 16 slab pour", location_tag="Level 16",
        )
        thread = rfi_change_control.create_coordination_thread(
            project=project, created_by=contractor, location_tag="Level 9, MEP shaft",
            title="Ductwork clash with structural beam", opening_message="MEP ductwork run clashes with the level 9 transfer beam - need structural + MEP to align on routing before we pour.",
        )
        rfi_change_control.post_coordination_message(thread, consultant, "Structural can shift the beam opening 200mm north - confirming with the engineer of record today.")

        # --- Module 7: Handover & Post-Handover ---
        handover.record_practical_completion(
            project=project, practical_completion_date=date.today() - timedelta(days=180), recorded_by=owner
        )
        handover.create_punch_list_item(project=project, raised_by=contractor, unit_or_zone="Unit 4B", title="Chipped tile, kitchen entrance")
        pending_item = handover.create_punch_list_item(project=project, raised_by=contractor, unit_or_zone="Unit 4B", title="Paint touch-up, living room wall")
        handover.request_closure_signoff(pending_item, requested_by=contractor, accountable_user=owner)
        closed_item = handover.create_punch_list_item(project=project, raised_by=contractor, unit_or_zone="Lobby", title="Scuff marks on lobby flooring")
        closed_decision = handover.request_closure_signoff(closed_item, requested_by=contractor, accountable_user=owner)
        confirm_hearing(closed_decision, owner)
        record_agreement(closed_decision, owner)
        handover.sync_closure_from_decision(closed_item)

        handover.create_om_item(project=project, category="HVAC", description_en="Chiller unit maintenance manual", description_ar="دليل صيانة وحدة التبريد", document_ref="https://example.com/om/chiller-manual.pdf")
        verified_om = handover.create_om_item(project=project, category="Fire Safety", description_en="Fire alarm panel commissioning certificate", description_ar="شهادة تشغيل لوحة إنذار الحريق")
        handover.verify_om_item(verified_om, consultant)

        handover.report_defect(project=project, reported_by=owner, unit_or_zone="Unit 4B", title="Water leak under kitchen sink")
        resolved_defect = handover.report_defect(project=project, reported_by=owner, unit_or_zone="Unit 7A", title="AC unit noise complaint")
        handover.acknowledge_defect(resolved_defect, contractor)
        handover.resolve_defect(resolved_defect, contractor)
