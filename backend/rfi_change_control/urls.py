from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AtRiskRFIView,
    ChangeOrderViewSet,
    CoordinationThreadViewSet,
    MasterScheduleView,
    PermitViewSet,
    QualityCheckpointViewSet,
    RFIViewSet,
    SubmittalViewSet,
    SupplierDeliveryViewSet,
)

router = DefaultRouter()
router.register("rfis", RFIViewSet, basename="rfi")
router.register("change-orders", ChangeOrderViewSet, basename="change-order")
router.register("submittals", SubmittalViewSet, basename="submittal")
router.register("permits", PermitViewSet, basename="permit")
router.register("supplier-deliveries", SupplierDeliveryViewSet, basename="supplier-delivery")
router.register("quality-checkpoints", QualityCheckpointViewSet, basename="quality-checkpoint")
router.register("coordination-threads", CoordinationThreadViewSet, basename="coordination-thread")

# Static paths must come before the router's `rfis/<pk>/` pattern, or
# "at-risk" gets swallowed as a pk lookup.
urlpatterns = [
    path("rfis/at-risk/", AtRiskRFIView.as_view(), name="rfi-at-risk"),
    path("master-schedule/", MasterScheduleView.as_view(), name="master-schedule"),
] + router.urls
