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

    def validate_contract_value(self, value):
        if value <= 0:
            raise serializers.ValidationError("Contract value must be greater than zero.")
        return value

    def validate_retention_percentage(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Retention percentage must be between 0 and 100.")
        return value


class PaymentMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMilestone
        fields = [
            "id", "contract", "project", "name", "due_condition", "amount", "retention_held",
            "status", "released_at", "released_by", "created_at",
        ]
        read_only_fields = ["status", "released_at", "released_by", "created_at"]
        # The view derives `project` from the contract; a client may still
        # send it, in which case it must match (validated below).
        extra_kwargs = {"project": {"required": False}}

    def validate(self, attrs):
        contract = attrs.get("contract")
        project = attrs.get("project")
        if contract is not None and project is not None and contract.project_id != project.id:
            raise serializers.ValidationError({"project": "Milestone project must match the contract's project."})
        return attrs


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
