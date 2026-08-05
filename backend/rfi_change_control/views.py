from accounts.services import get_role
from core.models import Project
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import ChangeOrder, CoordinationThread, Permit, QualityCheckpoint, RFI, Submittal, SupplierDelivery
from .serializers import (
    ChangeOrderSerializer,
    CoordinationMessageSerializer,
    CoordinationThreadSerializer,
    MasterScheduleItemSerializer,
    PermitSerializer,
    QualityCheckpointSerializer,
    RFISerializer,
    SubmittalSerializer,
    SupplierDeliverySerializer,
)


class ProjectScopedViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Every model in this app is scoped to a project a member of. `list`/
    `create` require `?project=`. `retrieve` and detail actions (e.g.
    `respond`, `verify`) look the object up by pk directly and derive
    visibility from *its own* `.project` - a client calling
    `/rfis/<id>/respond/` doesn't necessarily have the project id on hand.
    """

    model = None
    select_related_fields = ()
    prefetch_related_fields = ()

    def _project(self):
        project_id = self.request.query_params.get("project") or self.request.data.get("project")
        if not project_id:
            raise NotFound("Missing `project` parameter.")
        project = Project.objects.filter(id=project_id).first()
        if project is None or get_role(self.request.user, project) is None:
            raise NotFound("Project not found.")
        return project

    def get_queryset(self):
        qs = self.model.objects.filter(project=self._project())
        if self.select_related_fields:
            qs = qs.select_related(*self.select_related_fields)
        if self.prefetch_related_fields:
            qs = qs.prefetch_related(*self.prefetch_related_fields)
        return qs

    def get_object(self):
        obj = get_object_or_404(self.model, pk=self.kwargs["pk"])
        if get_role(self.request.user, obj.project) is None:
            raise NotFound("Not found.")
        return obj


class RFIViewSet(ProjectScopedViewSet):
    model = RFI
    serializer_class = RFISerializer
    select_related_fields = ("raised_by",)

    def create(self, request, *args, **kwargs):
        project = self._project()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rfi = services.create_rfi(
            project=project,
            raised_by=request.user,
            title=serializer.validated_data["title"],
            question=serializer.validated_data["question"],
            respond_by=serializer.validated_data.get("sla_deadline"),
            schedule_impact_days=serializer.validated_data.get("schedule_impact_days", 0),
            location_tag=serializer.validated_data.get("location_tag", ""),
        )
        return Response(self.get_serializer(rfi).data, status=201)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        rfi = self.get_object()
        try:
            services.respond_to_rfi(rfi, request.user, request.data.get("response", ""))
        except ValueError as exc:
            raise ValidationError(str(exc))
        rfi.refresh_from_db()
        return Response(self.get_serializer(rfi).data)


class AtRiskRFIView(APIView):
    def get(self, request):
        project_id = request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(request.user, project) is None:
            raise NotFound("Project not found.")
        return Response(RFISerializer(services.get_at_risk_rfis(project), many=True).data)


class ChangeOrderViewSet(ProjectScopedViewSet):
    model = ChangeOrder
    serializer_class = ChangeOrderSerializer
    select_related_fields = ("raised_by",)

    def create(self, request, *args, **kwargs):
        project = self._project()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # `project` is a writable serializer field but the service takes the
        # (membership-checked) project explicitly - drop it before splatting.
        data = dict(serializer.validated_data)
        data.pop("project", None)
        co = services.create_change_order(project=project, raised_by=request.user, **data)
        return Response(self.get_serializer(co).data, status=201)


class SubmittalViewSet(ProjectScopedViewSet):
    model = Submittal
    serializer_class = SubmittalSerializer
    select_related_fields = ("submitted_by",)

    def perform_create(self, serializer):
        serializer.instance = services.create_submittal(
            project=self._project(),
            submitted_by=self.request.user,
            title=serializer.validated_data["title"],
            spec_section=serializer.validated_data.get("spec_section", ""),
            description=serializer.validated_data.get("description", ""),
            revision_number=serializer.validated_data.get("revision_number", 1),
        )


class PermitViewSet(ProjectScopedViewSet):
    model = Permit
    serializer_class = PermitSerializer

    def perform_create(self, serializer):
        serializer.instance = services.create_permit(
            project=self._project(),
            title=serializer.validated_data["title"],
            authority=serializer.validated_data.get("authority", "Balady"),
            permit_number=serializer.validated_data.get("permit_number", ""),
        )


class SupplierDeliveryViewSet(ProjectScopedViewSet):
    model = SupplierDelivery
    serializer_class = SupplierDeliverySerializer

    def perform_create(self, serializer):
        serializer.instance = services.create_supplier_delivery(
            project=self._project(),
            material=serializer.validated_data["material"],
            supplier_name=serializer.validated_data["supplier_name"],
            committed_date=serializer.validated_data["committed_date"],
        )


class QualityCheckpointViewSet(ProjectScopedViewSet):
    model = QualityCheckpoint
    serializer_class = QualityCheckpointSerializer
    select_related_fields = ("inspector",)

    def perform_create(self, serializer):
        serializer.instance = services.create_quality_checkpoint(
            project=self._project(),
            title=serializer.validated_data["title"],
            inspector=serializer.validated_data.get("inspector") or self.request.user,
            milestone_ref=serializer.validated_data.get("milestone_ref", ""),
            location_tag=serializer.validated_data.get("location_tag", ""),
        )


class CoordinationThreadViewSet(ProjectScopedViewSet):
    model = CoordinationThread
    serializer_class = CoordinationThreadSerializer
    select_related_fields = ("created_by",)
    prefetch_related_fields = ("messages__author",)

    def perform_create(self, serializer):
        serializer.save(project=self._project(), created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def messages(self, request, pk=None):
        thread = self.get_object()
        try:
            message = services.post_coordination_message(thread, request.user, request.data.get("body", ""))
        except ValueError as exc:
            raise ValidationError(str(exc))
        return Response(CoordinationMessageSerializer(message).data, status=201)


class MasterScheduleView(APIView):
    def get(self, request):
        project_id = request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(request.user, project) is None:
            raise NotFound("Project not found.")
        return Response(MasterScheduleItemSerializer(services.get_master_schedule(project), many=True).data)
