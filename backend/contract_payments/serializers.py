from rest_framework import serializers

from .models import Contract, ContractAmendment, Invoice, PaymentMilestone


class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = [
            "id", "project", "title", "contract_value", "currency", "scope_baseline",
            "source_file", "status", "plain_arabic_summary", "retention_percentage",
            "ceiling_threshold_percentage", "created_at",
        ]
        read_only_fields = ["status", "created_at"]


class PaymentMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMilestone
        fields = [
            "id", "contract", "project", "name", "due_condition", "amount", "retention_held",
            "status", "released_at", "released_by", "created_at",
        ]
        read_only_fields = ["status", "released_at", "released_by", "created_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ["id", "milestone", "zatca_status", "xml_payload", "qr_code_data", "submitted_to_zatca_at", "created_at"]
        read_only_fields = fields


class ContractAmendmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractAmendment
        fields = ["id", "contract", "version_number", "summary", "decision_id", "document_file", "created_at"]
        read_only_fields = ["decision_id", "created_at"]


class LegalAgentQuestionSerializer(serializers.Serializer):
    question = serializers.CharField()
    language = serializers.ChoiceField(choices=["ar", "en"], default="ar")
