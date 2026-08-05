from unittest.mock import Mock, patch

import pytest
import requests

from approvals.models import RaciRole
from approvals.services import request_decision
from platform_api.auth import ApiKeyRateThrottle
from platform_api.models import ApiKeyScope, ApiKeyTier, WebhookDeliveryStatus
from platform_api.services import (
    UnsafeWebhookURL,
    authenticate_api_key,
    create_webhook_subscription,
    dispatch_webhook_event,
    generate_api_key,
    get_delivery_stats,
    retry_failed_deliveries,
    revoke_api_key,
)


@pytest.mark.django_db
def test_generate_and_authenticate_api_key(project, owner_user):
    raw_key, key = generate_api_key(project=project, label="Partner integration", scope=ApiKeyScope.OWNER, tier=ApiKeyTier.STANDARD, created_by=owner_user)
    assert raw_key.startswith("tpk_")
    assert key.key_prefix == raw_key[:8]

    resolved = authenticate_api_key(raw_key)
    assert resolved is not None
    assert resolved.id == key.id


@pytest.mark.django_db
def test_wrong_key_does_not_authenticate(project, owner_user):
    generate_api_key(project=project, label="x", scope=ApiKeyScope.OWNER, tier=ApiKeyTier.STANDARD, created_by=owner_user)
    assert authenticate_api_key("tpk_totally-wrong-key") is None


@pytest.mark.django_db
def test_revoked_key_no_longer_authenticates(project, owner_user):
    raw_key, key = generate_api_key(project=project, label="x", scope=ApiKeyScope.OWNER, tier=ApiKeyTier.STANDARD, created_by=owner_user)
    revoke_api_key(key)
    assert authenticate_api_key(raw_key) is None


@pytest.mark.django_db
def test_throttle_rate_is_selected_by_tier(project, owner_user):
    _, standard_key = generate_api_key(project=project, label="std", scope=ApiKeyScope.OWNER, tier=ApiKeyTier.STANDARD, created_by=owner_user)
    _, partner_key = generate_api_key(project=project, label="ptn", scope=ApiKeyScope.OWNER, tier=ApiKeyTier.PARTNER, created_by=owner_user)

    throttle = ApiKeyRateThrottle()
    request = Mock(auth=standard_key)
    with patch.object(ApiKeyRateThrottle, "get_cache_key", return_value=None):
        throttle.allow_request(request, view=None)
    assert throttle.rate == "100/hour"

    throttle2 = ApiKeyRateThrottle()
    request2 = Mock(auth=partner_key)
    with patch.object(ApiKeyRateThrottle, "get_cache_key", return_value=None):
        throttle2.allow_request(request2, view=None)
    assert throttle2.rate == "1000/hour"


@pytest.mark.django_db
def test_webhook_dispatch_success(project, owner_user):
    create_webhook_subscription(project=project, target_url="https://example.com/hook", event_types=["approval.requested"], created_by=owner_user)

    with patch("platform_api.services.requests.post") as mock_post:
        mock_post.return_value = Mock(status_code=200)
        deliveries = dispatch_webhook_event(project, "approval.requested", {"decision_id": 1})

    assert len(deliveries) == 1
    assert deliveries[0].status == WebhookDeliveryStatus.SUCCESS
    assert deliveries[0].attempt_count == 1


@pytest.mark.django_db
def test_webhook_dispatch_skips_non_matching_event_types(project, owner_user):
    create_webhook_subscription(project=project, target_url="https://example.com/hook", event_types=["evidence.verified"], created_by=owner_user)

    with patch("platform_api.services.requests.post") as mock_post:
        deliveries = dispatch_webhook_event(project, "approval.requested", {})

    assert deliveries == []
    mock_post.assert_not_called()


