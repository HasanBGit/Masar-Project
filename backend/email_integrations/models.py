from django.conf import settings
from django.db import models

from core.models import Project, TimeStampedModel

# The subject_type approvals.Decision rows use when a decision was created
# from a synced email - a generic (subject_type, subject_ref) pair per
# approvals-workflow's app-boundary rule, never a direct FK into this app.
EMAIL_SUBJECT_TYPE = "inbox_email"


class EmailCategory(models.TextChoices):
    RFI = "rfi", "Request for Information"
    SUBMITTAL = "submittal", "Submittal / Shop Drawing"
    PAYMENT = "payment", "Payment Application"
    SAFETY = "safety", "Safety & Hazard Alert"
    GENERAL = "general", "General"


# Categories that create an Inbox Decision (read-and-act, SLA-gated).
# GENERAL mail is synced and shown but doesn't demand a decision.
ACTION_REQUIRED_CATEGORIES = frozenset(
    {EmailCategory.RFI, EmailCategory.SUBMITTAL, EmailCategory.PAYMENT, EmailCategory.SAFETY}
)


class OAuthState(TimeStampedModel):
    """
    A single-use, unguessable token minted in get_authorize_url and consumed
    in connect_account - the OAuth 'state' parameter's actual job (anti-CSRF
    on the authorization-code flow), not project.id in disguise. Binds the
    eventual callback to the user+project that started the flow so the
    request body's `project` field can never be trusted on its own.
    """

    state = models.CharField(max_length=64, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="+")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")

    class Meta:
        indexes = [models.Index(fields=["state"])]

    def __str__(self):
        return f"OAuthState for {self.user} / {self.project}"


class EmailAccount(TimeStampedModel):
    """
    One connected Gmail account per project. Tokens are stored in plain
    TextField columns - fine for this MVP pass (matches this codebase's
    other flagged dev-only gaps, e.g. drawings_studio's local MEDIA_ROOT);
    production would need field-level encryption (e.g. django-fernet-fields)
    before real refresh tokens land here.
    """

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="email_account")
    email_address = models.EmailField()
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField()
    token_expires_at = models.DateTimeField(null=True, blank=True)
    connected_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    last_synced_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.email_address} ({self.project})"


class EmailMessage(TimeStampedModel):
    """A synced Gmail message, classified into a project-relevant category."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="email_messages")
    gmail_message_id = models.CharField(max_length=64)
    gmail_thread_id = models.CharField(max_length=64, blank=True)
    from_address = models.EmailField()
    subject = models.CharField(max_length=500, blank=True)
    snippet = models.TextField(blank=True)
    category = models.CharField(max_length=16, choices=EmailCategory.choices, default=EmailCategory.GENERAL)
    requires_action = models.BooleanField(default=False)
    received_at = models.DateTimeField()
    read_at = models.DateTimeField(null=True, blank=True)
    read_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["-received_at"]
        constraints = [
            models.UniqueConstraint(fields=["project", "gmail_message_id"], name="one_row_per_gmail_message")
        ]
        indexes = [models.Index(fields=["project", "received_at"])]

    def __str__(self):
        return f"{self.subject} ({self.project})"
