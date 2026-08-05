from django.conf import settings
from django.db import models

from core.models import DocumentLifecycleStatus, Project, TimeStampedModel, TrackedItem


class DocumentTrackedItem(TrackedItem):
    """
    Shared base for every object in this app's "Owns" list (RFI, Submittal,
    ChangeOrder, Permit, SupplierDelivery, QualityCheckpoint) - all six
    carry the *same* document lifecycle enum rather than each redefining
    status, per skills/rfi-change-control/SKILL.md: "don't redefine status
    fields per model."
    """

    STATUS_CHOICES = DocumentLifecycleStatus.choices
    TERMINAL_STATUSES = frozenset(
        {DocumentLifecycleStatus.APPROVED, DocumentLifecycleStatus.SUPERSEDED, DocumentLifecycleStatus.ARCHIVED}
    )

    class Meta:
        abstract = True


class RFI(DocumentTrackedItem):
    """
    Request for Information. `sla_deadline` (inherited) doubles as the
    "respond by" deadline that drives the at-risk cascade view - 
    `schedule_impact_days` is what a breach actually costs the schedule.
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="rfis")
    number = models.CharField(max_length=32)
    title = models.CharField(max_length=255)
    question = models.TextField()
    response = models.TextField(blank=True)
    schedule_impact_days = models.PositiveIntegerField(
        default=0, help_text="Schedule slip if this RFI goes unanswered by the SLA deadline."
    )
    location_tag = models.CharField(max_length=100, blank=True)
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["sla_deadline"]
        indexes = [models.Index(fields=["project", "status"])]
        constraints = [models.UniqueConstraint(fields=["project", "number"], name="unique_rfi_number_per_project")]

    def __str__(self):
        return f"RFI {self.number}: {self.title}"


class Submittal(DocumentTrackedItem):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="submittals")
    title = models.CharField(max_length=255)
    spec_section = models.CharField(max_length=64, blank=True)
    description = models.TextField(blank=True)
    revision_number = models.PositiveIntegerField(default=1)
    current_as_of = models.DateTimeField(help_text="Revision timestamp - mandatory on every versioned document view.")
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        indexes = [models.Index(fields=["project", "status"])]

    def __str__(self):
        return f"{self.title} (rev {self.revision_number})"


class ChangeOrder(DocumentTrackedItem):
    """
    Structured change-order form - baseline scope + delta + cost/schedule
    impact + evidence reference, never free text alone (enforced at the
    serializer layer: these fields are required, not optional).
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="change_orders")
    title = models.CharField(max_length=255)
    baseline_scope = models.TextField()
    scope_delta = models.TextField()
    cost_impact = models.DecimalField(max_digits=12, decimal_places=2)
    schedule_impact_days = models.IntegerField()
    evidence_ref = models.CharField(max_length=255, blank=True, help_text="Pointer to a trust_evidence EvidenceRecord or equivalent.")
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        indexes = [models.Index(fields=["project", "status"])]

    def __str__(self):
        return f"{self.title} ({self.cost_impact:+} / {self.schedule_impact_days:+}d)"


class Permit(DocumentTrackedItem):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="permits")
    title = models.CharField(max_length=255)
    authority = models.CharField(max_length=100, default="Balady")
    permit_number = models.CharField(max_length=64, blank=True)
    current_as_of = models.DateTimeField()

    class Meta:
        indexes = [models.Index(fields=["project", "status"])]

    def __str__(self):
        return f"{self.title} ({self.authority})"


class SupplierDelivery(DocumentTrackedItem):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="supplier_deliveries")
    material = models.CharField(max_length=255)
    supplier_name = models.CharField(max_length=255)
    committed_date = models.DateField()

    class Meta:
        indexes = [models.Index(fields=["project", "status"])]

    def __str__(self):
        return f"{self.material} from {self.supplier_name}"


class QualityCheckpoint(DocumentTrackedItem):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="quality_checkpoints")
    title = models.CharField(max_length=255)
    milestone_ref = models.CharField(max_length=128, blank=True)
    location_tag = models.CharField(max_length=100, blank=True)
    inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        indexes = [models.Index(fields=["project", "status"])]

    def __str__(self):
        return self.title


class CoordinationThread(TimeStampedModel):
    """Location-tagged cross-trade coordination thread for on-site sequencing conflicts."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="coordination_threads")
    location_tag = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["project", "location_tag"])]

    def __str__(self):
        return f"[{self.location_tag}] {self.title}"


class CoordinationMessage(TimeStampedModel):
    thread = models.ForeignKey(CoordinationThread, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    body = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.author} on {self.thread_id}"