@pytest.mark.django_db
def test_webhook_failure_then_retry_eventually_dead_letters(project, owner_user):
    create_webhook_subscription(project=project, target_url="https://example.com/hook", event_types=["approval.requested"], created_by=owner_user)

    with patch("platform_api.services.requests.post", side_effect=requests.RequestException("connection refused")):
        deliveries = dispatch_webhook_event(project, "approval.requested", {})
        delivery = deliveries[0]
        assert delivery.status == WebhookDeliveryStatus.FAILED

        for _ in range(10):  # far more than MAX_WEBHOOK_ATTEMPTS
            retry_failed_deliveries(project=project)
            delivery.refresh_from_db()
            if delivery.status == WebhookDeliveryStatus.DEAD_LETTER:
                break

    assert delivery.status == WebhookDeliveryStatus.DEAD_LETTER
    assert delivery.attempt_count == 5


@pytest.mark.django_db
def test_delivery_stats_reflects_outcomes(project, owner_user):
    create_webhook_subscription(project=project, target_url="https://example.com/hook", event_types=["approval.requested"], created_by=owner_user)

    with patch("platform_api.services.requests.post") as mock_post:
        mock_post.return_value = Mock(status_code=200)
        dispatch_webhook_event(project, "approval.requested", {})

    stats = get_delivery_stats(project)
    assert stats["success"] == 1


@pytest.mark.django_db
def test_request_decision_dispatches_approval_requested_webhook(project, owner_user):
    create_webhook_subscription(project=project, target_url="https://example.com/hook", event_types=["approval.requested"], created_by=owner_user)

    with patch("platform_api.services.requests.post") as mock_post:
        mock_post.return_value = Mock(status_code=200)
        request_decision(
            project=project, title="Test", requested_by=owner_user,
            raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}],
        )

    stats = get_delivery_stats(project)
    assert stats["success"] == 1


# --- SSRF guard ---------------------------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize("unsafe_url", [
    "http://127.0.0.1/hook",
    "http://localhost:8010/hook",
    "http://169.254.169.254/latest/meta-data/",  # cloud metadata endpoint
    "http://192.168.1.1/hook",
    "http://10.0.0.5/hook",
    "ftp://example.com/hook",
])
def test_create_webhook_subscription_rejects_unsafe_urls(project, owner_user, unsafe_url):
    with pytest.raises((UnsafeWebhookURL, ValueError)):
        create_webhook_subscription(project=project, target_url=unsafe_url, event_types=["approval.requested"], created_by=owner_user)


@pytest.mark.django_db
def test_create_webhook_subscription_accepts_public_url(project, owner_user):
    subscription = create_webhook_subscription(project=project, target_url="https://example.com/hook", event_types=["approval.requested"], created_by=owner_user)
    assert subscription.id is not None


@pytest.mark.django_db
def test_dispatch_revalidates_url_and_dead_letters_on_dns_rebind(project, owner_user):
    """Even a subscription that was safe at creation time is re-checked at dispatch (DNS rebinding defense)."""
    subscription = create_webhook_subscription(project=project, target_url="https://example.com/hook", event_types=["approval.requested"], created_by=owner_user)
    # Simulate the hostname now resolving internally by pointing the
    # subscription at a private-IP literal directly (bypassing DNS).
    subscription.target_url = "http://10.1.2.3/hook"
    subscription.save(update_fields=["target_url"])

    with patch("platform_api.services.requests.post") as mock_post:
        deliveries = dispatch_webhook_event(project, "approval.requested", {})

    mock_post.assert_not_called()
    assert deliveries[0].status == WebhookDeliveryStatus.DEAD_LETTER
    assert "disallowed address" in deliveries[0].last_error


@pytest.mark.django_db
def test_webhook_post_does_not_follow_redirects(project, owner_user):
    create_webhook_subscription(project=project, target_url="https://example.com/hook", event_types=["approval.requested"], created_by=owner_user)

    with patch("platform_api.services.requests.post") as mock_post:
        mock_post.return_value = Mock(status_code=200)
        dispatch_webhook_event(project, "approval.requested", {})

    assert mock_post.call_args.kwargs["allow_redirects"] is False


@pytest.mark.django_db
def test_webhook_subscription_endpoint_returns_400_not_500_for_unsafe_url(project, owner_user):
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post(
        "/api/v1/platform-api/webhook-subscriptions/",
        {"project": project.id, "target_url": "http://169.254.169.254/latest/meta-data/", "event_types": ["approval.requested"]},
        format="json",
    )
    assert response.status_code == 400
    assert "target_url" in response.json()
