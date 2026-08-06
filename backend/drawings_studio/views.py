from accounts.services import get_role
from core.models import Project
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from . import services
from .models import DrawingComment, DrawingModel
from .serializers import DrawingCommentSerializer, DrawingModelSerializer


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
            raise NotFound("Missing `project` parameter.")
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
        role = get_role(request.user, model.project)
        if model.uploaded_by_id != request.user.id and role not in ("owner", "admin"):
            raise PermissionDenied("Only the uploader or a project owner/admin can delete a model.")
        services.delete_drawing_model(model, deleted_by=request.user)
        return Response(status=204)


class DrawingCommentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Pinned comments on a DrawingModel - scoped by `model` query param the
    same way DrawingModelViewSet is scoped by `project`. Membership in the
    model's project is the only gate (see Decision C: Consultant's authority
    over Designer work is a default-approver convention, not an RBAC
    rewrite - this module follows the same "light" rule).
    """

    serializer_class = DrawingCommentSerializer

    def _model(self):
        model_id = self.request.query_params.get("model") or self.request.data.get("model")
        if not model_id:
            raise NotFound("Missing `model` parameter.")
        model = DrawingModel.objects.filter(id=model_id).select_related("project").first()
        if model is None or get_role(self.request.user, model.project) is None:
            raise NotFound("Model not found.")
        return model

    def get_queryset(self):
        return DrawingComment.objects.filter(model=self._model()).select_related("author")

    def get_object(self):
        obj = get_object_or_404(DrawingComment.objects.select_related("model__project"), pk=self.kwargs["pk"])
        if get_role(self.request.user, obj.model.project) is None:
            raise NotFound("Not found.")
        return obj

    def create(self, request, *args, **kwargs):
        model = self._model()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        parent = data.get("parent")
        if parent is not None and parent.model_id != model.id:
            raise ValidationError("Parent comment does not belong to this model.")
        position = None
        if data.get("position_x") is not None and data.get("position_y") is not None and data.get("position_z") is not None:
            position = {"x": data["position_x"], "y": data["position_y"], "z": data["position_z"]}
        comment = services.create_drawing_comment(
            model=model, author=request.user, body=data["body"], parent=parent,
            position=position, viewpoint=data.get("viewpoint"),
        )
        return Response(self.get_serializer(comment).data, status=201)

    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        if "resolved" in request.data and set(request.data.keys()) <= {"resolved"}:
            updated = services.set_drawing_comment_resolved(comment, bool(request.data["resolved"]), actor=request.user)
            return Response(self.get_serializer(updated).data)
        if comment.author_id != request.user.id:
            raise PermissionDenied("Only the author can edit a comment's text.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        role = get_role(request.user, comment.model.project)
        if comment.author_id != request.user.id and role not in ("owner", "admin"):
            raise PermissionDenied("Only the author or a project owner/admin can delete a comment.")
        comment.delete()
        return Response(status=204)
