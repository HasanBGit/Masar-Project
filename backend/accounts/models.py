from django.contrib.auth.models import AbstractUser
from django.db import models

from core.models import Project, TimeStampedModel


class User(AbstractUser):
    """Custom user - email is the login identifier (JWT `USER_ID_FIELD`)."""

    email = models.EmailField(unique=True)
    preferred_language = models.CharField(
        max_length=2,
        choices=[("en", "English"), ("ar", "Arabic"), ("ur", "Urdu"), ("hi", "Hindi")],
        default="en",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.get_full_name() or self.email


class Role(models.TextChoices):
    """
    Project role hierarchy: Owner sees everything; Consultant reviews and
    approves what the Project Manager and Designer produce (peers, both
    reporting to Consultant); Project Manager is accountable for turning
    site activity into reports/payment tasks; Designer owns project
    architecture/drawings. Admin is a platform-operations role, not a
    project stakeholder in this hierarchy.
    """

    OWNER = "owner", "Owner"
    CONSULTANT = "consultant", "Consultant"
    PROJECT_MANAGER = "project_manager", "Project Manager"
    DESIGNER = "designer", "Designer"
    ADMIN = "admin", "Admin"


class ProjectMembership(TimeStampedModel):
    """Roster entry - who belongs to which project, in which role."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=Role.choices)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["user", "project"], name="one_membership_per_user_per_project")
        ]
        indexes = [models.Index(fields=["project", "role"])]

    def __str__(self):
        return f"{self.user} - {self.project} ({self.role})"


DATA_RESIDENCY_REGIONS = [
    ("sa", "Saudi Arabia (KSA)"),
    ("eu", "European Union"),
    ("us", "United States"),
]


class DataRetentionPolicy(TimeStampedModel):
    """
    Data retention/deletion policy + data residency as an explicit,
    enforced platform property (per skills/access-control-admin/SKILL.md),
    not just an implied PDPL citation. One policy per project; the
    platform-wide hosting region is a separate, global settings value
    (`DATA_RESIDENCY_REGION`) this model's `data_residency_region` should
    normally match.
    """

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="retention_policy")
    retention_years = models.PositiveIntegerField(default=7, help_text="How long audit/evidence records are retained before purge-eligibility.")
    data_residency_region = models.CharField(max_length=2, choices=DATA_RESIDENCY_REGIONS, default="sa")
    pdpl_compliant = models.BooleanField(default=True)

    def __str__(self):
        return f"Retention policy for {self.project} ({self.retention_years}y, {self.data_residency_region})"
