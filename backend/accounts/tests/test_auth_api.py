"""HTTP-level auth tests: JWT obtain/refresh plus the `auth`-scope throttle."""

import pytest
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient

TOKEN_URL = "/api/v1/auth/token/"
REFRESH_URL = "/api/v1/auth/token/refresh/"

THROTTLED_REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "EXCEPTION_HANDLER": "config.exception_handlers.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "auth": "3/min",  # low so the test trips it quickly
        "api_key": "100/hour",
    },
}


@pytest.fixture(autouse=True)
def _clear_throttle_history():
    # Throttle counters live in the (process-wide) cache and would otherwise
    # leak between tests in this module.
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_token_obtain_success(owner_user):
    client = APIClient()
    response = client.post(TOKEN_URL, {"email": "owner@test.local", "password": "testpass123"})
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_token_obtain_bad_credentials_returns_401_and_logs_alert(owner_user):
    from observability.models import AlertEvent

    client = APIClient()
    response = client.post(TOKEN_URL, {"email": "owner@test.local", "password": "wrong-password"})
    assert response.status_code == 401
    assert AlertEvent.objects.filter(source="security", message__contains="owner@test.local").exists()


@pytest.mark.django_db
def test_token_refresh(owner_user):
    client = APIClient()
    obtain = client.post(TOKEN_URL, {"email": "owner@test.local", "password": "testpass123"})
    assert obtain.status_code == 200

    refresh = client.post(REFRESH_URL, {"refresh": obtain.data["refresh"]})
    assert refresh.status_code == 200
    assert "access" in refresh.data


@pytest.mark.django_db
@override_settings(REST_FRAMEWORK=THROTTLED_REST_FRAMEWORK)
def test_token_obtain_throttles_rapid_failures(owner_user):
    client = APIClient()
    statuses = []
    for _ in range(6):  # rate is 3/min in this test
        response = client.post(TOKEN_URL, {"email": "owner@test.local", "password": "wrong-password"})
        statuses.append(response.status_code)
    assert 429 in statuses
    assert statuses[-1] == 429
