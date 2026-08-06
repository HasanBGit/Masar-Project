from rest_framework import serializers

from .models import EmailAccount, EmailMessage


class EmailAccountSerializer(serializers.ModelSerializer):
    connected_by_name = serializers.CharField(source="connected_by.get_full_name", read_only=True)

    class Meta:
        model = EmailAccount
        fields = ["id", "project", "email_address", "connected_by", "connected_by_name", "last_synced_at", "created_at"]
        read_only_fields = fields


class EmailMessageSerializer(serializers.ModelSerializer):
    read_by_name = serializers.SerializerMethodField()
    decision_id = serializers.SerializerMethodField()
    decision_status = serializers.SerializerMethodField()

    class Meta:
        model = EmailMessage
        fields = [
            "id", "project", "gmail_thread_id", "from_address", "subject", "snippet",
            "category", "requires_action", "received_at", "read_at", "read_by", "read_by_name",
            "decision_id", "decision_status", "created_at",
        ]
        read_only_fields = fields

    def get_read_by_name(self, obj):
        if not obj.read_by:
            return None
        return obj.read_by.get_full_name() or obj.read_by.email

    def _decision(self, obj):
        return self.context.get("decisions_by_subject_ref", {}).get(str(obj.id))

    def get_decision_id(self, obj):
        decision = self._decision(obj)
        return decision.id if decision else None

    def get_decision_status(self, obj):
        decision = self._decision(obj)
        return decision.status if decision else None
