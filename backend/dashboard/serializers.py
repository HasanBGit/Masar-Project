from accounts.serializers import MyProjectSerializer
from approvals.serializers import DecisionSerializer
from rest_framework import serializers


class DashboardStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    overdue = serializers.IntegerField()
    high_stakes_pending = serializers.IntegerField()
    closed = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    role = serializers.CharField()
    project = MyProjectSerializer()
    stats = DashboardStatsSerializer()
    digest = DecisionSerializer(many=True)
    decisions = DecisionSerializer(many=True)
