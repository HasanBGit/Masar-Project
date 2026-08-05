from rest_framework import serializers

from .models import DrawingModel

MAX_MODEL_FILE_SIZE = 100 * 1024 * 1024  # 100 MB - large enough for real 3D models, small enough to bound abuse


class DrawingModelSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)

    class Meta:
        model = DrawingModel
        fields = ["id", "project", "name", "file", "format", "uploaded_by", "uploaded_by_name", "created_at"]
        read_only_fields = ["format", "uploaded_by", "created_at"]

    def validate_file(self, value):
        if value.size > MAX_MODEL_FILE_SIZE:
            raise serializers.ValidationError(
                f"File too large ({value.size} bytes) - the limit is {MAX_MODEL_FILE_SIZE // (1024 * 1024)} MB."
            )
        return value
