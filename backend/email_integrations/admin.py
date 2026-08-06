from django.contrib import admin

from .models import EmailAccount, EmailMessage


@admin.register(EmailAccount)
class EmailAccountAdmin(admin.ModelAdmin):
    list_display = ["email_address", "project", "connected_by", "last_synced_at"]


@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = ["subject", "project", "category", "requires_action", "received_at", "read_at"]
    list_filter = ["category", "requires_action", "project"]
