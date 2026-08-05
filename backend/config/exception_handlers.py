"""
Project-level (not any single app's) DRF exception handler - security/
incident monitoring needs a `permission_denied` event logged wherever one
fires, and no single app owns "every view in the project," so this is
genuinely cross-cutting infrastructure rather than a boundary violation.
"""

from rest_framework.exceptions import PermissionDenied
from rest_framework.views import exception_handler as default_exception_handler


def _resolve_project(request):
    from core.models import Project

    project_id = request.query_params.get("project")
    if not project_id and hasattr(request, "data"):
        project_id = request.data.get("project") if isinstance(request.data, dict) else None
    if not project_id:
        return None
    return Project.objects.filter(id=project_id).first()


def custom_exception_handler(exc, context):
    response = default_exception_handler(exc, context)
    if response is not None and isinstance(exc, PermissionDenied):
        request = context.get("request")
        # Best-effort: only logged when the project is resolvable from the
        # request (most of our project-scoped endpoints qualify) - an
        # action route without `?project=` silently isn't logged here
        # rather than forcing a bad audit-log write.
        if request is not None and getattr(request, "user", None) and request.user.is_authenticated:
            project = _resolve_project(request)
            if project is not None:
                import trust_evidence.services as trust_evidence

                trust_evidence.record_event(
                    project=project, actor=request.user, event_type="permission_denied",
                    payload={"path": request.path, "detail": str(exc.detail)},
                )
    return response
