from django.conf import settings
from django.db import models
from django.utils import timezone


class DocumentLifecycleStatus(models.TextChoices):
    """
    The uniform status enum for every *document*-shaped tracked object
    (RFI, submittal, change order, permit, supplier delivery, quality
    checkpoint - see skills/rfi-change-control/SKILL.md). Defined once here
    per platform-architecture.md rather than redefined per model. Not every
    TrackedItem subclass uses this enum (e.g. approvals.Decision has its
    own 3-Edges states) - this one is specifically for versioned documents.
    """

    DRAFT = "draft", "Draft"
    UNDER_REVIEW = "under_review", "Under review"
    APPROVED = "approved", "Approved"
    SUPERSEDED = "superseded", "Superseded"
    ARCHIVED = "archived", "Archived"


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Project(TimeStampedModel):
    """Shared project entity every feature module attaches to via FK."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class TrackedItem(TimeStampedModel):
    """
    Shared "tracked object" shape per
    skills/platform-guidelines/references/platform-architecture.md:
    status + owner/assigned_approver + SLA deadline + escalation state.

    Subclasses (e.g. approvals.Decision) define their own `STATUS_CHOICES`
    and override `status`'s choices - the field's *shape* (a status string
    with an SLA deadline and escalation timestamp) is the shared contract;
    subclasses must not change what `status` conceptually represents
    (Liskov: still "where this item is in its lifecycle").

    `TERMINAL_STATUSES` is the one thing every subclass must set: the
    status values past which `is_overdue` is always False (closed/resolved/
    archived items are never "overdue"). Kept as a class attribute rather
    than a method so subclasses declare it as plain data next to their
    own status enum.
    """

    TERMINAL_STATUSES: frozenset = frozenset()

    status = models.CharField(max_length=32)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+", null=True, blank=True
    )
    assigned_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+", null=True, blank=True
    )
    sla_deadline = models.DateTimeField(null=True, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    @property
    def is_overdue(self) -> bool:
        if self.status in self.TERMINAL_STATUSES:
            return False
        return bool(self.sla_deadline and timezone.now() > self.sla_deadline)
