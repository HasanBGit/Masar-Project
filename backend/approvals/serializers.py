from rest_framework import serializers

from .models import Decision, DecisionParticipant


class DecisionParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = DecisionParticipant
        fields = ["id", "user", "user_name", "raci_role"]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class DecisionSerializer(serializers.ModelSerializer):
    participants = DecisionParticipantSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    my_raci_role = serializers.SerializerMethodField()
    fallback_approver_name = serializers.SerializerMethodField()

    class Meta:
        model = Decision
        fields = [
            "id",
            "project",
            "title",
            "description",
            "subject_type",
            "high_stakes",
            "status",
            "sla_deadline",
            "is_overdue",
            "hearing_confirmed_at",
            "understanding_text",
            "understanding_confirmed_at",
            "agreement_confirmed_at",
            "fallback_approver_name",
            "participants",
            "my_raci_role",
            "created_at",
        ]
        read_only_fields = [f for f in fields if f not in ("project", "title", "description", "subject_type", "high_stakes")]

    def get_my_raci_role(self, obj):
        user = self.context["request"].user
        participant = next((p for p in obj.participants.all() if p.user_id == user.id), None)
        return participant.raci_role if participant else None

    def get_fallback_approver_name(self, obj):
        if not obj.fallback_approver:
            return None
        return obj.fallback_approver.get_full_name() or obj.fallback_approver.email
