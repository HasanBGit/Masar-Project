from django.contrib import admin

from .models import AlertEvent, DigestOpenEvent, IntegrationHealthCheck


@admin.register(IntegrationHealthCheck)
class IntegrationHealthCheckAdmin(admin.ModelAdmin):
    list_display = ["integration_type", "project", "status", "last_checked_at"]
    list_filter = ["integration_type", "status"]


@admin.register(AlertEvent)
class AlertEventAdmin(admin.ModelAdmin):
    list_display = ["severity", "source", "message", "project", "acknowledged", "created_at"]
    list_filter = ["severity", "source", "acknowledged"]


admin.site.register(DigestOpenEvent)
