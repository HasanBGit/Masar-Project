"""
Read/presentation layer over other modules' data - no models of its own
(per skills/owner-dashboard/SKILL.md: "very few models beyond view-config").
One data model (approvals.Decision, via its service layer), filtered/
composed differently per role. Never four parallel per-role pipelines.
"""

import approvals.services as approvals
from accounts.services import get_role
from rest_framework.exceptions import PermissionDenied

# Owner/Admin get the full project feed. Consultant/Project Manager/Designer
# get an action-oriented slice of the same decisions, filtered by their RACI
# involvement (done inside approvals.get_visible_decisions, which already
# scopes to participants).


def get_role_dashboard(user, project) -> dict:
    role = get_role(user, project)
    if role is None:
        raise PermissionDenied("User is not a member of this project.")

    stats = approvals.get_project_decision_stats(project)

    if role in {"owner", "admin"}:
        decisions = list(approvals.get_all_project_decisions(project))
        digest = sorted(
            [d for d in decisions if d.status != "closed"],
            key=lambda d: d.sla_deadline or d.created_at,
        )[:3]
    else:
        # consultant / project_manager / designer: their own participant-scoped queue
        decisions = list(approvals.get_visible_decisions(project, user))
        digest = approvals.get_digest_items(project, user)

    return {
        "role": role,
        "stats": stats,
        "digest": digest,
        "decisions": decisions,
    }
