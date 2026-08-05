from accounts.services import get_role
from core.models import Project
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import DashboardSummarySerializer


class DashboardSummaryView(APIView):
    def get(self, request):
        project_id = request.query_params.get("project")
        if not project_id:
            raise NotFound("Missing `project` query parameter.")
        project = Project.objects.filter(id=project_id).first()
        if project is None:
            raise NotFound("Project not found.")

        role = get_role(request.user, project)
        if role is None:
            raise PermissionDenied("You are not a member of this project.")

        result = services.get_role_dashboard(request.user, project)
        result["project"] = project
        project._membership_role = role

        import observability.services as observability

        observability.record_digest_view(project, request.user)

        serializer = DashboardSummarySerializer(result, context={"request": request})
        return Response(serializer.data)
