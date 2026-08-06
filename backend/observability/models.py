from django.conf import settings
from django.db import models

from core.models import Project, TimeStampedModel


class IntegrationType(models.TextChoices):
    """
    The three integrations named in skills/observability/SKILL.md. Note:
    this module *polls/aggregates* their health - it doesn't own the
    integrations themselves (field-capture owns WhatsApp, unified-timeline
    owns email OAuth/government-portal), and neither of those modules is
    built yet in this codebase. Until they exist, health is reported here
    via `services.report_integration_health(...)`, which those modules
    would call once built; there is no live WhatsApp/email connection
    behind this - treat any seeded status as a labeled simulation, not a
    real integration probe.
    """

    WHATSAPP_SESSION = "whatsapp_session", "WhatsApp session"
    EMAIL_OAUTH = "email_oauth", "Email OAuth"
    GOVERNMENT_PORTAL = "government_portal", "Government portal (Balady)"


class HealthStatus(models.TextChoices):
    HEALTHY = "healthy", "Healthy"
    DEGRADED = "degraded", "Degraded"
    DOWN = "down", "Down"


class IntegrationHealthCheck(TimeStampedModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="integration_health_checks", null=True, blank=True,
        help_text="Null for a platform-wide integration (e.g. a shared government-portal connector).",
    )
    integration_type = models.CharField(max_length=32, choices=IntegrationType.choices)
    status = models.CharField(max_length=16, choices=HealthStatus.choices, default=HealthStatus.HEALTHY)
    last_checked_at = models.DateTimeField(auto_now=True)
    last_error = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "integration_type"], name="one_health_row_per_project_integration"),
            # Postgres treats NULLs as distinct in unique constraints, so the
            # constraint above never dedupes platform-wide (project IS NULL)
            # rows - this partial constraint does.
            models.UniqueConstraint(
                fields=["integration_type"],
                condition=models.Q(project__isnull=True),
                name="one_health_row_per_platform_integration",
            ),
        ]
        indexes = [models.Index(fields=["integration_type", "status"])]

    def __str__(self):
        return f"{self.integration_type} - {self.status}"


class AlertSeverity(models.TextChoices):
    INFO = "info", "Info"
    WARNING = "warning", "Warning"
    CRITICAL = "critical", "Critical"


class AlertEvent(TimeStampedModel):
    """
    Internal alerting - routed to Truepoint's own ops team, distinct from any
    customer-facing notification (per skill: "a banned WhatsApp session
    should page Truepoint before it pages a customer"). No real paging
    integration (PagerDuty/Opsgenie) is wired up here - this is the
    internal alert queue a paging webhook would consume; see README.
    """

    severity = models.CharField(max_length=10, choices=AlertSeverity.choices)
    source = models.CharField(max_length=64, help_text="Which signal category raised this, e.g. 'integration_health', 'sla_compliance', 'security'.")
    message = models.CharField(max_length=500)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="alerts", null=True, blank=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["severity", "acknowledged"])]

    def __str__(self):
        return f"[{self.severity}] {self.source}: {self.message}"


class DigestOpenEvent(TimeStampedModel):
    """Usage/adoption signal: was the daily/weekly digest actually opened - see dashboard.views.DashboardSummaryView."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="digest_opens")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")

    class Meta:
        indexes = [models.Index(fields=["project", "created_at"])]
