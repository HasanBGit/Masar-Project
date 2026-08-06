import requests
from accounts.services import get_role
from core.models import Project
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

import approvals.services as approvals

from . import services
from .exceptions import GmailNotConfigured
from .models import EMAIL_SUBJECT_TYPE, EmailAccount, EmailMessage
from .serializers import EmailAccountSerializer, EmailMessageSerializer


def _project_from_query(request) -> Project:
    project_id = request.query_params.get("project") or request.data.get("project")
    if not project_id:
        raise NotFound("Missing `project` parameter.")
    project = Project.objects.filter(id=project_id).first()
    if project is None or get_role(request.user, project) is None:
        raise NotFound("Project not found.")
    return project


def _require_manage_role(request, project) -> None:
    """Connecting/disconnecting/syncing the project's Gmail account is a
    privileged action - membership alone (checked by _project_from_query)
    isn't enough, unlike the read-only list/retrieve endpoints below."""
    if get_role(request.user, project) not in services.EMAIL_ACCOUNT_MANAGE_ROLES:
        raise PermissionDenied("Only an Owner, Consultant, or Project Manager can manage the connected Gmail account.")


class ConnectUrlView(APIView):
    """Returns the Google consent-screen URL the frontend should redirect to."""

    def get(self, request):
        project = _project_from_query(request)
        _require_manage_role(request, project)
        redirect_uri = request.query_params.get("redirect_uri")
        if not redirect_uri:
            raise ValidationError({"redirect_uri": "This field is required."})
        try:
            return Response({"authorize_url": services.get_authorize_url(project, redirect_uri, request.user)})
        except GmailNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class CallbackView(APIView):
    """The frontend receives Google's `code`+`state` redirect and POSTs it here to finish connecting."""

    def post(self, request):
        project = _project_from_query(request)
        _require_manage_role(request, project)
        code = request.data.get("code")
        redirect_uri = request.data.get("redirect_uri")
        state = request.data.get("state")
        if not code or not redirect_uri or not state:
            raise ValidationError({"code": "Required.", "redirect_uri": "Required.", "state": "Required."})
        try:
            account = services.connect_account(
                project=project, code=code, redirect_uri=redirect_uri, connected_by=request.user, state=state,
            )
        except GmailNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            raise ValidationError({"state": str(exc)})
        except requests.HTTPError:
            import logging
            logging.error("Google OAuth token exchange failed", exc_info=True)
            return Response(
                {"code": "Google rejected that authorization code - try connecting again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(EmailAccountSerializer(account).data, status=status.HTTP_201_CREATED)


class EmailAccountView(APIView):
    def get(self, request):
        project = _project_from_query(request)
        account = EmailAccount.objects.filter(project=project).select_related("connected_by").first()
        if account is None:
            raise NotFound("No Gmail account connected for this project.")
        return Response(EmailAccountSerializer(account).data)

    def delete(self, request):
        project = _project_from_query(request)
        _require_manage_role(request, project)
        account = get_object_or_404(EmailAccount, project=project)
        services.disconnect_account(account, removed_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SyncView(APIView):
    def post(self, request):
        project = _project_from_query(request)
        _require_manage_role(request, project)
        try:
            new_count = services.sync_inbox(project)
        except GmailNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except EmailAccount.DoesNotExist as exc:
            raise NotFound(str(exc))
        except requests.HTTPError as exc:
            return Response({"detail": f"Gmail sync failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"new_messages": new_count})


class EmailMessageViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = EmailMessageSerializer

    def get_queryset(self):
        project = _project_from_query(self.request)
        return EmailMessage.objects.filter(project=project)

    def get_object(self):
        message = get_object_or_404(EmailMessage, pk=self.kwargs["pk"])
        if get_role(self.request.user, message.project) is None:
            raise NotFound("Not found.")
        return message

    def _context_with_decisions(self, objects):
        context = self.get_serializer_context()
        context["decisions_by_subject_ref"] = approvals.get_decisions_for_subjects(
            EMAIL_SUBJECT_TYPE, [o.id for o in objects]
        )
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        objects = page if page is not None else queryset
        serializer = self.get_serializer(objects, many=True, context=self._context_with_decisions(objects))
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        message = self.get_object()
        serializer = self.get_serializer(message, context=self._context_with_decisions([message]))
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        message = self.get_object()
        updated = services.acknowledge_message(message, request.user)
        serializer = self.get_serializer(updated, context=self._context_with_decisions([updated]))
        return Response(serializer.data)
