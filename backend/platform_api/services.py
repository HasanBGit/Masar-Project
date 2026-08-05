"""
Service layer for Module 14. `platform_api` is a facade - every read here
calls another module's own service layer (approvals, trust_evidence, ...),
never that module's models directly. See skills/platform-api/SKILL.md.
"""

import hashlib
import hmac
import ipaddress
import json
import secrets
import socket
from urllib.parse import urlsplit

import requests
from django.utils import timezone

from .models import MAX_WEBHOOK_ATTEMPTS, APIKey, WebhookDelivery, WebhookDeliveryStatus, WebhookSubscription

WEBHOOK_TIMEOUT_SECONDS = 5


class UnsafeWebhookURL(ValueError):
    pass


def _assert_safe_webhook_url(url: str) -> None:
    """
    SSRF guard. A webhook target is attacker-influenced input (any project
    owner can set it) that our server then makes a request to - without
    this check, it's a direct path to the cloud metadata endpoint, an
    internal service, or any RFC1918/loopback address. Re-checked at
    dispatch time too (not just at subscription creation), since DNS can
    change between the two.
    """
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise UnsafeWebhookURL("Webhook URL must be http or https.")
    if not parts.hostname:
        raise UnsafeWebhookURL("Webhook URL must include a host.")

    try:
        resolved = socket.getaddrinfo(parts.hostname, None)
    except socket.gaierror as exc:
        raise UnsafeWebhookURL(f"Could not resolve webhook host: {exc}")

    for family, _, _, _, sockaddr in resolved:
        ip = ipaddress.ip_address(sockaddr[0])
        # Deliberately NOT checking `is_reserved` - that IANA category also
        # covers things like the NAT64 well-known prefix (64:ff9b::/96),
        # which some networks use to reach an otherwise-public IPv4 address
        # and isn't itself an SSRF risk. `is_private` already covers every
        # actually-dangerous range (RFC1918, loopback, link-local/cloud
        # metadata, ULA) for both IPv4 and IPv6.
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_unspecified:
            raise UnsafeWebhookURL(f"Webhook host resolves to a disallowed address ({ip}).")


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def generate_api_key(*, project, label: str, scope: str, tier: str, created_by) -> tuple[str, APIKey]:
    """Returns (raw_key, APIKey) - the raw key is only ever available here, at creation time."""
    raw_key = f"tpk_{secrets.token_urlsafe(32)}"
    key = APIKey.objects.create(
        project=project, label=label, scope=scope, tier=tier,
        key_prefix=raw_key[:8], key_hash=_hash_key(raw_key), created_by=created_by,
    )
    return raw_key, key


def authenticate_api_key(raw_key: str) -> APIKey | None:
    key = APIKey.objects.filter(key_hash=_hash_key(raw_key)).select_related("project").first()
    if key is None or not key.is_active:
        return None
    return key


def revoke_api_key(key: APIKey) -> APIKey:
    key.revoked_at = timezone.now()
    key.save(update_fields=["revoked_at", "updated_at"])
    return key


def list_api_keys(project) -> list[APIKey]:
    return list(APIKey.objects.filter(project=project))


# --- Webhooks ----------------------------------------------------------


def create_webhook_subscription(*, project, target_url: str, event_types: list[str], created_by) -> WebhookSubscription:
    _assert_safe_webhook_url(target_url)
    return WebhookSubscription.objects.create(project=project, target_url=target_url, event_types=event_types, created_by=created_by)


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _attempt_delivery(delivery: WebhookDelivery) -> None:
    subscription = delivery.subscription
    body = json.dumps({"event_type": delivery.event_type, "payload": delivery.payload}).encode()
    delivery.attempt_count += 1
    delivery.last_attempted_at = timezone.now()
    try:
        # Re-validated here, not just at subscription-creation time - DNS
        # can change between the two (rebinding), and this is the point
        # our server actually opens the connection.
        _assert_safe_webhook_url(subscription.target_url)
        response = requests.post(
            subscription.target_url, data=body, timeout=WEBHOOK_TIMEOUT_SECONDS,
            headers={"Content-Type": "application/json", "X-Truepoint-Signature": _sign(subscription.secret, body)},
            allow_redirects=False,  # a redirect Location is attacker-controlled from here on; don't blindly follow it
        )
        delivery.last_response_code = response.status_code
        if 200 <= response.status_code < 300:
            delivery.status = WebhookDeliveryStatus.SUCCESS
        else:
            delivery.last_error = f"HTTP {response.status_code}"
            delivery.status = WebhookDeliveryStatus.DEAD_LETTER if delivery.attempt_count >= MAX_WEBHOOK_ATTEMPTS else WebhookDeliveryStatus.FAILED
    except UnsafeWebhookURL as exc:
        delivery.last_error = str(exc)[:500]
        delivery.status = WebhookDeliveryStatus.DEAD_LETTER  # not retryable - the URL itself is the problem
    except requests.RequestException as exc:
        delivery.last_error = str(exc)[:500]
        delivery.status = WebhookDeliveryStatus.DEAD_LETTER if delivery.attempt_count >= MAX_WEBHOOK_ATTEMPTS else WebhookDeliveryStatus.FAILED
    delivery.save(update_fields=["status", "attempt_count", "last_attempted_at", "last_response_code", "last_error", "updated_at"])


def dispatch_webhook_event(project, event_type: str, payload: dict) -> list[WebhookDelivery]:
    """Fires (synchronously - see README for the production async-queue note) every active matching subscription."""
    deliveries = []
    subscriptions = WebhookSubscription.objects.filter(project=project, is_active=True)
    for subscription in subscriptions:
        if event_type not in subscription.event_types:
            continue
        delivery = WebhookDelivery.objects.create(subscription=subscription, event_type=event_type, payload=payload)
        _attempt_delivery(delivery)
        deliveries.append(delivery)
    return deliveries


def retry_failed_deliveries(project=None) -> int:
    """Sweep for a scheduled retry job - re-attempts anything not yet SUCCESS or DEAD_LETTER."""
    qs = WebhookDelivery.objects.filter(status=WebhookDeliveryStatus.FAILED)
    if project is not None:
        qs = qs.filter(subscription__project=project)
    count = 0
    for delivery in qs:
        _attempt_delivery(delivery)
        count += 1
    return count


def get_delivery_stats(project=None) -> dict:
    """Read by observability (Module 15) - webhook delivery success/retry/dead-letter visibility."""
    qs = WebhookDelivery.objects.all()
    if project is not None:
        qs = qs.filter(subscription__project=project)
    return {
        "success": qs.filter(status=WebhookDeliveryStatus.SUCCESS).count(),
        "failed_pending_retry": qs.filter(status=WebhookDeliveryStatus.FAILED).count(),
        "dead_letter": qs.filter(status=WebhookDeliveryStatus.DEAD_LETTER).count(),
    }
