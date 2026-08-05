from rest_framework import serializers

from .models import DrawingModel


class DrawingModelSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)

    class Meta:
        model = DrawingModel
        fields = ["id", "project", "name", "file", "format", "uploaded_by", "uploaded_by_name", "created_at"]
        read_only_fields = ["format", "uploaded_by", "created_at"]
