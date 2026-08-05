from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.throttling import SimpleRateThrottle

from . import services
from .models import TIER_RATES


class APIKeyPrincipal:
    """Not a Django User - a lightweight stand-in so DRF's IsAuthenticated check passes for a valid API key."""

    is_authenticated = True

    def __init__(self, api_key):
        self.api_key = api_key
        self.project = api_key.project
        self.scope = api_key.scope


class ApiKeyAuthentication(BaseAuthentication):
    """`Authorization: ApiKey <raw_key>` - the public API's only auth method (never session/JWT)."""

    keyword = "ApiKey"

    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header.startswith(f"{self.keyword} "):
            return None
        raw_key = header[len(self.keyword) + 1:].strip()
        api_key = services.authenticate_api_key(raw_key)
        if api_key is None:
            raise AuthenticationFailed("Invalid or revoked API key.")
        return (APIKeyPrincipal(api_key), api_key)


class ApiKeyAuthenticationScheme(OpenApiAuthenticationExtension):
    """Documents the `Authorization: ApiKey <key>` scheme in the OpenAPI spec / Swagger UI's "Authorize" dialog."""

    target_class = "platform_api.auth.ApiKeyAuthentication"
    name = "ApiKeyAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "header", "name": "Authorization", "description": "Format: `ApiKey <your_key>`"}


class ApiKeyRateThrottle(SimpleRateThrottle):
    """Rate is per-key, tiered by `APIKey.tier`. `rate` is a fallback default - `allow_request` overrides it per-key."""

    scope = "api_key"
    rate = "100/hour"

    def allow_request(self, request, view):
        api_key = getattr(request, "auth", None)
        if api_key is None:
            return True  # no key resolved - ApiKeyAuthentication already rejects this before throttling matters
        self.rate = TIER_RATES[api_key.tier]
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        api_key = getattr(request, "auth", None)
        if api_key is None:
            return None
        return f"throttle_api_key_{api_key.key_hash}"
