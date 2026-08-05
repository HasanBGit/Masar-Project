from django.contrib import admin

from .models import ChangeOrder, CoordinationThread, Permit, QualityCheckpoint, RFI, Submittal, SupplierDelivery


@admin.register(RFI)
class RFIAdmin(admin.ModelAdmin):
    list_display = ["number", "title", "project", "status", "sla_deadline"]
    list_filter = ["status", "project"]


@admin.register(ChangeOrder)
class ChangeOrderAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "status", "cost_impact", "schedule_impact_days"]
    list_filter = ["status", "project"]


admin.site.register(Submittal)
admin.site.register(Permit)
admin.site.register(SupplierDelivery)
admin.site.register(QualityCheckpoint)
admin.site.register(CoordinationThread)
