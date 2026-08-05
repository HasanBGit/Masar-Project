from django.conf import settings
from django.db import models
from pgvector.django import HnswIndex, VectorField

from core.models import DocumentLifecycleStatus, Project, TimeStampedModel

# Must match the output dimension of whatever model _embed() in services.py
# calls (voyage-3 -> 1024). Changing embedding models later means a new
# migration to resize this column, plus a full re-ingest of every project's
# LegalAgentDocument rows - the two are coupled by design, not accidentally.
LEGAL_AGENT_EMBEDDING_DIMENSIONS = 1024


class Contract(TimeStampedModel):
    """
    Structured contract record per skills/contract-payments/SKILL.md: payment
    schedule, milestone definitions, and scope baseline are queryable data,
    not just an attached PDF. The PDF is still kept (`source_file`) as the
    signed reference document, alongside the structured fields.
    """

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="contract")
    title = models.CharField(max_length=255)
    contract_value = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="SAR")
    scope_baseline = models.TextField(help_text="Baseline scope of work the contract value covers.")
    source_file = models.FileField(upload_to="contracts/%Y/%m/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=DocumentLifecycleStatus.choices, default=DocumentLifecycleStatus.DRAFT)

    plain_arabic_summary = models.TextField(
        blank=True,
        help_text="Owner-friendly Arabic summary of payment schedule, warranty period, and scope boundaries - same pattern as owner-dashboard's drawing/spec summary layer.",
    )

    retention_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Percentage of each milestone payment withheld as retention until the decennial liability window.",
    )

    ceiling_threshold_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=10,
        help_text="Cumulative spend (paid + approved change orders) beyond this % over contract_value triggers a ceiling alert.",
    )

    class Meta:
        indexes = [models.Index(fields=["project", "status"])]

    def __str__(self):
        return f"{self.title} ({self.project})"


class PaymentMilestoneStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RELEASED = "released", "Released"


class PaymentMilestone(TimeStampedModel):
    """
    One milestone in the contract's payment schedule. `release_payment_milestone`
    (services.py) is the only path that flips status to RELEASED - it gates on
    trust_evidence's verified-evidence state, per the "no teeth without Module 5"
    cross-module dependency documented in the skill.
    """

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="payment_milestones")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="payment_milestones")
    name = models.CharField(max_length=255)
    due_condition = models.TextField(help_text='e.g. "40% structural completion"')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    retention_held = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=PaymentMilestoneStatus.choices, default=PaymentMilestoneStatus.PENDING)
    released_at = models.DateTimeField(null=True, blank=True)
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["project", "status"])]

    def __str__(self):
        return f"{self.name} ({self.amount} {self.contract.currency})"

    @property
    def evidence_subject_type(self) -> str:
        """subject_type/subject_id pair this milestone is filed under in trust_evidence's generic evidence ledger."""
        return "payment_milestone"


class ZatcaInvoiceStatus(models.TextChoices):
    NOT_CONFIGURED = "not_configured", "Not configured"
    PENDING_SUBMISSION = "pending_submission", "Pending submission"
    CLEARED = "cleared", "Cleared"
    REJECTED = "rejected", "Rejected"


class Invoice(TimeStampedModel):
    """
    ZATCA Fatoora Phase 2 e-invoice generated from a verified payment
    milestone - see skills/contract-payments/references/zatca-fatoora-compliance.md.
    `xml_payload`/`qr_code_data` are left blank with status NOT_CONFIGURED
    until real XML generation, digital signing, and ZATCA API submission are
    implemented against ZATCA's current published spec - deliberately not
    fabricated here (the reference doc explicitly warns not to hardcode
    compliance detail from a static summary).
    """

    milestone = models.OneToOneField(PaymentMilestone, on_delete=models.CASCADE, related_name="invoice")
    zatca_status = models.CharField(max_length=20, choices=ZatcaInvoiceStatus.choices, default=ZatcaInvoiceStatus.NOT_CONFIGURED)
    xml_payload = models.TextField(blank=True, help_text="UBL 2.1 XML - populated once ZATCA integration is implemented.")
    qr_code_data = models.TextField(blank=True)
    submitted_to_zatca_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Invoice for {self.milestone} ({self.zatca_status})"


class ContractAmendment(TimeStampedModel):
    """
    Amendment log entry. Signing/approval itself routes through
    approvals.services.request_decision (the same e-signature/audit
    infrastructure as every other approval) - `decision_id` is that
    Decision's primary key, not a duplicate approval mechanism.
    """

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="amendments")
    version_number = models.PositiveIntegerField()
    summary = models.TextField()
    decision_id = models.PositiveIntegerField(null=True, blank=True, help_text="approvals.Decision.id routing the signature.")
    document_file = models.FileField(upload_to="contract_amendments/%Y/%m/", blank=True, null=True)

    class Meta:
        ordering = ["version_number"]
        constraints = [
            models.UniqueConstraint(fields=["contract", "version_number"], name="unique_amendment_version_per_contract")
        ]

    def __str__(self):
        return f"{self.contract.title} amendment v{self.version_number}"


class LegalAgentDocument(TimeStampedModel):
    """
    A retrieval chunk for the contract legal-agent chatbot: either a piece
    of this project's own contract data, or a static reference doc bundled
    in the repo (e.g. the ZATCA compliance summary). `embedding` is a real
    pgvector column - Supabase Postgres ships the `vector` extension, so
    this is a natural fit for deployment there rather than an extra managed
    vector-DB service. Retrieval is a DB-side cosine-distance query (see
    services.py's `_retrieve_top_chunks`), not an in-Python scan.
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="legal_agent_documents")
    source_ref = models.CharField(max_length=255, help_text='e.g. "contract:14:payment_schedule" or "zatca-fatoora-compliance.md"')
    content = models.TextField()
    embedding = VectorField(dimensions=LEGAL_AGENT_EMBEDDING_DIMENSIONS, null=True, blank=True)
    embedding_model = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["project"]),
            HnswIndex(
                name="legal_agent_doc_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self):
        return f"{self.source_ref} ({len(self.content)} chars)"
