from rest_framework.routers import DefaultRouter

from .views import DrawingModelViewSet

router = DefaultRouter()
router.register("models", DrawingModelViewSet, basename="drawing-model")

urlpatterns = router.urls
