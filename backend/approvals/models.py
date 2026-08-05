from django.conf import settings
from django.db import models
from django.db.models import Q

from core.models import Project, TimeStampedModel, TrackedItem


class DecisionStatus(models.TextChoices):
    HEARING = "hearing", "Hearing"
    UNDERSTANDING = "understanding", "Understanding"
    AGREEING = "agreeing", "Agreeing"
    CLOSED = "closed", "Closed"
    ESCALATED = "escalated", "Escalated"


class RaciRole(models.TextChoices):
    RESPONSIBLE = "R", "Responsible"
    ACCOUNTABLE = "A", "Accountable"
    CONSULTED = "C", "Consulted"
    INFORMED = "I", "Informed"


class EscalationRule(TimeStampedModel):
    """Per-project SLA/escalation config. One rule per project (Core-baseline)."""

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="escalation_rule")
    default_sla_hours = models.PositiveIntegerField(default=48)
    high_stakes_sla_hours = models.PositiveIntegerField(default=24)
    fallback_role = models.CharField(max_length=20, default="owner")

    def sla_hours_for(self, high_stakes: bool) -> int:
        return self.high_stakes_sla_hours if high_stakes else self.default_sla_hours

    def __str__(self):
        return f"Escalation rule for {self.project}"


class Decision(TrackedItem):
    """
    The 3 Edges - Module 4 (approvals-workflow) domain kernel. `status`
    (inherited from TrackedItem) walks HEARING -> UNDERSTANDING -> AGREEING
    -> CLOSED, or -> ESCALATED on SLA breach. Transitions are enforced in
    services.py, never mutated directly by views/serializers.

    Attaches to the underlying tracked object (an RFI, change order, payment
    milestone, ...) via a generic (subject_type, subject_id) pair rather
    than a direct FK - those modules don't exist yet (Phase 2+), so this
    avoids a speculative foreign key into apps that aren't built (YAGNI).
    """

    STATUS_CHOICES = DecisionStatus.choices
    TERMINAL_STATUSES = frozenset({DecisionStatus.CLOSED, DecisionStatus.ESCALATED})

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="decisions")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    subject_type = models.CharField(max_length=64, default="general")
    subject_ref = models.CharField(max_length=128, blank=True)
    high_stakes = models.BooleanField(default=False)

    hearing_confirmed_at = models.DateTimeField(null=True, blank=True)

    understanding_text = models.TextField(blank=True)
    understanding_confirmed_at = models.DateTimeField(null=True, blank=True)
    understanding_confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    agreement_confirmed_at = models.DateTimeField(null=True, blank=True)
    agreement_confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    fallback_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        ordering = ["sla_deadline"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["status", "sla_deadline"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"


class DecisionParticipant(TimeStampedModel):
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    raci_role = models.CharField(max_length=1, choices=RaciRole.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["decision", "user"], name="one_raci_row_per_user_per_decision"),
            # DB-level guarantee (not just app-layer validation): exactly one
            # Accountable participant per decision.
            models.UniqueConstraint(
                fields=["decision"],
                condition=Q(raci_role=RaciRole.ACCOUNTABLE),
                name="one_accountable_per_decision",
            ),
        ]
        indexes = [models.Index(fields=["user", "raci_role"])]

    def __str__(self):
        return f"{self.user} - {self.get_raci_role_display()} on {self.decision_id}"
