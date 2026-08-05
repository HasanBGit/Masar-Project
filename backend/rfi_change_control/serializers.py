from rest_framework import serializers

from .models import ChangeOrder, CoordinationMessage, CoordinationThread, Permit, QualityCheckpoint, RFI, Submittal, SupplierDelivery

MIN_SCOPE_DELTA_LENGTH = 15


class RFISerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True)

    class Meta:
        model = RFI
        fields = [
            "id", "project", "number", "title", "question", "response", "schedule_impact_days",
            "location_tag", "raised_by", "raised_by_name", "status", "sla_deadline", "is_overdue", "created_at",
        ]
        read_only_fields = ["number", "response", "status", "raised_by", "created_at"]


class ChangeOrderSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True)

    class Meta:
        model = ChangeOrder
        fields = [
            "id", "project", "title", "baseline_scope", "scope_delta", "cost_impact",
            "schedule_impact_days", "evidence_ref", "raised_by", "raised_by_name", "status", "created_at",
        ]
        read_only_fields = ["raised_by", "status", "created_at"]

    def validate_scope_delta(self, value):
        if len(value.strip()) < MIN_SCOPE_DELTA_LENGTH:
            raise serializers.ValidationError(
                "Describe the scope delta specifically - structured change orders require real detail, not a placeholder."
            )
        return value


class SubmittalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submittal
        fields = ["id", "project", "title", "spec_section", "description", "revision_number", "current_as_of", "submitted_by", "status", "created_at"]
        read_only_fields = ["submitted_by", "status", "current_as_of", "created_at"]


class PermitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permit
        fields = ["id", "project", "title", "authority", "permit_number", "current_as_of", "status", "created_at"]
        read_only_fields = ["status", "current_as_of", "created_at"]


class SupplierDeliverySerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = SupplierDelivery
        fields = ["id", "project", "material", "supplier_name", "committed_date", "status", "is_overdue", "created_at"]
        read_only_fields = ["status", "created_at"]


class QualityCheckpointSerializer(serializers.ModelSerializer):
    inspector_name = serializers.CharField(source="inspector.get_full_name", read_only=True)

    class Meta:
        model = QualityCheckpoint
        fields = ["id", "project", "title", "milestone_ref", "location_tag", "inspector", "inspector_name", "status", "created_at"]
        read_only_fields = ["status", "created_at"]


class CoordinationMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = CoordinationMessage
        fields = ["id", "thread", "author", "author_name", "body", "created_at"]
        read_only_fields = ["author", "created_at"]


class CoordinationThreadSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    messages = CoordinationMessageSerializer(many=True, read_only=True)

    class Meta:
        model = CoordinationThread
        fields = ["id", "project", "location_tag", "title", "created_by", "created_by_name", "messages", "created_at"]
        read_only_fields = ["created_by", "created_at"]


class MasterScheduleItemSerializer(serializers.Serializer):
    type = serializers.CharField()
    id = serializers.IntegerField()
    title = serializers.CharField()
    date = serializers.DateTimeField()
    status = serializers.CharField()
