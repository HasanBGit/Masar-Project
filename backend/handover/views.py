from accounts.services import get_role, get_user, has_permission
from core.models import Project
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import OMChecklistItem, PostHandoverDefect, PunchListItem
from .serializers import (
    HandoverRecordSerializer,
    OMChecklistItemSerializer,
    PostHandoverDefectSerializer,
    PracticalCompletionSerializer,
    PunchListItemSerializer,
)


class ProjectScopedViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """See rfi_change_control.views.ProjectScopedViewSet - same pattern, duplicated per app boundary (no cross-app import)."""

    model = None
    select_related_fields = ()

    def _project(self):
        project_id = self.request.query_params.get("project") or self.request.data.get("project")
        if not project_id:
            raise NotFound("Missing `project` parameter.")
        project = Project.objects.filter(id=project_id).first()
        if project is None or get_role(self.request.user, project) is None:
            raise NotFound("Project not found.")
        return project

    def get_object(self):
        obj = get_object_or_404(self.model, pk=self.kwargs["pk"])
        if get_role(self.request.user, obj.project) is None:
            raise NotFound("Not found.")
        return obj

    def get_queryset(self):
        qs = self.model.objects.filter(project=self._project())
        if self.select_related_fields:
            qs = qs.select_related(*self.select_related_fields)
        return qs


class HandoverRecordView(APIView):
    def get(self, request):
        project_id = request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(request.user, project) is None:
            raise NotFound("Project not found.")
        record = services.get_handover_record(project)
        if record is None:
            return Response(None)
        data = HandoverRecordSerializer(record).data
        data["within_liability_window"] = services.is_within_liability_window(project)
        return Response(data)

    def post(self, request):
        project_id = request.data.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(request.user, project) is None:
            raise NotFound("Project not found.")
        if not has_permission(request.user, project, "record_practical_completion"):
            raise PermissionDenied("Only an owner/admin can record practical completion.")
        serializer = PracticalCompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = services.record_practical_completion(
            project=project,
            practical_completion_date=serializer.validated_data["practical_completion_date"],
            recorded_by=request.user,
        )
        return Response(HandoverRecordSerializer(record).data, status=201)


class PunchListItemViewSet(ProjectScopedViewSet):
    model = PunchListItem
    serializer_class = PunchListItemSerializer
    select_related_fields = ("raised_by", "assigned_approver")

    def get_queryset(self):
        project = self._project()
        return services.get_punch_list(project, unit_or_zone=self.request.query_params.get("unit_or_zone"))

    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        """Explicit sync against the linked sign-off Decision - GETs stay read-only."""
        item = services.sync_closure_from_decision(self.get_object())
        return Response(self.get_serializer(item).data)

    def perform_create(self, serializer):
        project = self._project()
        item = services.create_punch_list_item(
            project=project, raised_by=self.request.user,
            unit_or_zone=serializer.validated_data["unit_or_zone"],
            title=serializer.validated_data["title"],
            description=serializer.validated_data.get("description", ""),
        )
        serializer.instance = item

    @action(detail=True, methods=["post"], url_path="request-signoff")
    def request_signoff(self, request, pk=None):
        item = self.get_object()
        accountable_id = request.data.get("accountable_user")
        if not accountable_id:
            raise ValidationError("`accountable_user` is required.")
        accountable_user = get_user(accountable_id)
        if accountable_user is None:
            raise ValidationError("accountable_user not found.")
        try:
            services.request_closure_signoff(item, requested_by=request.user, accountable_user=accountable_user)
        except ValueError as exc:
            raise ValidationError(str(exc))
        item.refresh_from_db()
        return Response(self.get_serializer(item).data)


class OMChecklistItemViewSet(ProjectScopedViewSet):
    model = OMChecklistItem
    serializer_class = OMChecklistItemSerializer
    select_related_fields = ("verified_by",)

    def perform_create(self, serializer):
        serializer.save(project=self._project())

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        item = self.get_object()
        # Same independent-verifier bar as evidence verification
        # (owner/admin/consultant) - a contractor can't self-verify O&M docs.
        if not has_permission(request.user, item.project, "verify_evidence"):
            raise PermissionDenied("Only an owner, admin, or consultant/PMC can verify an O&M item.")
        services.verify_om_item(item, request.user)
        item.refresh_from_db()
        return Response(self.get_serializer(item).data)


# Who may move a defect through its lifecycle (see the RBAC matrix in
# accounts.services): the contractor acknowledges the work is theirs (owner/
# admin can too), while resolution needs an independent verifier - the same
# owner/admin/consultant set as evidence verification.
DEFECT_ACKNOWLEDGE_ROLES = {"contractor", "owner", "admin"}


class PostHandoverDefectViewSet(ProjectScopedViewSet):
    model = PostHandoverDefect
    serializer_class = PostHandoverDefectSerializer
    select_related_fields = ("reported_by",)

    def perform_create(self, serializer):
        project = self._project()
        defect = services.report_defect(
            project=project, reported_by=self.request.user,
            unit_or_zone=serializer.validated_data["unit_or_zone"],
            title=serializer.validated_data["title"],
            description=serializer.validated_data.get("description", ""),
        )
        serializer.instance = defect

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        defect = self.get_object()
        if get_role(request.user, defect.project) not in DEFECT_ACKNOWLEDGE_ROLES:
            raise PermissionDenied("Only the contractor or an owner/admin can acknowledge a defect.")
        try:
            services.acknowledge_defect(defect, request.user)
        except ValueError as exc:
            raise ValidationError(str(exc))
        defect.refresh_from_db()
        return Response(self.get_serializer(defect).data)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        defect = self.get_object()
        if not has_permission(request.user, defect.project, "verify_evidence"):
            raise PermissionDenied("Only an owner, admin, or consultant/PMC can resolve a defect.")
        try:
            services.resolve_defect(defect, request.user)
        except ValueError as exc:
            raise ValidationError(str(exc))
        defect.refresh_from_db()
        return Response(self.get_serializer(defect).data)
