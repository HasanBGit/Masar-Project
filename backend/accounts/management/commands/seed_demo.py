from datetime import date, timedelta
from decimal import Decimal

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
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

import contract_payments.services as contract_payments
import handover.services as handover
import rfi_change_control.services as rfi_change_control
import trust_evidence.services as trust_evidence

DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    ("owner@truepoint.sa", "Sara Al-Otaibi", Role.OWNER),
    ("consultant@truepoint.sa", "Nora Al-Qahtani", Role.CONSULTANT),
    ("pm@truepoint.sa", "Khalid Al-Zahrani", Role.PROJECT_MANAGER),
    ("designer@truepoint.sa", "Lina Al-Rashid", Role.DESIGNER),
    ("ops@truepoint.sa", "Truepoint Ops", Role.ADMIN),
]


class Command(BaseCommand):
    help = "Seed a demo project, one user per role, and sample decisions across every 3-Edges state."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo creates well-known demo credentials - refusing to run with DEBUG=False.")
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
                    user.is_staff = True  # Truepoint-internal ops - gates the observability dashboard, not project RBAC
                user.save()
            ProjectMembership.objects.get_or_create(user=user, project=project, defaults={"role": role})
            users[role] = user
            self.stdout.write(f"  user: {email} ({role})")

        EscalationRule.objects.get_or_create(
            project=project,
            defaults={"default_sla_hours": 48, "high_stakes_sla_hours": 24, "fallback_role": Role.OWNER},
        )

        owner, consultant, project_manager, designer = (
            users[Role.OWNER],
            users[Role.CONSULTANT],
            users[Role.PROJECT_MANAGER],
            users[Role.DESIGNER],
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
            # 1. Sitting in Hearing - high stakes, freshly requested. A contract
            # amendment/cost change stays Owner-accountable - it's the one
            # class of decision that touches money directly, not a PM/Designer
            # report working its way up the approval chain.
            request_decision(
                project=project,
                title="Change order: MEP shaft rerouting (+SAR 42,000, +9 days)",
                description="Consultant flags a clash between the mechanical shaft and the structural beam on level 12; "
                "requires rerouting and a contract amendment.",
                requested_by=consultant,
                raci=raci(accountable=owner, responsible=project_manager, consulted=consultant),
                high_stakes=True,
                subject_type="change_order",
            )

            # 2. Understanding stage - hearing already acknowledged. This is
            # the story's core beat: the PM logs a payment milestone as a
            # task with evidence, and it runs the approval sequence up to
            # the Consultant (not straight to the Owner).
            d2 = request_decision(
                project=project,
                title="Payment milestone 4 sign-off (SAR 1,250,000)",
                description="Structural frame complete through level 15, verified against the site report and progress photos.",
                requested_by=project_manager,
                raci=raci(accountable=consultant, responsible=project_manager, informed=owner),
                high_stakes=True,
                subject_type="payment_milestone",
            )
            confirm_hearing(d2, consultant)

            # 3. Agreeing stage - understanding already recorded. Consultant
            # is the default accountable approver for PM submissions.
            d3 = request_decision(
                project=project,
                title="Approve revised finishing-material submittal (lobby marble)",
                description="PM proposes an alternate marble supplier due to a 6-week import delay on the spec'd material.",
                requested_by=project_manager,
                raci=raci(accountable=consultant, responsible=project_manager, consulted=designer),
                high_stakes=True,
                subject_type="submittal",
            )
            confirm_hearing(d3, consultant)
            record_understanding(
                d3,
                consultant,
                "PM wants to swap the lobby marble supplier because the original one has a 6-week import "
                "delay; the alternate is the same grade at a comparable price.",
            )

            # 4. Closed - full 3 Edges walked, low-stakes.
            d4 = request_decision(
                project=project,
                title="Weekly site-access schedule for Ramadan hours",
                description="Adjust daily site working hours for the Ramadan month per municipal guidance.",
                requested_by=owner,
                raci=raci(accountable=owner, informed=project_manager),
                high_stakes=False,
                subject_type="general",
            )
            confirm_hearing(d4, owner)  # low-stakes: collapses straight to "agreeing"
            record_agreement(d4, owner)

            # 5. Escalated - SLA already breached at creation time (backdated).
            d5 = request_decision(
                project=project,
                title="RFI response: façade anchor spec clarification",
                description="PM needs consultant sign-off on the façade anchor spec before ordering - blocking level 9 work.",
                requested_by=project_manager,
                raci=raci(accountable=consultant, responsible=project_manager, informed=owner),
                high_stakes=True,
                subject_type="rfi",
            )
            d5.sla_deadline = timezone.now() - timedelta(hours=6)
            d5.save(update_fields=["sla_deadline"])
            escalate_overdue_decisions(project=project)

            # 6. Understanding stage - the Designer/Consultant review loop:
            # Consultant watches the architecture take shape, comments, and
            # requests edits before it's considered agreed.
            d6 = request_decision(
                project=project,
                title="Design review: Level 12 lobby elevation",
                description="Designer submits the revised lobby elevation for the Consultant's architectural review and sign-off.",
                requested_by=designer,
                raci=raci(accountable=consultant, responsible=designer, informed=owner),
                high_stakes=True,
                subject_type="design_review",
            )
            confirm_hearing(d6, consultant)
            record_understanding(
                d6,
                consultant,
                "Designer moved the reception desk 1.2m to clear the fire-exit sightline and swapped the ceiling "
                "cladding to match the podium finish - re-submit the RCP before this is signed off.",
            )

        self._seed_trust_evidence_rfi_and_handover(project, owner, consultant, project_manager, designer, d2)
        self._seed_contract_payments(project, owner, consultant, project_manager)
        self._seed_access_control_observability_and_platform_api(project, owner, project_manager)
        self._seed_drawing_models(project, designer)

        self.stdout.write(self.style.SUCCESS("Demo data ready. Log in as owner@truepoint.sa / demo1234 (or consultant/pm/designer@truepoint.sa)."))

    def _seed_access_control_observability_and_platform_api(self, project, owner, project_manager):
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
        observability.record_digest_view(project, project_manager)

        # --- Module 14: platform API ---
        raw_key, _ = platform_api.generate_api_key(
            project=project, label="Demo partner integration", scope=ApiKeyScope.OWNER, tier=ApiKeyTier.PARTNER, created_by=owner,
        )
        # A placeholder endpoint only - seeding must not fire live HTTP
        # requests, so no delivery is dispatched here (use the app or
        # `retry_failed_webhooks` to exercise the real dispatch path).
        subscription = platform_api.create_webhook_subscription(
            project=project, target_url="https://example.com/webhooks/truepoint-demo",
            event_types=["approval.requested", "evidence.verified", "project_manager.overdue"], created_by=owner,
        )

        self.stdout.write(f"  API key (shown once): {raw_key}")
        self.stdout.write(f"  Webhook subscription -> {subscription.target_url}")

    def _seed_trust_evidence_rfi_and_handover(self, project, owner, consultant, project_manager, designer, milestone_decision):
        if project.rfis.exists():
            self.stdout.write(self.style.WARNING("Modules 5-7 demo data already exists - skipping."))
            return

        # --- Module 5: Trust & Evidence ---
        verified = trust_evidence.submit_evidence(
            project=project, subject_type="payment_milestone", subject_id=milestone_decision.id,
            submitted_by=project_manager, caption="Level 15 structural frame - south elevation",
            captured_at=timezone.now() - timedelta(days=2), media_url="https://example.com/evidence/level15-south.jpg",
            latitude=24.7136, longitude=46.6753,
        )
        trust_evidence.verify_evidence(verified, owner)
        trust_evidence.submit_evidence(
            project=project, subject_type="payment_milestone", subject_id=milestone_decision.id,
            submitted_by=project_manager, caption="Level 15 structural frame - north elevation",
            captured_at=timezone.now() - timedelta(hours=6), media_url="https://example.com/evidence/level15-north.jpg",
            latitude=24.7137, longitude=46.6754,
        )  # left unverified on purpose - a pending claim, not yet "counting"

        # --- Module 6: RFI, Change Order & Version Control ---
        answered = rfi_change_control.create_rfi(
            project=project, raised_by=project_manager, title="Waterproofing membrane spec at podium level",
            question="Which waterproofing membrane spec applies at the podium slab - drawing A-204 or the updated M-112 addendum?",
            respond_by=timezone.now() + timedelta(days=2), location_tag="Podium",
        )
        rfi_change_control.respond_to_rfi(answered, consultant, "Use the M-112 addendum spec - it supersedes A-204 for this zone.")

        rfi_change_control.create_rfi(
            project=project, raised_by=project_manager, title="Elevator shaft fire-rating clarification",
            question="Fire-rating requirement for the elevator shaft wall at levels 8-10 - 2hr or 3hr per the updated code review?",
            respond_by=timezone.now() + timedelta(hours=6), schedule_impact_days=4, location_tag="Core, Levels 8-10",
        )  # inside the at-risk window

        rfi_change_control.create_rfi(
            project=project, raised_by=project_manager, title="Façade curtain-wall bracket spacing",
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
            project=project, submitted_by=designer, title="Lobby marble - alternate supplier sample",
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
            project=project, created_by=project_manager, location_tag="Level 9, MEP shaft",
            title="Ductwork clash with structural beam", opening_message="MEP ductwork run clashes with the level 9 transfer beam - need structural + MEP to align on routing before we pour.",
        )
        rfi_change_control.post_coordination_message(thread, consultant, "Structural can shift the beam opening 200mm north - confirming with the engineer of record today.")

        # --- Module 7: Handover & Post-Handover ---
        handover.record_practical_completion(
            project=project, practical_completion_date=date.today() - timedelta(days=180), recorded_by=owner
        )
        handover.create_punch_list_item(project=project, raised_by=project_manager, unit_or_zone="Unit 4B", title="Chipped tile, kitchen entrance")
        pending_item = handover.create_punch_list_item(project=project, raised_by=project_manager, unit_or_zone="Unit 4B", title="Paint touch-up, living room wall")
        handover.request_closure_signoff(pending_item, requested_by=project_manager, accountable_user=owner)
        closed_item = handover.create_punch_list_item(project=project, raised_by=project_manager, unit_or_zone="Lobby", title="Scuff marks on lobby flooring")
        closed_decision = handover.request_closure_signoff(closed_item, requested_by=project_manager, accountable_user=owner)
        confirm_hearing(closed_decision, owner)
        record_agreement(closed_decision, owner)
        handover.sync_closure_from_decision(closed_item)

        handover.create_om_item(project=project, category="HVAC", description_en="Chiller unit maintenance manual", document_ref="https://example.com/om/chiller-manual.pdf")
        verified_om = handover.create_om_item(project=project, category="Fire Safety", description_en="Fire alarm panel commissioning certificate")
        handover.verify_om_item(verified_om, consultant)

        handover.report_defect(project=project, reported_by=owner, unit_or_zone="Unit 4B", title="Water leak under kitchen sink")
        resolved_defect = handover.report_defect(project=project, reported_by=owner, unit_or_zone="Unit 7A", title="AC unit noise complaint")
        handover.acknowledge_defect(resolved_defect, project_manager)
        handover.resolve_defect(resolved_defect, project_manager)

    def _seed_contract_payments(self, project, owner, consultant, project_manager):
        from approvals.models import Decision
        from contract_payments.models import Contract
        from core.models import DocumentLifecycleStatus
        from rfi_change_control.models import ChangeOrder

        if Contract.objects.filter(project=project).exists():
            self.stdout.write(self.style.WARNING("Module 12 demo data already exists - skipping."))
            return

        # --- Module 12: Contract & Payments ---
        contract = contract_payments.create_contract(
            project=project,
            title="Riyadh Tower - Phase 1 Design-and-Build Contract",
            contract_value="25000000.00",
            currency="SAR",
            scope_baseline=(
                "Design-and-build contract for a 22-storey mixed-use tower (2-level podium + 20 typical "
                "floors + rooftop mechanical level) on King Fahd Road, Riyadh: structural frame, MEP "
                "systems, curtain wall facade, interior fit-out of shell-and-core areas, and external "
                "works, per the approved architectural and structural drawing set (rev. C)."
            ),
            retention_percentage="10.00",
            ceiling_threshold_percentage="10.00",
        )

        # Progress-payment schedule for a tower already through practical
        # completion (handover was recorded 180 days ago) - every milestone
        # but the final retention release has real verified evidence behind
        # it, walked through the actual submit -> verify -> release path.
        schedule = [
            ("Mobilization & site establishment", "Site mobilization, hoarding, and shoring/excavation permits secured", "1000000.00", 720, "Site compound"),
            ("Excavation & shoring complete", "Excavation and shoring complete to founding level", "1500000.00", 660, "Basement"),
            ("Foundation & raft slab complete", "Raft foundation and basement slab poured and cured", "2000000.00", 600, "Basement"),
            ("Structural frame complete through Level 15", "Structural frame complete through Level 15, verified against the site report and progress photos", "1250000.00", 380, "Level 15"),
            ("Structural frame top-out (Level 22)", "Structural frame complete through Level 22, including the rooftop mechanical level", "2750000.00", 300, "Level 22"),
            ("MEP first-fix complete", "MEP first-fix (rough-in) complete across all typical floors", "3500000.00", 260, "Core, all floors"),
            ("Curtain wall & facade complete", "Curtain wall and facade cladding installation complete on all elevations", "4000000.00", 230, "East facade"),
            ("Interior fit-out & finishes complete", "Interior fit-out and finishes complete in shell-and-core scope", "5000000.00", 200, "Lobby, Level 12"),
            ("Testing, commissioning & practical completion", "Testing and commissioning complete; practical completion certificate issued", "3000000.00", 182, "Whole building"),
        ]

        released_count = 0
        for name, due_condition, amount, days_ago, location in schedule:
            milestone = contract_payments.add_payment_milestone(
                contract=contract, name=name, due_condition=due_condition, amount=amount,
                retention_held=str(round(Decimal(amount) * Decimal("0.10"), 2)),
            )
            captured_at = timezone.now() - timedelta(days=days_ago)
            evidence = trust_evidence.submit_evidence(
                project=project, subject_type=milestone.evidence_subject_type, subject_id=milestone.id,
                submitted_by=project_manager, caption=f"{name} - {location}",
                captured_at=captured_at, media_url=f"https://example.com/evidence/milestone-{milestone.id}.jpg",
                latitude=24.7136, longitude=46.6753,
            )
            trust_evidence.verify_evidence(evidence, consultant)
            contract_payments.release_payment_milestone(milestone, released_by=owner)
            milestone.released_at = captured_at + timedelta(days=2)
            milestone.save(update_fields=["released_at"])
            released_count += 1

        # Final 10% retention release stays pending until the decennial liability window closes.
        contract_payments.add_payment_milestone(
            contract=contract, name="Final retention release",
            due_condition="Final 10% retention release on expiry of the decennial liability period",
            amount="1000000.00",
        )

        # The podium waterproofing change order (already seeded above) is
        # approved and rolled into the contract via a signed amendment -
        # exercises the contract-vs-actual tracker with a real approved
        # change order, and Module 12's digital signing path end to end.
        change_order = ChangeOrder.objects.get(project=project, title="Podium waterproofing membrane upgrade")
        change_order.status = DocumentLifecycleStatus.APPROVED
        change_order.save(update_fields=["status", "updated_at"])

        amendment = contract_payments.request_contract_signing(
            contract=contract, requested_by=project_manager, version_number=1,
            summary="Incorporate the approved podium waterproofing membrane upgrade change order (+SAR 18,500.00 / +3 days) into the contract.",
            raci=[
                {"user": owner, "raci_role": RaciRole.ACCOUNTABLE},
                {"user": project_manager, "raci_role": RaciRole.RESPONSIBLE},
                {"user": consultant, "raci_role": RaciRole.CONSULTED},
            ],
        )
        signing_decision = Decision.objects.get(id=amendment.decision_id)
        confirm_hearing(signing_decision, owner)
        record_understanding(
            signing_decision, owner,
            "This adds the podium waterproofing membrane upgrade to the contract at +SAR 18,500.00 and +3 days, "
            "funded from the existing contingency - no change to the overall completion date.",
        )
        record_agreement(signing_decision, owner)

        contract_payments.ingest_contract_for_legal_agent(contract)

        tracker = contract_payments.get_contract_vs_actual(project)
        self.stdout.write(
            f"  contract: {contract.title} - SAR {tracker['paid_to_date']:,} released of "
            f"SAR {tracker['adjusted_contract_value']:,} adjusted value "
            f"({released_count} milestones released, 1 pending)"
        )

    def _seed_drawing_models(self, project, designer):
        """
        Real, parseable OBJ meshes (simple massing blocks, not placeholder
        files) so the Drawings Studio 3D viewer has something to actually
        load - see ACCEPTED_FORMATS in drawings_studio/models.py. Wherever
        DrawingModel.file ends up (local disk or S3/Supabase Storage,
        per config/settings.py's STORAGES) is whatever DEFAULT_FILE_STORAGE
        is configured for at the time this command runs.
        """
        import drawings_studio.services as drawings_studio
        from django.core.files.base import ContentFile
        from drawings_studio.models import DrawingModel

        if DrawingModel.objects.filter(project=project).exists():
            self.stdout.write(self.style.WARNING("Module 8 (drawings studio) demo data already exists - skipping."))
            return

        def box_obj(width, depth, height):
            w, d, h = width / 2, depth / 2, height
            vertices = [
                (-w, 0, -d), (w, 0, -d), (w, 0, d), (-w, 0, d),
                (-w, h, -d), (w, h, -d), (w, h, d), (-w, h, d),
            ]
            faces = [(1, 2, 3, 4), (5, 8, 7, 6), (1, 5, 6, 2), (3, 7, 8, 4), (4, 8, 5, 1), (2, 6, 7, 3)]
            lines = ["# Procedural massing block - Drawings Studio demo data"]
            lines += [f"v {x} {y} {z}" for x, y, z in vertices]
            lines += ["f " + " ".join(str(i) for i in face) for face in faces]
            return "\n".join(lines) + "\n"

        # Massing blocks roughly to scale: the 22-storey tower (~13m/floor),
        # the 2-level podium/retail base it sits on, and a small standalone
        # site amenity building (guard house / sales pavilion).
        models = [
            ("Riyadh Tower - Main Tower Block", "riyadh-tower-main-block.obj", box_obj(30, 30, 220)),
            ("Riyadh Tower - Podium & Retail Block", "riyadh-tower-podium-block.obj", box_obj(80, 60, 16)),
            ("Riyadh Tower - Site Amenity Building", "riyadh-tower-amenity-building.obj", box_obj(10, 8, 4)),
        ]

        for name, filename, content in models:
            drawings_studio.create_drawing_model(
                project=project, uploaded_by=designer, name=name,
                file=ContentFile(content, name=filename),
            )
            self.stdout.write(f"  drawing model: {name} ({filename})")
