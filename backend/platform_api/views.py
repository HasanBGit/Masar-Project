from accounts.services import get_role, has_permission
from core.models import Project
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .auth import ApiKeyAuthentication, ApiKeyRateThrottle
from .models import APIKey, WebhookDelivery, WebhookSubscription
from .serializers import (
    APIKeyCreateSerializer,
    APIKeySerializer,
    PublicActivityEventSerializer,
    PublicApprovalSerializer,
    PublicEvidenceSerializer,
    WebhookDeliverySerializer,
    WebhookSubscriptionSerializer,
)

# --- Internal management (JWT-authenticated, owner/admin only) -------------
# You can't fetch your first API key *with* an API key - issuance and
# webhook-subscription management go through the normal authenticated app,
# not the public API surface itself.


class APIKeyViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = APIKeySerializer

    def _project(self):
        project_id = self.request.query_params.get("project") or self.request.data.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(self.request.user, project) is None:
            raise NotFound("Project not found.")
        return project

    def get_queryset(self):
        project = self._project()
        # Same elevated-role bar as issuing/revoking - a non-admin member
        # shouldn't even enumerate the project's keys.
        if not has_permission(self.request.user, project, "manage_roster"):
            raise PermissionDenied("Only project owners/admins can view API keys.")
        return APIKey.objects.filter(project=project)

    def create(self, request, *args, **kwargs):
        project = self._project()
        if not has_permission(request.user, project, "manage_roster"):  # same elevated-role bar as roster management
            raise PermissionDenied("Only project owners/admins can issue API keys.")
        input_serializer = APIKeyCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        raw_key, key = services.generate_api_key(
            project=project,
            label=input_serializer.validated_data["label"],
            scope=input_serializer.validated_data["scope"],
            tier=input_serializer.validated_data["tier"],
            created_by=request.user,
        )
        data = self.get_serializer(key).data
        data["raw_key"] = raw_key  # shown exactly once
        return Response(data, status=201)

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        key = APIKey.objects.filter(pk=pk).first()
        if key is None:
            raise NotFound("Not found.")
        if not has_permission(request.user, key.project, "manage_roster"):
            raise PermissionDenied("Only project owners/admins can revoke API keys.")
        services.revoke_api_key(key)
        return Response(self.get_serializer(key).data)


class WebhookSubscriptionViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = WebhookSubscriptionSerializer

    def _project(self):
        project_id = self.request.query_params.get("project") or self.request.data.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(self.request.user, project) is None:
            raise NotFound("Project not found.")
        return project

    def get_queryset(self):
        return WebhookSubscription.objects.filter(project=self._project())

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        # The signing secret is exposed exactly once, here at creation time -
        # the serializer never includes it, so list/retrieve can't leak it.
        response.data["secret"] = self._created_subscription.secret
        return response

    def perform_create(self, serializer):
        project = self._project()
        if not has_permission(self.request.user, project, "manage_roster"):
            raise PermissionDenied("Only project owners/admins can manage webhook subscriptions.")
        try:
            subscription = services.create_webhook_subscription(
                project=project, target_url=serializer.validated_data["target_url"],
                event_types=serializer.validated_data.get("event_types", []), created_by=self.request.user,
            )
        except services.UnsafeWebhookURL as exc:
            raise ValidationError({"target_url": str(exc)})
        serializer.instance = subscription
        self._created_subscription = subscription


class WebhookDeliveryListView(APIView):
    def get(self, request):
        project_id = request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(request.user, project) is None:
            raise NotFound("Project not found.")
        if not has_permission(request.user, project, "manage_roster"):
            raise PermissionDenied("Only project owners/admins can view webhook deliveries.")
        deliveries = WebhookDelivery.objects.filter(subscription__project=project).select_related("subscription")[:100]
        return Response(WebhookDeliverySerializer(deliveries, many=True).data)


# --- Public API facade (API-key authenticated) ------------------------------
# Every endpoint here calls another module's own service layer - never that
# module's models directly (the core rule of this app's SKILL.md).


class PublicAPIView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [AllowAny]  # ApiKeyAuthentication itself rejects an invalid/missing key
    throttle_classes = [ApiKeyRateThrottle]

    def _require_key(self, request):
        if request.auth is None:
            raise PermissionDenied("A valid `Authorization: ApiKey <key>` header is required.")
        return request.auth


PROJECT_ID_PARAM = OpenApiParameter("project_id", int, OpenApiParameter.PATH, description="The project this API key is scoped to.")


class PublicApprovalsView(PublicAPIView):
    """List approval decisions for a project. An `investor`-scoped key only sees high-stakes decisions."""

    @extend_schema(parameters=[PROJECT_ID_PARAM], responses=PublicApprovalSerializer(many=True))
    def get(self, request, project_id):
        key = self._require_key(request)
        if str(key.project_id) != str(project_id):
            raise PermissionDenied("This key is not scoped to the requested project.")

        import approvals.services as approvals

        decisions = approvals.get_all_project_decisions(key.project)
        if key.scope == "investor":
            decisions = [d for d in decisions if d.high_stakes]
        return Response(PublicApprovalSerializer(decisions, many=True).data)


class PublicEvidenceView(PublicAPIView):
    """List the verified milestone ledger (evidence records) for a project."""

    @extend_schema(parameters=[PROJECT_ID_PARAM], responses=PublicEvidenceSerializer(many=True))
    def get(self, request, project_id):
        key = self._require_key(request)
        if str(key.project_id) != str(project_id):
            raise PermissionDenied("This key is not scoped to the requested project.")

        import trust_evidence.services as trust_evidence

        return Response(PublicEvidenceSerializer(trust_evidence.get_evidence_for_project(key.project), many=True).data)


class PublicActivityView(PublicAPIView):
    """
    An activity feed derived from the audit log - not the full unified
    project timeline (Module 2), which isn't built in this codebase yet.
    """

    @extend_schema(parameters=[PROJECT_ID_PARAM], responses=PublicActivityEventSerializer(many=True))
    def get(self, request, project_id):
        key = self._require_key(request)
        if str(key.project_id) != str(project_id):
            raise PermissionDenied("This key is not scoped to the requested project.")

        import trust_evidence.services as trust_evidence

        return Response(PublicActivityEventSerializer(trust_evidence.get_audit_events(key.project, limit=100), many=True).data)
