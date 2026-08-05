import secrets

from django.conf import settings
from django.db import models

from core.models import Project, TimeStampedModel


class ApiKeyScope(models.TextChoices):
    """Mirrors accounts.Role's values (not a cross-app model import - just the same vocabulary for API scoping)."""

    OWNER = "owner", "Owner (full project data)"
    INVESTOR = "investor", "Investor (aggregate/high-stakes only)"
    CONSULTANT = "consultant", "Consultant"
    CONTRACTOR = "contractor", "Contractor"


class ApiKeyTier(models.TextChoices):
    STANDARD = "standard", "Standard - 100 requests/hour"
    PARTNER = "partner", "Partner - 1000 requests/hour"


TIER_RATES = {
    ApiKeyTier.STANDARD: "100/hour",
    ApiKeyTier.PARTNER: "1000/hour",
}


class APIKey(TimeStampedModel):
    """
    Public-API auth, scoped per project and per role (mirroring
    owner-dashboard's role-view model) - a consultant-scoped key shouldn't
    see owner-only data any more than a logged-in consultant user would.
    The raw key is shown to the caller exactly once at creation time; only
    its hash is ever stored.
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="api_keys")
    label = models.CharField(max_length=100)
    scope = models.CharField(max_length=20, choices=ApiKeyScope.choices)
    tier = models.CharField(max_length=20, choices=ApiKeyTier.choices, default=ApiKeyTier.STANDARD)
    key_prefix = models.CharField(max_length=8, editable=False)
    key_hash = models.CharField(max_length=64, unique=True, editable=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["key_hash"])]

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None

    def __str__(self):
        return f"{self.label} ({self.key_prefix}…, {self.scope})"


class WebhookEventType(models.TextChoices):
    APPROVAL_REQUESTED = "approval.requested", "Approval requested"
    EVIDENCE_VERIFIED = "evidence.verified", "Evidence verified"
    CONTRACTOR_OVERDUE = "contractor.overdue", "Contractor overdue"


class WebhookSubscription(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="webhook_subscriptions")
    target_url = models.URLField()
    event_types = models.JSONField(default=list, help_text="List of WebhookEventType values to receive.")
    secret = models.CharField(max_length=64, editable=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.secret:
            self.secret = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.target_url} ({len(self.event_types)} event types)"


class WebhookDeliveryStatus(models.TextChoices):
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed - will retry"
    DEAD_LETTER = "dead_letter", "Dead letter - retries exhausted"


MAX_WEBHOOK_ATTEMPTS = 5


class WebhookDelivery(TimeStampedModel):
    subscription = models.ForeignKey(WebhookSubscription, on_delete=models.CASCADE, related_name="deliveries")
    event_type = models.CharField(max_length=64)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=16, choices=WebhookDeliveryStatus.choices, default=WebhookDeliveryStatus.FAILED)
    attempt_count = models.PositiveIntegerField(default=0)
    last_attempted_at = models.DateTimeField(null=True, blank=True)
    last_response_code = models.IntegerField(null=True, blank=True)
    last_error = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["subscription", "status"])]

    def __str__(self):
        return f"{self.event_type} -> {self.subscription.target_url} ({self.status})"
