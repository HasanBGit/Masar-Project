"""HTTP-level auth tests: JWT obtain/refresh plus the `auth`-scope throttle."""

from unittest.mock import patch

import pytest
from django.core.cache import cache
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.test import APIClient

TOKEN_URL = "/api/v1/auth/token/"
REFRESH_URL = "/api/v1/auth/token/refresh/"
GOOGLE_URL = "/api/v1/auth/google/"


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


@pytest.mark.django_db
def test_google_auth_creates_a_user_on_first_sign_in(settings):
    from accounts.models import User

    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    client = APIClient()
    with patch("accounts.views.google_id_token.verify_oauth2_token") as verify:
        verify.return_value = {
            "email": "new.googler@gmail.com",
            "email_verified": True,
            "given_name": "New",
            "family_name": "Googler",
        }
        response = client.post(GOOGLE_URL, {"credential": "fake-credential"})

    assert response.status_code == 200
    assert "access" in response.data and "refresh" in response.data
    user = User.objects.get(email="new.googler@gmail.com")
    assert user.first_name == "New"
    assert not user.has_usable_password()


@pytest.mark.django_db
def test_google_auth_signs_in_an_existing_user(settings, owner_user):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    client = APIClient()
    with patch("accounts.views.google_id_token.verify_oauth2_token") as verify:
        verify.return_value = {"email": owner_user.email, "email_verified": True}
        response = client.post(GOOGLE_URL, {"credential": "fake-credential"})

    assert response.status_code == 200


@pytest.mark.django_db
def test_google_auth_rejects_an_invalid_credential(settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    client = APIClient()
    with patch("accounts.views.google_id_token.verify_oauth2_token", side_effect=ValueError("bad token")):
        response = client.post(GOOGLE_URL, {"credential": "garbage"})

    assert response.status_code == 401


@pytest.mark.django_db
def test_google_auth_rejects_an_unverified_email(settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    client = APIClient()
    with patch("accounts.views.google_id_token.verify_oauth2_token") as verify:
        verify.return_value = {"email": "unverified@gmail.com", "email_verified": False}
        response = client.post(GOOGLE_URL, {"credential": "fake-credential"})

    assert response.status_code == 401


@pytest.mark.django_db
def test_google_auth_requires_a_configured_client_id(settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    client = APIClient()
    response = client.post(GOOGLE_URL, {"credential": "fake-credential"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_google_auth_requires_a_credential():
    client = APIClient()
    response = client.post(GOOGLE_URL, {})
    assert response.status_code == 400
