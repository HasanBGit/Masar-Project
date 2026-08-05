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
