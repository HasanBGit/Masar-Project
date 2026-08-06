from rest_framework.routers import DefaultRouter

from .views import DrawingCommentViewSet, DrawingModelViewSet

router = DefaultRouter()
router.register("models", DrawingModelViewSet, basename="drawing-model")
router.register("comments", DrawingCommentViewSet, basename="drawing-comment")

urlpatterns = router.urls
