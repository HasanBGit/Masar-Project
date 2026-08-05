from django.contrib import admin

from .models import APIKey, WebhookDelivery, WebhookSubscription


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ["label", "project", "scope", "tier", "key_prefix", "is_active", "created_at"]
    list_filter = ["scope", "tier", "project"]


@admin.register(WebhookSubscription)
class WebhookSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["target_url", "project", "event_types", "is_active"]


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ["event_type", "subscription", "status", "attempt_count", "last_attempted_at"]
    list_filter = ["status"]
