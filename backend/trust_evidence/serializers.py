from django.utils import timezone
from rest_framework import serializers

from .models import EvidenceRecord, SilenceFlag


class EvidenceRecordSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EvidenceRecord
        fields = [
            "id",
            "project",
            "subject_type",
            "subject_id",
            "submitted_by",
            "submitted_by_name",
            "caption",
            "media_url",
            "latitude",
            "longitude",
            "captured_at",
            "verified",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "created_at",
        ]
        read_only_fields = ["verified", "verified_by", "verified_at", "created_at"]

    def validate_latitude(self, value):
        if value is not None and not (-90 <= value <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is not None and not (-180 <= value <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate_captured_at(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("captured_at cannot be in the future.")
        return value

    def get_submitted_by_name(self, obj):
        return obj.submitted_by.get_full_name() or obj.submitted_by.email

    def get_verified_by_name(self, obj):
        if not obj.verified_by:
            return None
        return obj.verified_by.get_full_name() or obj.verified_by.email


class SilenceFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = SilenceFlag
        fields = ["id", "project", "subject_type", "subject_id", "expected_by", "flagged_at", "resolved", "resolved_at"]
