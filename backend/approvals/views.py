from accounts.services import get_role
from core.models import Project
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from . import services
from .exceptions import InvalidTransition, NotAuthorized
from .models import Decision
from .serializers import DecisionSerializer

FULL_VISIBILITY_ROLES = {"owner", "admin"}


class DecisionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    `list` is always project-scoped (`?project=<id>`) - there's no
    cross-project "all my decisions" view in this product. `retrieve` (and
    the action endpoints below, which all call it) looks the decision up by
    pk directly and derives visibility from *its* project, since a client
    opening `/decisions/<id>/` doesn't necessarily know the project id.
    """

    serializer_class = DecisionSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get("project")
        if not project_id:
            return Decision.objects.none()
        project = Project.objects.filter(id=project_id).first()
        if project is None:
            return Decision.objects.none()

        role = get_role(self.request.user, project)
        if role is None:
            return Decision.objects.none()

        if role in FULL_VISIBILITY_ROLES:
            return services.get_all_project_decisions(project)
        return services.get_visible_decisions(project, self.request.user)

    def get_object(self):
        # Read-only: SLA escalation is a write and happens in the
        # `escalate_overdue_decisions` management command sweep (cron), never
        # as a side effect of a GET.
        decision = get_object_or_404(Decision, pk=self.kwargs["pk"])
        role = get_role(self.request.user, decision.project)
        is_participant = decision.participants.filter(user=self.request.user).exists()
        if role is None or (role not in FULL_VISIBILITY_ROLES and not is_participant):
            raise NotFound("No Decision matches the given query.")
        return decision

    def _run_transition(self, fn, decision):
        try:
            fn(decision)
        except NotAuthorized as exc:
            raise PermissionDenied(str(exc))
        except InvalidTransition as exc:
            raise ValidationError(str(exc))
        except ValueError as exc:
            raise ValidationError(str(exc))
        return decision

    @action(detail=True, methods=["post"], url_path="confirm-hearing")
    def confirm_hearing(self, request, pk=None):
        decision = self.get_object()
        self._run_transition(lambda d: services.confirm_hearing(d, request.user), decision)
        decision.refresh_from_db()
        return Response(self.get_serializer(decision).data)

    @action(detail=True, methods=["post"], url_path="record-understanding")
    def record_understanding(self, request, pk=None):
        decision = self.get_object()
        paraphrase = request.data.get("paraphrase", "")
        self._run_transition(lambda d: services.record_understanding(d, request.user, paraphrase), decision)
        decision.refresh_from_db()
        return Response(self.get_serializer(decision).data)

    @action(detail=True, methods=["post"], url_path="agree")
    def agree(self, request, pk=None):
        decision = self.get_object()
        self._run_transition(lambda d: services.record_agreement(d, request.user), decision)
        decision.refresh_from_db()
        return Response(self.get_serializer(decision).data)
