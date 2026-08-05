from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChangeOrderRollupView, DisputeExportView, EvidenceRecordViewSet, SilenceFlagListView

router = DefaultRouter()
router.register("evidence", EvidenceRecordViewSet, basename="evidence")
router.register("silence-flags", SilenceFlagListView, basename="silence-flag")

urlpatterns = router.urls + [
    path("dispute-export/", DisputeExportView.as_view(), name="dispute-export"),
    path("change-order-rollup/", ChangeOrderRollupView.as_view(), name="change-order-rollup"),
]
