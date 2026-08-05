from django.contrib import admin

from .models import Decision, DecisionParticipant, EscalationRule


class DecisionParticipantInline(admin.TabularInline):
    model = DecisionParticipant
    extra = 0


@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "status", "high_stakes", "sla_deadline"]
    list_filter = ["status", "high_stakes", "project"]
    inlines = [DecisionParticipantInline]


@admin.register(EscalationRule)
class EscalationRuleAdmin(admin.ModelAdmin):
    list_display = ["project", "default_sla_hours", "high_stakes_sla_hours", "fallback_role"]
