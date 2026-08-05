from django.conf import settings
from django.db import models

from core.models import Project, TimeStampedModel


class ActorRole(models.TextChoices):
    """Snapshot at event time - never a live FK to a role that might change later."""

    OWNER = "owner", "Owner"
    INVESTOR = "investor", "Investor"
    CONSULTANT = "consultant", "Consultant"
    CONTRACTOR = "contractor", "Contractor"
    SUBCONTRACTOR = "subcontractor", "Subcontractor"
    FOREMAN = "foreman", "Foreman"
    LABORER = "laborer", "Laborer"
    PMC = "pmc", "PMC"
    SAN3_STAFF = "san3_staff", "San3 staff"
    SYSTEM = "system", "System"


class Channel(models.TextChoices):
    WHATSAPP = "whatsapp", "WhatsApp"
    EMAIL = "email", "Email"
    VOICE_CALL = "voice_call", "Voice call"
    PLATFORM_UI = "platform_ui", "Platform UI"
    SYSTEM = "system", "System"


class AuditEvent(TimeStampedModel):
    """
    The audit log as a first-class object - see
    skills/trust-evidence/references/audit-log-schema.md for the full
    contract this model implements. Append-only: no update/delete path in
    normal operation, only new events (corrections are new events, not
    edits to history) - that's what makes exports tamper-evident.

    Every other app writes here exclusively through `services.record_event`
 - never by creating an AuditEvent row directly.
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    actor_role = models.CharField(max_length=20, choices=ActorRole.choices, blank=True)
    event_type = models.CharField(max_length=64)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.PLATFORM_UI)
    subject_type = models.CharField(max_length=64, blank=True)
    subject_id = models.CharField(max_length=64, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    source_message_ref = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["subject_type", "subject_id"]),
            models.Index(fields=["project", "-created_at"]),
            models.Index(fields=["actor"]),
        ]

    def __str__(self):
        return f"{self.event_type} on {self.subject_type}:{self.subject_id} by {self.actor}"


class EvidenceRecord(TimeStampedModel):
    """
    The verified milestone ledger. A submission alone is a *pending claim*
 - it only "counts" once a verifier explicitly acknowledges it (see
    `verified`/`verified_by`/`verified_at`). Attaches generically
    (subject_type/subject_id) to whatever it's evidence for (a milestone, a
    change order, a quality checkpoint, ...) - trust_evidence never imports
    those apps' models.
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="evidence_records")
    subject_type = models.CharField(max_length=64)
    subject_id = models.CharField(max_length=64)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    caption = models.CharField(max_length=255)
    media_url = models.URLField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    captured_at = models.DateTimeField()

    verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-captured_at"]
        indexes = [models.Index(fields=["subject_type", "subject_id"])]

    def __str__(self):
        return f"Evidence for {self.subject_type}:{self.subject_id} ({'verified' if self.verified else 'pending'})"


class SilenceFlag(TimeStampedModel):
    """
    Overdue-update / contractor-silence detection. "Silence is data": an
    unanswered RFI, a quiet permit submission, a missed contractor update
    are the same shape of problem - no update arrived by the expected time.
    Created by `services.flag_if_silent`, resolved when activity resumes.
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="silence_flags")
    subject_type = models.CharField(max_length=64)
    subject_id = models.CharField(max_length=64)
    expected_by = models.DateTimeField()
    flagged_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-flagged_at"]
        constraints = [
            # Only one *open* silence flag per subject at a time - resolving
            # one and a fresh breach later creates a new row, not a reopen.
            models.UniqueConstraint(
                fields=["subject_type", "subject_id"],
                condition=models.Q(resolved=False),
                name="one_open_silence_flag_per_subject",
            )
        ]
        indexes = [models.Index(fields=["project", "resolved"])]

    def __str__(self):
        return f"Silence flag on {self.subject_type}:{self.subject_id} ({'resolved' if self.resolved else 'open'})"
