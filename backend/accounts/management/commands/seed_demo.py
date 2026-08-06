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

# Arabic full names; preferred_language="ar" is what actually drives the
# frontend's language, not the script/field names below (those stay
# English/ASCII by design - emails, slugs, spec codes, currency, coordinates
# are technical identifiers, not narrative content).
DEMO_USERS = [
    ("owner@truepoint.sa", "سارة العتيبي", Role.OWNER),
    ("consultant@truepoint.sa", "نورة القحطاني", Role.CONSULTANT),
    ("pm@truepoint.sa", "خالد الزهراني", Role.PROJECT_MANAGER),
    ("designer@truepoint.sa", "لينا الرشيد", Role.DESIGNER),
    ("ops@truepoint.sa", "عمليات تروبوينت", Role.ADMIN),
]


class Command(BaseCommand):
    help = "Seed a demo project, one user per role, and sample decisions across every 3-Edges state."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo creates well-known demo credentials - refusing to run with DEBUG=False.")
        project, _ = Project.objects.get_or_create(
            slug="riyadh-tower-phase-1",
            defaults={"name": "برج الرياض - المرحلة الأولى", "description": "مشروع تجريبي لعرض منصة تروبوينت."},
        )

        users = {}
        for email, full_name, role in DEMO_USERS:
            first_name, _, last_name = full_name.partition(" ")
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"username": email, "first_name": first_name, "last_name": last_name, "preferred_language": "ar"},
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
                title="أمر تغيير: إعادة توجيه مجرى الأعمال الميكانيكية (+42,000 ريال، +9 أيام)",
                description="يرصد الاستشاري تعارضاً بين مجرى الأعمال الميكانيكية والعارضة الإنشائية في الطابق 12؛ "
                "يتطلب ذلك إعادة التوجيه وتعديل العقد.",
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
                title="اعتماد الدفعة رقم 4 (1,250,000 ريال)",
                description="اكتمال الهيكل الإنشائي حتى الطابق 15، تم التحقق منه مقابل تقرير الموقع وصور سير العمل.",
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
                title="اعتماد نموذج التشطيبات المعدّل (رخام اللوبي)",
                description="يقترح مدير المشروع استبدال مورد رخام اللوبي بسبب تأخر الاستيراد 6 أسابيع في المادة المحددة بالمواصفات.",
                requested_by=project_manager,
                raci=raci(accountable=consultant, responsible=project_manager, consulted=designer),
                high_stakes=True,
                subject_type="submittal",
            )
            confirm_hearing(d3, consultant)
            record_understanding(
                d3,
                consultant,
                "يرغب مدير المشروع في استبدال مورد رخام اللوبي لأن المورد الأصلي يواجه تأخيراً في الاستيراد لمدة 6 "
                "أسابيع؛ والمورد البديل بنفس الدرجة وبسعر مقارب.",
            )

            # 4. Closed - full 3 Edges walked, low-stakes.
            d4 = request_decision(
                project=project,
                title="جدول ساعات دخول الموقع الأسبوعي خلال رمضان",
                description="تعديل ساعات العمل اليومية في الموقع لشهر رمضان وفق تعليمات الأمانة.",
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
                title="رد على طلب توضيح: مواصفة مثبتات الواجهة الخارجية",
                description="يحتاج مدير المشروع لاعتماد الاستشاري على مواصفة مثبتات الواجهة قبل الطلب - يعيق العمل في الطابق 9.",
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
                title="مراجعة تصميم: واجهة لوبي الطابق 12",
                description="يقدم المصمم واجهة اللوبي المعدّلة لمراجعة واعتماد الاستشاري المعماري.",
                requested_by=designer,
                raci=raci(accountable=consultant, responsible=designer, informed=owner),
                high_stakes=True,
                subject_type="design_review",
            )
            confirm_hearing(d6, consultant)
            record_understanding(
                d6,
                consultant,
                "قام المصمم بتحريك مكتب الاستقبال 1.2 متر لإخلاء خط الرؤية لمخرج الطوارئ، واستبدل تكسية السقف "
                "لتطابق تشطيب القاعدة - يجب إعادة تقديم مخطط السقف المنعكس قبل اعتماد ذلك.",
            )

        self._seed_trust_evidence_rfi_and_handover(project, owner, consultant, project_manager, designer, d2)
        self._seed_contract_payments(project, owner, consultant, project_manager)
        self._seed_access_control_observability_and_platform_api(project, owner, project_manager)

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
        observability.raise_alert(severity="info", source="usage", project=project, message="معدل فتح الملخص الأسبوعي مستقر عند 4 من أصل 5 أعضاء نشطين.")
        observability.record_digest_view(project, owner)
        observability.record_digest_view(project, project_manager)

        # --- Module 14: platform API ---
        raw_key, _ = platform_api.generate_api_key(
            project=project, label="تكامل شريك تجريبي", scope=ApiKeyScope.OWNER, tier=ApiKeyTier.PARTNER, created_by=owner,
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
            submitted_by=project_manager, caption="الهيكل الإنشائي للطابق 15 - الواجهة الجنوبية",
            captured_at=timezone.now() - timedelta(days=2), media_url="https://example.com/evidence/level15-south.jpg",
            latitude=24.7136, longitude=46.6753,
        )
        trust_evidence.verify_evidence(verified, owner)
        trust_evidence.submit_evidence(
            project=project, subject_type="payment_milestone", subject_id=milestone_decision.id,
            submitted_by=project_manager, caption="الهيكل الإنشائي للطابق 15 - الواجهة الشمالية",
            captured_at=timezone.now() - timedelta(hours=6), media_url="https://example.com/evidence/level15-north.jpg",
            latitude=24.7137, longitude=46.6754,
        )  # left unverified on purpose - a pending claim, not yet "counting"

        # --- Module 6: RFI, Change Order & Version Control ---
        answered = rfi_change_control.create_rfi(
            project=project, raised_by=project_manager, title="مواصفة غشاء العزل المائي عند مستوى القاعدة",
            question="ما هي مواصفة غشاء العزل المائي المطبقة على بلاطة القاعدة - المخطط A-204 أم ملحق M-112 المحدث؟",
            respond_by=timezone.now() + timedelta(days=2), location_tag="القاعدة",
        )
        rfi_change_control.respond_to_rfi(answered, consultant, "استخدم مواصفة ملحق M-112 - فهي تحل محل A-204 لهذه المنطقة.")

        rfi_change_control.create_rfi(
            project=project, raised_by=project_manager, title="توضيح تصنيف مقاومة الحريق لمجرى المصعد",
            question="ما هو متطلب تصنيف مقاومة الحريق لجدار مجرى المصعد في الطوابق 8-10 - ساعتان أم 3 ساعات وفق المراجعة المحدثة للكود؟",
            respond_by=timezone.now() + timedelta(hours=6), schedule_impact_days=4, location_tag="النواة، الطوابق 8-10",
        )  # inside the at-risk window

        rfi_change_control.create_rfi(
            project=project, raised_by=project_manager, title="تباعد ركائز الواجهة الستائرية",
            question="ما هو تباعد الركائز للواجهة الستائرية في الواجهة الشرقية؟ ورقة المواصفات غير واضحة بين 600مم و900مم من المركز.",
            respond_by=timezone.now() - timedelta(days=1), schedule_impact_days=6, location_tag="الواجهة الشرقية",
        )
        rfi_change_control.flag_silent_rfis(project=project)

        rfi_change_control.create_change_order(
            project=project, raised_by=consultant, title="ترقية غشاء العزل المائي في القاعدة",
            baseline_scope="غشاء بيتوميني قياسي وفق المواصفة الأصلية A-204",
            scope_delta="ترقية إلى نظام غشاء ملحق M-112 على كامل بلاطة القاعدة وفق رد طلب التوضيح",
            cost_impact="18500.00", schedule_impact_days=3, evidence_ref=f"evidence:{verified.id}",
        )
        rfi_change_control.create_submittal(
            project=project, submitted_by=designer, title="رخام اللوبي - عينة مورد بديل",
            spec_section="09 30 00", description="تم تقديم عينة من مورد بديل لتشطيب رخام اللوبي.",
        )
        rfi_change_control.create_permit(project=project, title="تمديد أعمال الحفر في القاعدة", authority="أمانة منطقة الرياض", permit_number="RY-2026-8841")
        rfi_change_control.create_supplier_delivery(
            project=project, material="وحدات زجاج الواجهة الستائرية (الواجهة الشرقية)", supplier_name="شركة الخليج لصناعة الزجاج",
            committed_date=timezone.now().date() - timedelta(days=3),
        )  # already at-risk: committed date passed, not yet delivered
        rfi_change_control.create_quality_checkpoint(
            project=project, title="فحص حديد التسليح قبل الصب - الطابق 16", inspector=consultant,
            milestone_ref="صب بلاطة الطابق 16", location_tag="الطابق 16",
        )
        thread = rfi_change_control.create_coordination_thread(
            project=project, created_by=project_manager, location_tag="الطابق 9، مجرى الأعمال الميكانيكية",
            title="تعارض مجرى التكييف مع العارضة الإنشائية", opening_message="مسار مجرى التكييف يتعارض مع عارضة النقل في الطابق 9 - نحتاج إلى تنسيق بين الإنشائي والميكانيكي على المسار قبل الصب.",
        )
        rfi_change_control.post_coordination_message(thread, consultant, "يمكن للإنشائي إزاحة فتحة العارضة 200مم شمالاً - جاري التأكيد مع المهندس المسؤول اليوم.")

        # --- Module 7: Handover & Post-Handover ---
        handover.record_practical_completion(
            project=project, practical_completion_date=date.today() - timedelta(days=180), recorded_by=owner
        )
        handover.create_punch_list_item(project=project, raised_by=project_manager, unit_or_zone="الوحدة 4B", title="بلاط مكسور عند مدخل المطبخ")
        pending_item = handover.create_punch_list_item(project=project, raised_by=project_manager, unit_or_zone="الوحدة 4B", title="لمسة دهان في جدار الصالة")
        handover.request_closure_signoff(pending_item, requested_by=project_manager, accountable_user=owner)
        closed_item = handover.create_punch_list_item(project=project, raised_by=project_manager, unit_or_zone="اللوبي", title="خدوش على أرضية اللوبي")
        closed_decision = handover.request_closure_signoff(closed_item, requested_by=project_manager, accountable_user=owner)
        confirm_hearing(closed_decision, owner)
        record_agreement(closed_decision, owner)
        handover.sync_closure_from_decision(closed_item)

        handover.create_om_item(project=project, category="التكييف والتهوية", description_en="Chiller unit maintenance manual", description_ar="دليل صيانة وحدة التبريد", document_ref="https://example.com/om/chiller-manual.pdf")
        verified_om = handover.create_om_item(project=project, category="السلامة من الحريق", description_en="Fire alarm panel commissioning certificate", description_ar="شهادة تشغيل لوحة إنذار الحريق")
        handover.verify_om_item(verified_om, consultant)

        handover.report_defect(project=project, reported_by=owner, unit_or_zone="الوحدة 4B", title="تسرب مياه أسفل حوض المطبخ")
        resolved_defect = handover.report_defect(project=project, reported_by=owner, unit_or_zone="الوحدة 7A", title="ضوضاء صادرة من وحدة التكييف")
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
            title="عقد التصميم والبناء - برج الرياض المرحلة الأولى",
            contract_value="25000000.00",
            currency="SAR",
            scope_baseline=(
                "عقد تصميم وبناء لبرج متعدد الاستخدامات من 22 طابقاً (قاعدة من طابقين + 20 طابقاً نموذجياً + طابق "
                "ميكانيكي على السطح) على طريق الملك فهد بالرياض: الهيكل الإنشائي، الأنظمة الكهروميكانيكية، الواجهة "
                "الستائرية، تشطيبات المناطق العامة، والأعمال الخارجية، وفقاً لمجموعة المخططات المعمارية والإنشائية "
                "المعتمدة (المراجعة C)."
            ),
            plain_arabic_summary=(
                "قيمة العقد الإجمالية 25,000,000 ريال سعودي لتنفيذ برج سكني/تجاري من 22 طابقاً على طريق "
                "الملك فهد بالرياض. يُصرف المبلغ على 10 دفعات مرتبطة بمراحل الإنجاز الفعلي في الموقع، مع "
                "احتجاز 10% من كل دفعة كضمان حسن التنفيذ حتى انتهاء فترة المسؤولية العشرية."
            ),
            retention_percentage="10.00",
            ceiling_threshold_percentage="10.00",
        )

        # Progress-payment schedule for a tower already through practical
        # completion (handover was recorded 180 days ago) - every milestone
        # but the final retention release has real verified evidence behind
        # it, walked through the actual submit -> verify -> release path.
        schedule = [
            ("التعبئة وتجهيز الموقع", "تجهيز الموقع، السياج، وتأمين تصاريح الحفر والدعم", "1000000.00", 720, "مجمع الموقع"),
            ("اكتمال الحفر والدعم", "اكتمال أعمال الحفر والدعم حتى منسوب التأسيس", "1500000.00", 660, "البدروم"),
            ("اكتمال الأساسات وبلاطة اللبشة", "صب ومعالجة أساسات اللبشة وبلاطة البدروم", "2000000.00", 600, "البدروم"),
            ("اكتمال الهيكل الإنشائي حتى الطابق 15", "اكتمال الهيكل الإنشائي حتى الطابق 15، تم التحقق منه مقابل تقرير الموقع وصور سير العمل", "1250000.00", 380, "الطابق 15"),
            ("تسقيف الهيكل الإنشائي (الطابق 22)", "اكتمال الهيكل الإنشائي حتى الطابق 22، بما في ذلك الطابق الميكانيكي على السطح", "2750000.00", 300, "الطابق 22"),
            ("اكتمال التمديدات الكهروميكانيكية الأولية", "اكتمال التمديدات الأولية للأنظمة الكهروميكانيكية في جميع الطوابق النموذجية", "3500000.00", 260, "النواة، جميع الطوابق"),
            ("اكتمال الواجهة الستائرية", "اكتمال تركيب الواجهة الستائرية والتكسية الخارجية على جميع الواجهات", "4000000.00", 230, "الواجهة الشرقية"),
            ("اكتمال التشطيبات الداخلية", "اكتمال التشطيبات الداخلية في نطاق المناطق العامة", "5000000.00", 200, "اللوبي، الطابق 12"),
            ("الاختبار والتشغيل والتسليم الابتدائي", "اكتمال الاختبار والتشغيل؛ صدور شهادة التسليم الابتدائي", "3000000.00", 182, "المبنى بالكامل"),
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
            contract=contract, name="الإفراج النهائي عن الضمان",
            due_condition="الإفراج عن نسبة 10% ضمان حسن التنفيذ عند انتهاء فترة المسؤولية العشرية",
            amount="1000000.00",
        )

        # The podium waterproofing change order (already seeded above) is
        # approved and rolled into the contract via a signed amendment -
        # exercises the contract-vs-actual tracker with a real approved
        # change order, and Module 12's digital signing path end to end.
        change_order = ChangeOrder.objects.get(project=project, title="ترقية غشاء العزل المائي في القاعدة")
        change_order.status = DocumentLifecycleStatus.APPROVED
        change_order.save(update_fields=["status", "updated_at"])

        amendment = contract_payments.request_contract_signing(
            contract=contract, requested_by=project_manager, version_number=1,
            summary="إدراج أمر التغيير المعتمد لترقية غشاء العزل المائي في القاعدة (+18,500.00 ريال / +3 أيام) ضمن العقد.",
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
            "يضيف هذا التعديل ترقية غشاء العزل المائي للقاعدة إلى العقد بقيمة +18,500.00 ريال ومدة +3 أيام، "
            "تُموَّل من بند الطوارئ الحالي - دون أي تغيير على تاريخ الإنجاز الكلي.",
        )
        record_agreement(signing_decision, owner)

        contract_payments.ingest_contract_for_legal_agent(contract)

        tracker = contract_payments.get_contract_vs_actual(project)
        self.stdout.write(
            f"  contract: {contract.title} - SAR {tracker['paid_to_date']:,} released of "
            f"SAR {tracker['adjusted_contract_value']:,} adjusted value "
            f"({released_count} milestones released, 1 pending)"
        )
