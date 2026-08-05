"""Project-admin-facing key/webhook management - JWT-authenticated, mounted at /api/v1/platform-api/."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import APIKeyViewSet, WebhookDeliveryListView, WebhookSubscriptionViewSet

router = DefaultRouter()
router.register("api-keys", APIKeyViewSet, basename="api-key")
router.register("webhook-subscriptions", WebhookSubscriptionViewSet, basename="webhook-subscription")

urlpatterns = [
    path("webhook-deliveries/", WebhookDeliveryListView.as_view(), name="webhook-deliveries"),
] + router.urls
