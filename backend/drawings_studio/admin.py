from django.contrib import admin

from .models import DrawingComment, DrawingModel


@admin.register(DrawingModel)
class DrawingModelAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "format", "uploaded_by", "created_at"]
    list_filter = ["format", "project"]


@admin.register(DrawingComment)
class DrawingCommentAdmin(admin.ModelAdmin):
    list_display = ["model", "author", "resolved", "parent", "created_at"]
    list_filter = ["resolved"]
