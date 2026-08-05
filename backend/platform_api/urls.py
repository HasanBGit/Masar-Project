"""Public/partner API facade - API-key authenticated, mounted at /api/public/v1/."""

from django.urls import path

from .views import PublicActivityView, PublicApprovalsView, PublicEvidenceView

urlpatterns = [
    path("projects/<int:project_id>/approvals/", PublicApprovalsView.as_view(), name="public-approvals"),
    path("projects/<int:project_id>/evidence/", PublicEvidenceView.as_view(), name="public-evidence"),
    path("projects/<int:project_id>/activity/", PublicActivityView.as_view(), name="public-activity"),
]
