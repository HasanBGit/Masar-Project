from django.contrib import admin

from .models import AuditEvent, EvidenceRecord, SilenceFlag


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ["created_at", "event_type", "channel", "subject_type", "subject_id", "actor", "actor_role", "project"]
    list_filter = ["event_type", "channel", "project"]
    readonly_fields = [f.name for f in AuditEvent._meta.fields]


@admin.register(EvidenceRecord)
class EvidenceRecordAdmin(admin.ModelAdmin):
    list_display = ["caption", "subject_type", "subject_id", "verified", "captured_at", "project"]
    list_filter = ["verified", "project"]


@admin.register(SilenceFlag)
class SilenceFlagAdmin(admin.ModelAdmin):
    list_display = ["subject_type", "subject_id", "expected_by", "resolved", "project"]
    list_filter = ["resolved", "project"]
