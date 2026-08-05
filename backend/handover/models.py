from django.conf import settings
from django.db import models

from core.models import Project, TimeStampedModel, TrackedItem

DECENNIAL_LIABILITY_YEARS = 10


def _add_years(d, years: int):
    try:
        return d.replace(year=d.year + years)
    except ValueError:
        # Feb 29 on a start date whose +N year isn't a leap year.
        return d.replace(month=2, day=28, year=d.year + years)


class HandoverRecord(TimeStampedModel):
    """Practical completion date + the decennial liability window it opens - one per project."""

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="handover_record")
    practical_completion_date = models.DateField()
    decennial_liability_expires_at = models.DateField(editable=False)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    def save(self, *args, **kwargs):
        self.decennial_liability_expires_at = _add_years(self.practical_completion_date, DECENNIAL_LIABILITY_YEARS)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Handover for {self.project} on {self.practical_completion_date}"


class PunchListStatus(models.TextChoices):
    OPEN = "open", "Open"
    PENDING_SIGNOFF = "pending_signoff", "Pending owner sign-off"
    VERIFIED_CLOSED = "verified_closed", "Verified closed"


class PunchListItem(TrackedItem):
    """A snag, scoped to a specific unit/zone - never just top-level project (per skill rule)."""

    STATUS_CHOICES = PunchListStatus.choices
    TERMINAL_STATUSES = frozenset({PunchListStatus.VERIFIED_CLOSED})

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="punch_list_items")
    unit_or_zone = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["unit_or_zone", "created_at"]
        indexes = [models.Index(fields=["project", "unit_or_zone", "status"])]

    def __str__(self):
        return f"[{self.unit_or_zone}] {self.title}"


class OMChecklistItem(TimeStampedModel):
    """Owner-verifiable O&M documentation, item by item - not a static PDF dump."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="om_checklist_items")
    category = models.CharField(max_length=100)
    description_en = models.CharField(max_length=255)
    description_ar = models.CharField(max_length=255, blank=True)
    document_ref = models.CharField(max_length=255, blank=True, help_text="Pointer to the actual O&M document/manual.")
    installed_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["category", "description_en"]

    def __str__(self):
        return f"{self.category}: {self.description_en}"


class PostHandoverStatus(models.TextChoices):
    REPORTED = "reported", "Reported"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    RESOLVED = "resolved", "Resolved"


class PostHandoverDefect(TrackedItem):
    """Outlives the project's active phase - never archived/soft-deleted while inside the liability window."""

    STATUS_CHOICES = PostHandoverStatus.choices
    TERMINAL_STATUSES = frozenset({PostHandoverStatus.RESOLVED})

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="post_handover_defects")
    unit_or_zone = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["project", "status"])]

    def __str__(self):
        return f"[{self.unit_or_zone}] {self.title}"
