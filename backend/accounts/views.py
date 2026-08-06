from core.models import Project
from django.conf import settings
from django.db import IntegrityError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import generics
from rest_framework.exceptions import AuthenticationFailed, NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import services
from .models import ProjectMembership, Role, User
from .serializers import (
    AuditEventSerializer,
    DataRetentionPolicySerializer,
    MeSerializer,
    MyProjectSerializer,
    RosterEntrySerializer,
)
from .services import get_role, has_permission


class MonitoredTokenObtainPairView(TokenObtainPairView):
    """
    Same JWT login as the default view, plus security/incident monitoring:
    a failed login is logged as an internal AlertEvent (not the
    project-anchored AuditEvent - a login attempt isn't project-scoped
    yet) so it shows up in observability's security signal. Throttled on
    the dedicated `auth` scope to slow down credential guessing.
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except AuthenticationFailed:
            import observability.services as observability

            observability.record_authentication_failure(request.data.get("email", "unknown"))
            raise


class ThrottledTokenRefreshView(TokenRefreshView):
    """Refresh shares the `auth` throttle scope with token obtain."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class GoogleAuthView(APIView):
    """
    Sign in (or register on first sign-in) with a Google ID token from the
    frontend's Google Identity Services button. The token is verified against
    GOOGLE_OAUTH_CLIENT_ID server-side before its email claim is trusted, so
    a request can't just hand over an arbitrary email/credential pair.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        credential = request.data.get("credential")
        if not credential:
            raise ValidationError({"credential": "This field is required."})
        if not settings.GOOGLE_OAUTH_CLIENT_ID:
            raise AuthenticationFailed("Google sign-in is not configured.")

        try:
            payload = google_id_token.verify_oauth2_token(
                credential, google_requests.Request(), settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError:
            import observability.services as observability

            observability.record_authentication_failure("google-oauth")
            raise AuthenticationFailed("Invalid Google credential.")

        email = payload.get("email")
        if not email or not payload.get("email_verified"):
            raise AuthenticationFailed("Google account email is not verified.")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": payload.get("given_name", ""),
                "last_name": payload.get("family_name", ""),
            },
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])

        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh)})


class MeView(generics.RetrieveAPIView):
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class MyProjectsView(APIView):
    """Projects the current user has a roster membership on, with their role.
    Also where a project comes into existence in the first place - POST
    creates it and makes the caller its Owner in the same step."""

    def get(self, request):
        memberships = ProjectMembership.objects.filter(user=request.user).select_related("project")
        projects = []
        for m in memberships:
            m.project._membership_role = m.role
            projects.append(m.project)
        serializer = MyProjectSerializer(projects, many=True)
        return Response(serializer.data)

    def post(self, request):
        name = (request.data.get("name") or "").strip()
        if not name:
            raise ValidationError({"name": "This field is required."})
        project = services.create_project(
            name=name, description=(request.data.get("description") or "").strip(), created_by=request.user,
        )
        project._membership_role = Role.OWNER
        return Response(MyProjectSerializer(project).data, status=201)


class UserSearchView(APIView):
    """Resolve an email to a user id for the roster "add member" UI - matches by exact email."""

    def get(self, request):
        email = request.query_params.get("email", "").strip()
        if not email:
            return Response([])
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            return Response([])
        return Response([{"id": user.id, "email": user.email, "full_name": user.get_full_name() or user.email}])


class RosterView(generics.ListCreateAPIView):
    """Core-baseline roster management: list + add - Module 17."""

    serializer_class = RosterEntrySerializer

    def get_queryset(self):
        # `project` is required, and the requester must actually belong to
        # it - without this, any authenticated user could list every
        # project's roster (all memberships, cross-tenant) by omitting the
        # filter, or another project's roster by guessing its id.
        project_id = self.request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(self.request.user, project) is None:
            raise NotFound("Project not found.")
        return ProjectMembership.objects.filter(project=project).select_related("user", "project")

    def create(self, request, *args, **kwargs):
        project_id = request.data.get("project")
        project = Project.objects.filter(id=project_id).first()
        if project is None:
            raise ValidationError({"project": "Required."})
        if not has_permission(request.user, project, "manage_roster"):
            raise PermissionDenied("Only project owners/admins can manage the roster.")

        role = request.data.get("role")
        if role not in Role.values:
            raise ValidationError({"role": f"Must be one of {Role.values}."})

        user_id = request.data.get("user")
        user = User.objects.filter(id=user_id).first()
        if user is None:
            raise ValidationError({"user": "Required."})

        try:
            membership = services.add_roster_member(project=project, user=user, role=role, added_by=request.user)
        except IntegrityError:
            raise ValidationError({"user": "This user is already a member of the project."})
        return Response(self.get_serializer(membership).data, status=201)


class RosterDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Reassign (PATCH `role`) or remove (DELETE) a roster entry over time - Module 17."""

    serializer_class = RosterEntrySerializer

    def get_queryset(self):
        # Scoped to projects the requester actually belongs to - otherwise
        # `retrieve` (GET) had no ownership check at all, and even the
        # write paths let a stranger fetch an out-of-project object before
        # being blocked, an existence oracle.
        return ProjectMembership.objects.filter(project__memberships__user=self.request.user).distinct().select_related("user", "project")

    def _check_permission(self, membership):
        if not has_permission(self.request.user, membership.project, "manage_roster"):
            raise PermissionDenied("Only project owners/admins can manage the roster.")

    def update(self, request, *args, **kwargs):
        membership = self.get_object()
        self._check_permission(membership)
        new_role = request.data.get("role")
        if new_role not in Role.values:
            raise ValidationError({"role": f"Must be one of {Role.values}."})
        updated = services.reassign_roster_member(membership, new_role, changed_by=request.user)
        return Response(self.get_serializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()
        self._check_permission(membership)
        services.remove_roster_member(membership, removed_by=request.user)
        return Response(status=204)


class ComplianceView(APIView):
    """Data retention + Saudi data residency status - an enforced platform property, not just a policy doc."""

    def get(self, request):
        project = self._project(request)
        return Response(services.get_compliance_status(project))

    def patch(self, request):
        project = self._project(request)
        if not has_permission(request.user, project, "manage_retention_policy"):
            raise PermissionDenied("Only project owners/admins can change the retention policy.")
        policy = services.get_retention_policy(project)
        serializer = DataRetentionPolicySerializer(policy, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(services.get_compliance_status(project))

    def _project(self, request):
        project_id = request.query_params.get("project") or request.data.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(request.user, project) is None:
            raise NotFound("Project not found.")
        return project


class AccessAuditLogView(APIView):
    """Security/access review: who did what, filterable by actor - reads trust_evidence's log, owns no data of its own."""

    def get(self, request):
        import trust_evidence.services as trust_evidence

        project_id = request.query_params.get("project")
        project = Project.objects.filter(id=project_id).first() if project_id else None
        if project is None or get_role(request.user, project) is None:
            raise NotFound("Project not found.")
        if not has_permission(request.user, project, "view_audit_log"):
            raise PermissionDenied("Only project owners/admins can view the access audit log.")

        actor_id = request.query_params.get("actor")
        actor = User.objects.filter(id=actor_id).first() if actor_id else None
        events = trust_evidence.get_audit_events(project, actor=actor)
        return Response(AuditEventSerializer(events, many=True).data)
