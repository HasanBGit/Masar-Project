from django.contrib import admin

from .models import HandoverRecord, OMChecklistItem, PostHandoverDefect, PunchListItem


@admin.register(HandoverRecord)
class HandoverRecordAdmin(admin.ModelAdmin):
    list_display = ["project", "practical_completion_date", "decennial_liability_expires_at"]


@admin.register(PunchListItem)
class PunchListItemAdmin(admin.ModelAdmin):
    list_display = ["title", "unit_or_zone", "project", "status"]
    list_filter = ["status", "project"]


@admin.register(PostHandoverDefect)
class PostHandoverDefectAdmin(admin.ModelAdmin):
    list_display = ["title", "unit_or_zone", "project", "status"]
    list_filter = ["status", "project"]


admin.site.register(OMChecklistItem)
