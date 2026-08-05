from django.conf import settings
from django.db import connection
from core.models import Project
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import AlertEvent
from .serializers import AlertEventSerializer, IntegrationHealthCheckSerializer


class SystemHealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False

        status_code = 200 if db_ok else 503
        return Response(
            {
                "status": "healthy" if db_ok else "degraded",
                "database": "connected" if db_ok else "disconnected",
                "data_residency_region": getattr(settings, "DATA_RESIDENCY_REGION", "sa"),
                "version": "1.0.0",
            },
            status=status_code,
        )



class StaffOnly(IsAuthenticated):
    """
    San3-internal-only - every view in this app is the ops team's own
    dashboard, distinct from the customer-facing `owner-dashboard` module
    (Module 3). Gated on Django's built-in `is_staff`, not project RBAC:
    an owner shouldn't see this even for their own project.
    """

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_staff


class IntegrationHealthView(APIView):
    permission_classes = [StaffOnly]

    def get(self, request):
        project_id = request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        checks = services.get_integration_health(project)
        return Response(IntegrationHealthCheckSerializer(checks, many=True).data)


class AlertViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AlertEventSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        unacknowledged_only = self.request.query_params.get("unacknowledged") == "true"
        return services.get_alerts(project, unacknowledged_only)

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        alert = AlertEvent.objects.filter(pk=pk).first()
        if alert is None:
            raise NotFound("Not found.")
        services.acknowledge_alert(alert, request.user)
        return Response(self.get_serializer(alert).data)


class SlaComplianceView(APIView):
    permission_classes = [StaffOnly]

    def get(self, request):
        return Response(services.get_sla_compliance_summary())


class QuietProjectsView(APIView):
    permission_classes = [StaffOnly]

    def get(self, request):
        return Response(services.get_quiet_projects())


class SecurityEventsView(APIView):
    permission_classes = [StaffOnly]

    def get(self, request):
        project_id = request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        events = services.get_permission_denied_events(project)
        return Response([
            {
                "id": e.id, "created_at": e.created_at, "actor": e.actor.get_full_name() if e.actor else None,
                "path": e.payload.get("path"), "detail": e.payload.get("detail"),
            }
            for e in events
        ])
