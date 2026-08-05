from accounts.services import get_role
from core.models import Project
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from . import services
from .models import DrawingModel
from .serializers import DrawingModelSerializer


class DrawingModelViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Every model here is scoped to a project the requesting user is a member
    of - same `ProjectScopedViewSet` shape as rfi_change_control.views, kept
    local to this app rather than shared (see the app-boundary rule in
    skills/engineering-principles/SKILL.md).
    """

    serializer_class = DrawingModelSerializer

    def _project(self):
        project_id = self.request.query_params.get("project") or self.request.data.get("project")
        if not project_id:
            raise NotFound("Missing `project`.")
        project = Project.objects.filter(id=project_id).first()
        if project is None or get_role(self.request.user, project) is None:
            raise NotFound("Project not found.")
        return project

    def get_queryset(self):
        return DrawingModel.objects.filter(project=self._project())

    def get_object(self):
        obj = get_object_or_404(DrawingModel, pk=self.kwargs["pk"])
        if get_role(self.request.user, obj.project) is None:
            raise NotFound("Not found.")
        return obj

    def create(self, request, *args, **kwargs):
        project = self._project()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            model = services.create_drawing_model(
                project=project,
                uploaded_by=request.user,
                name=serializer.validated_data["name"],
                file=serializer.validated_data["file"],
            )
        except ValueError as exc:
            raise ValidationError(str(exc))
        return Response(self.get_serializer(model).data, status=201)

    def destroy(self, request, *args, **kwargs):
        model = self.get_object()
        services.delete_drawing_model(model, deleted_by=request.user)
        return Response(status=204)
