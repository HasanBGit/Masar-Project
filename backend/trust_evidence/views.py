from accounts.services import get_role, has_permission
from core.models import Project
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import EvidenceRecord, SilenceFlag
from .serializers import EvidenceRecordSerializer, SilenceFlagSerializer


def _project_from_query(request) -> Project:
    project_id = request.query_params.get("project")
    if not project_id:
        raise NotFound("Missing `project` query parameter.")
    project = Project.objects.filter(id=project_id).first()
    if project is None:
        raise NotFound("Project not found.")
    if get_role(request.user, project) is None:
        raise PermissionDenied("You are not a member of this project.")
    return project


class EvidenceRecordViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = EvidenceRecordSerializer

    def get_queryset(self):
        project = _project_from_query(self.request)
        qs = EvidenceRecord.objects.filter(project=project)
        subject_type = self.request.query_params.get("subject_type")
        subject_id = self.request.query_params.get("subject_id")
        if subject_type:
            qs = qs.filter(subject_type=subject_type)
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return qs

    def get_object(self):
        # Detail routes (e.g. `verify`) don't necessarily carry `?project=` - 
        # look the record up by pk and derive visibility from its own project.
        record = get_object_or_404(EvidenceRecord, pk=self.kwargs["pk"])
        if get_role(self.request.user, record.project) is None:
            raise NotFound("Not found.")
        return record

    def perform_create(self, serializer):
        project = Project.objects.get(id=self.request.data.get("project"))
        if get_role(self.request.user, project) is None:
            raise PermissionDenied("You are not a member of this project.")
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        record = self.get_object()
        if not has_permission(request.user, record.project, "verify_evidence"):
            raise PermissionDenied("Only an owner, admin, or consultant/PMC can verify evidence.")
        services.verify_evidence(record, request.user)
        record.refresh_from_db()
        return Response(self.get_serializer(record).data)


class SilenceFlagListView(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = SilenceFlagSerializer

    def get_queryset(self):
        project = _project_from_query(self.request)
        return SilenceFlag.objects.filter(project=project)


class DisputeExportView(APIView):
    def get(self, request):
        project = _project_from_query(request)
        bundle = services.export_dispute_bundle(project)
        # Data-access audit trail: exporting the dispute bundle is itself a
        # logged access event, so the export mechanism is defensible (Module
        # 17's "who viewed or exported what" requirement) - logged via this
        # view's own module (trust_evidence), not a separate access log.
        services.record_event(
            project=project, actor=request.user, event_type="dispute_export_accessed",
            payload={"event_count": len(bundle)},
        )
        return Response({"project": project.name, "events": bundle})


class ChangeOrderRollupView(APIView):
    def get(self, request):
        project = _project_from_query(request)
        return Response(services.get_change_order_rollup(project))
