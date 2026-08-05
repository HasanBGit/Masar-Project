"""HTTP-level auth tests: JWT obtain/refresh plus the `auth`-scope throttle."""

from unittest.mock import patch

import pytest
from django.core.cache import cache
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.test import APIClient

TOKEN_URL = "/api/v1/auth/token/"
REFRESH_URL = "/api/v1/auth/token/refresh/"


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
def test_token_obtain_throttles_rapid_failures(owner_user):
    # patch.dict rather than override_settings: SimpleRateThrottle captures
    # THROTTLE_RATES at import time, so swapping REST_FRAMEWORK wholesale
    # would not reach an already-imported throttle class.
    client = APIClient()
    statuses = []
    with patch.dict(ScopedRateThrottle.THROTTLE_RATES, {"auth": "3/min"}):
        for _ in range(6):  # rate is 3/min in this test
            response = client.post(TOKEN_URL, {"email": "owner@test.local", "password": "wrong-password"})
            statuses.append(response.status_code)
    assert 429 in statuses
    assert statuses[-1] == 429
