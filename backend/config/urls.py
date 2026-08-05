from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from accounts.views import MonitoredTokenObtainPairView, ThrottledTokenRefreshView
from observability.views import SystemHealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", SystemHealthCheckView.as_view(), name="health_check"),
    # User.USERNAME_FIELD = "email", so simplejwt's default serializer

    # already expects {"email": ..., "password": ...} - no override needed.
    path("api/v1/auth/token/", MonitoredTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/accounts/", include("accounts.urls")),
    path("api/v1/approvals/", include("approvals.urls")),
    path("api/v1/dashboard/", include("dashboard.urls")),
    path("api/v1/trust-evidence/", include("trust_evidence.urls")),
    path("api/v1/rfi-change-control/", include("rfi_change_control.urls")),
    path("api/v1/handover/", include("handover.urls")),
    path("api/v1/observability/", include("observability.urls")),
    path("api/v1/drawings-studio/", include("drawings_studio.urls")),
    path("api/v1/contract-payments/", include("contract_payments.urls")),
    path("api/v1/platform-api/", include("platform_api.urls_internal")),
    path("api/public/v1/", include("platform_api.urls")),
    # Developer documentation portal (Module 14) - drf-spectacular generates
    # the OpenAPI 3 schema from the /api/public/v1/ facade; Swagger UI and
    # Redoc are both self-hosted via drf-spectacular-sidecar (no CDN).
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    # Dev-only: serve uploaded drawing models straight off disk.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
