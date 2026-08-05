from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AlertViewSet,
    IntegrationHealthView,
    QuietProjectsView,
    SecurityEventsView,
    SlaComplianceView,
    SystemHealthCheckView,
)

router = DefaultRouter()
router.register("alerts", AlertViewSet, basename="alert")

urlpatterns = [
    path("health/", SystemHealthCheckView.as_view(), name="system-health"),
    path("integration-health/", IntegrationHealthView.as_view(), name="integration-health"),
    path("sla-compliance/", SlaComplianceView.as_view(), name="sla-compliance"),
    path("quiet-projects/", QuietProjectsView.as_view(), name="quiet-projects"),
    path("security-events/", SecurityEventsView.as_view(), name="security-events"),
] + router.urls

