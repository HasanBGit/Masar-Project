"""
RBAC service layer - the single source of truth every other module's
permission checks call into (per skills/access-control-admin/SKILL.md).
Other apps must call these functions, never re-implement role logic locally.
"""

from django.conf import settings
from django.db import transaction
from django.utils.text import slugify

from core.models import Project

from .models import DataRetentionPolicy, ProjectMembership, Role, User

# Actions gated to elevated roles. Anything not listed here just requires
# project membership (checked separately by each viewset's queryset scoping).
ELEVATED_ACTIONS = {
    "manage_roster", "verify_evidence", "record_practical_completion",
    "view_audit_log", "manage_retention_policy",
}
ELEVATED_ROLES = {Role.OWNER, Role.ADMIN}
# Verification roles: who can independently confirm evidence "counts" - 
# owner/admin plus the consultant/PMC role, who commonly acts as the
# independent verifier on site.
VERIFIER_ROLES = ELEVATED_ROLES | {Role.CONSULTANT}


def get_user(user_id) -> User | None:
    return User.objects.filter(id=user_id).first()


def get_membership(user, project) -> ProjectMembership | None:
    return ProjectMembership.objects.filter(user=user, project=project).first()


def get_role(user, project) -> str | None:
    membership = get_membership(user, project)
    return membership.role if membership else None


def has_permission(user, project, action: str) -> bool:
    role = get_role(user, project)
    if role is None:
        return False
    if action == "verify_evidence":
        return role in VERIFIER_ROLES
    if action in ELEVATED_ACTIONS:
        return role in ELEVATED_ROLES
    return True


# --- Project creation --------------------------------------------------------


def _unique_slug(name: str) -> str:
    base = slugify(name) or "project"
    slug = base
    suffix = 1
    while Project.objects.filter(slug=slug).exists():
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


@transaction.atomic
def create_project(*, name: str, description: str, created_by: User) -> Project:
    """Create a project and make the creator its Owner in one step - there is
    no other way to become a member of a project that doesn't exist yet."""
    import trust_evidence.services as trust_evidence

    project = Project.objects.create(name=name, slug=_unique_slug(name), description=description)
    ProjectMembership.objects.create(project=project, user=created_by, role=Role.OWNER)
    trust_evidence.record_event(
        project=project, actor=created_by, event_type="project_created",
        subject_type="project", subject_id=project.id, payload={"name": name},
    )
    return project


# --- Roster management (add/remove/reassign over time) ---------------------


def add_roster_member(*, project, user, role: str, added_by) -> ProjectMembership:
    import trust_evidence.services as trust_evidence

    membership = ProjectMembership.objects.create(project=project, user=user, role=role)
    trust_evidence.record_event(
        project=project, actor=added_by, event_type="roster_member_added",
        subject_type="project_membership", subject_id=membership.id, payload={"user": user.email, "role": role},
    )
    return membership


def reassign_roster_member(membership: ProjectMembership, new_role: str, changed_by) -> ProjectMembership:
    import trust_evidence.services as trust_evidence

    old_role = membership.role
    membership.role = new_role
    membership.save(update_fields=["role", "updated_at"])
    trust_evidence.record_event(
        project=membership.project, actor=changed_by, event_type="roster_member_reassigned",
        subject_type="project_membership", subject_id=membership.id,
        payload={"user": membership.user.email, "from_role": old_role, "to_role": new_role},
    )
    return membership


def remove_roster_member(membership: ProjectMembership, removed_by) -> None:
    import trust_evidence.services as trust_evidence

    project, user_email, membership_id = membership.project, membership.user.email, membership.id
    membership.delete()
    trust_evidence.record_event(
        project=project, actor=removed_by, event_type="roster_member_removed",
        subject_type="project_membership", subject_id=membership_id, payload={"user": user_email},
    )


# --- Data retention & residency (Module 17 full scope) ----------------------


def get_retention_policy(project) -> DataRetentionPolicy:
    policy, _ = DataRetentionPolicy.objects.get_or_create(project=project)
    return policy


def get_compliance_status(project) -> dict:
    """Enforced-architecture-property report: the platform's actual hosting region + this project's retention policy."""
    policy = get_retention_policy(project)
    return {
        "platform_data_residency_region": settings.DATA_RESIDENCY_REGION,
        "project_data_residency_region": policy.data_residency_region,
        "residency_matches_platform": policy.data_residency_region == settings.DATA_RESIDENCY_REGION,
        "retention_years": policy.retention_years,
        "pdpl_compliant": policy.pdpl_compliant,
    }
