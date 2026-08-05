from django.urls import path

from .views import (
    AccessAuditLogView,
    ComplianceView,
    MeView,
    MyProjectsView,
    RosterDetailView,
    RosterView,
    UserSearchView,
)

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("projects/", MyProjectsView.as_view(), name="my-projects"),
    path("users/", UserSearchView.as_view(), name="user-search"),
    path("roster/", RosterView.as_view(), name="roster"),
    path("roster/<int:pk>/", RosterDetailView.as_view(), name="roster-detail"),
    path("compliance/", ComplianceView.as_view(), name="compliance"),
    path("audit-log/", AccessAuditLogView.as_view(), name="audit-log"),
]
