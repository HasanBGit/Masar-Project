from django.contrib import admin

from .models import DrawingModel


@admin.register(DrawingModel)
class DrawingModelAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "format", "uploaded_by", "created_at"]
    list_filter = ["format", "project"]
