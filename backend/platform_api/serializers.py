from rest_framework import serializers

from .models import APIKey, WebhookDelivery, WebhookSubscription


class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ["id", "project", "label", "scope", "tier", "key_prefix", "is_active", "created_at", "revoked_at"]
        read_only_fields = fields


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookSubscription
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
