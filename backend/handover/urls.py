from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import HandoverRecordView, OMChecklistItemViewSet, PostHandoverDefectViewSet, PunchListItemViewSet

router = DefaultRouter()
router.register("punch-list", PunchListItemViewSet, basename="punch-list-item")
router.register("om-checklist", OMChecklistItemViewSet, basename="om-checklist-item")
router.register("post-handover-defects", PostHandoverDefectViewSet, basename="post-handover-defect")

urlpatterns = [
    path("record/", HandoverRecordView.as_view(), name="handover-record"),
] + router.urls
