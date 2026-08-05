from rest_framework import serializers

from .models import APIKey, ApiKeyScope, ApiKeyTier, WebhookDelivery, WebhookEventType, WebhookSubscription


class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ["id", "project", "label", "scope", "tier", "key_prefix", "is_active", "created_at", "revoked_at"]
        read_only_fields = fields


class APIKeyCreateSerializer(serializers.Serializer):
    """Input validation for key issuance - the project itself comes from the
    membership-checked `_project()` lookup in the view, never from here."""

    label = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    scope = serializers.ChoiceField(choices=ApiKeyScope.choices)
    tier = serializers.ChoiceField(choices=ApiKeyTier.choices, default=ApiKeyTier.STANDARD)


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    event_types = serializers.ListField(
        child=serializers.ChoiceField(choices=WebhookEventType.choices), allow_empty=True
    )

    class Meta:
        model = WebhookSubscription
        # `secret` is deliberately absent - it is returned exactly once, in
        # the create response (see WebhookSubscriptionViewSet.create).
        fields = ["id", "project", "target_url", "event_types", "is_active", "created_at"]
        read_only_fields = ["created_at"]


class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = ["id", "subscription", "event_type", "status", "attempt_count", "last_attempted_at", "last_response_code", "last_error"]


# --- Public-facing (facade) shapes - deliberately independent of the
# internal serializers those modules use, per platform-api's "facade, not
# reimplementation" rule; only the fields a third party actually needs. ---


class PublicApprovalSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    status = serializers.CharField()
    high_stakes = serializers.BooleanField()
    sla_deadline = serializers.DateTimeField()
    created_at = serializers.DateTimeField()


class PublicEvidenceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    subject_type = serializers.CharField()
    subject_id = serializers.CharField()
    caption = serializers.CharField()
    verified = serializers.BooleanField()
    captured_at = serializers.DateTimeField()


class PublicActivityEventSerializer(serializers.Serializer):
    event_type = serializers.CharField()
    subject_type = serializers.CharField()
    subject_id = serializers.CharField()
    timestamp = serializers.DateTimeField(source="created_at")
