from rest_framework import serializers

from core.models import Project

from .models import DataRetentionPolicy, ProjectMembership, User


class MeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "preferred_language", "is_staff"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email


class MyProjectSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ["id", "name", "slug", "role"]

    def get_role(self, obj):
        return obj._membership_role


class RosterEntrySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = ProjectMembership
        fields = ["id", "user", "user_name", "user_email", "project", "role", "created_at"]
        read_only_fields = ["created_at"]


class DataRetentionPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = DataRetentionPolicy
        fields = ["id", "project", "retention_years", "data_residency_region", "pdpl_compliant"]


class AuditEventSerializer(serializers.Serializer):
    """Read-only view over trust_evidence's AuditEvent for access/security review - not a separate log."""

    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    actor = serializers.SerializerMethodField()
    actor_role = serializers.CharField()
    event_type = serializers.CharField()
    channel = serializers.CharField()
    subject_type = serializers.CharField()
    subject_id = serializers.CharField()

    def get_actor(self, obj):
        return obj.actor.get_full_name() if obj.actor else None
