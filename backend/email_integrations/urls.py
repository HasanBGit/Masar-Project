from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CallbackView, ConnectUrlView, EmailAccountView, EmailMessageViewSet, SyncView

router = DefaultRouter()
router.register("messages", EmailMessageViewSet, basename="email-message")

urlpatterns = [
    path("account/", EmailAccountView.as_view(), name="email-account"),
    path("connect-url/", ConnectUrlView.as_view(), name="email-connect-url"),
    path("callback/", CallbackView.as_view(), name="email-callback"),
    path("sync/", SyncView.as_view(), name="email-sync"),
] + router.urls
