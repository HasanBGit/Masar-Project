from django.contrib import admin

from .models import Contract, ContractAmendment, Invoice, LegalAgentDocument, PaymentMilestone


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "contract_value", "currency", "status", "created_at"]
    list_filter = ["status", "currency", "project"]


@admin.register(PaymentMilestone)
class PaymentMilestoneAdmin(admin.ModelAdmin):
    list_display = ["name", "contract", "amount", "status", "released_at", "project"]
    list_filter = ["status", "project"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["milestone", "zatca_status", "submitted_to_zatca_at"]
    list_filter = ["zatca_status"]


@admin.register(ContractAmendment)
class ContractAmendmentAdmin(admin.ModelAdmin):
    list_display = ["contract", "version_number", "decision_id", "created_at"]


@admin.register(LegalAgentDocument)
class LegalAgentDocumentAdmin(admin.ModelAdmin):
    list_display = ["source_ref", "project", "embedding_model", "created_at"]
    list_filter = ["project", "embedding_model"]
    readonly_fields = ["embedding"]
