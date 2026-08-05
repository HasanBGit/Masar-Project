from rest_framework import serializers

from .models import HandoverRecord, OMChecklistItem, PostHandoverDefect, PunchListItem


class HandoverRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = HandoverRecord
        fields = ["id", "project", "practical_completion_date", "decennial_liability_expires_at", "recorded_by"]
        read_only_fields = ["decennial_liability_expires_at", "recorded_by"]


class PracticalCompletionSerializer(serializers.Serializer):
    """Input validation for HandoverRecordView.post - a plain serializer (not
    the ModelSerializer above) so re-recording an existing project's date
    doesn't trip the OneToOne unique validator; the service upserts."""

    practical_completion_date = serializers.DateField()


class PunchListItemSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True)
    assigned_approver_name = serializers.SerializerMethodField()

    class Meta:
        model = PunchListItem
        fields = [
            "id", "project", "unit_or_zone", "title", "description", "raised_by", "raised_by_name",
            "status", "assigned_approver", "assigned_approver_name", "created_at",
        ]
        read_only_fields = ["raised_by", "status", "assigned_approver", "created_at"]

    def get_assigned_approver_name(self, obj):
        if not obj.assigned_approver:
            return None
        return obj.assigned_approver.get_full_name() or obj.assigned_approver.email


class OMChecklistItemSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OMChecklistItem
        fields = [
            "id", "project", "category", "description_en", "description_ar", "document_ref",
            "installed_verified", "verified_by", "verified_by_name", "verified_at", "created_at",
        ]
        read_only_fields = ["installed_verified", "verified_by", "verified_at", "created_at"]

    def get_verified_by_name(self, obj):
        if not obj.verified_by:
            return None
        return obj.verified_by.get_full_name() or obj.verified_by.email


class PostHandoverDefectSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.CharField(source="reported_by.get_full_name", read_only=True)

    class Meta:
        model = PostHandoverDefect
        fields = [
            "id", "project", "unit_or_zone", "title", "description", "reported_by", "reported_by_name",
            "status", "created_at",
        ]
        read_only_fields = ["reported_by", "status", "created_at"]
