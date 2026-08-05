from rest_framework import serializers

from .models import AlertEvent, DigestOpenEvent, IntegrationHealthCheck


class IntegrationHealthCheckSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)

    class Meta:
        model = IntegrationHealthCheck
        fields = ["id", "project", "project_name", "integration_type", "status", "last_checked_at", "last_error", "details"]


class AlertEventSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)
    acknowledged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AlertEvent
        fields = [
            "id", "severity", "source", "message", "project", "project_name",
            "acknowledged", "acknowledged_by", "acknowledged_by_name", "acknowledged_at", "created_at",
        ]
        read_only_fields = ["acknowledged", "acknowledged_by", "acknowledged_at", "created_at"]

    def get_acknowledged_by_name(self, obj):
        if not obj.acknowledged_by:
            return None
        return obj.acknowledged_by.get_full_name() or obj.acknowledged_by.email
