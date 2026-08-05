from accounts.services import get_role
from core.models import Project
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .exceptions import CeilingBreach, LegalAgentNotConfigured, PaymentNotVerified
from .models import Contract, ContractAmendment, Invoice, PaymentMilestone
from .serializers import (
    ContractAmendmentSerializer,
    ContractSerializer,
    InvoiceSerializer,
    LegalAgentQuestionSerializer,
    PaymentMilestoneSerializer,
)


def _project_from_query(request) -> Project:
    project_id = request.query_params.get("project") or request.data.get("project")
    if not project_id:
        raise NotFound("Missing `project` parameter.")
    project = Project.objects.filter(id=project_id).first()
    if project is None:
        raise NotFound("Project not found.")
    if get_role(request.user, project) is None:
        raise PermissionDenied("You are not a member of this project.")
    return project


# Only these roles can release payments or sign contract amendments -
# consistent with the platform-wide role set (accounts.models.Role); a
# consultant/PMC can co-sign but the money-moving actions are owner-side.
FINANCIAL_ACTION_ROLES = {"owner", "admin"}


class ContractViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ContractSerializer

    def get_queryset(self):
        project = _project_from_query(self.request)
        return Contract.objects.filter(project=project)

    def get_object(self):
        # Detail routes (contract_vs_actual, ceiling_check, legal-agent/*)
        # don't carry `?project=` - look the contract up by pk and derive
        # visibility from its own project, same pattern as trust_evidence's
        # EvidenceRecordViewSet.get_object.
        contract = get_object_or_404(Contract, pk=self.kwargs["pk"])
        if get_role(self.request.user, contract.project) is None:
            raise NotFound("Not found.")
        return contract

    def perform_create(self, serializer):
        project = Project.objects.get(id=self.request.data.get("project"))
        if get_role(self.request.user, project) not in FINANCIAL_ACTION_ROLES:
            raise PermissionDenied("Only an owner or admin can create a contract record.")
        serializer.save()

    @action(detail=True, methods=["get"])
    def contract_vs_actual(self, request, pk=None):
        contract = self.get_object()
        return Response(services.get_contract_vs_actual(contract.project))

    @action(detail=True, methods=["get"])
    def ceiling_check(self, request, pk=None):
        contract = self.get_object()
        additional_amount = request.query_params.get("additional_amount", "0")
        return Response(services.check_ceiling_breach(contract.project, additional_amount=additional_amount))

    @action(detail=True, methods=["post"], url_path="legal-agent/ingest")
    def legal_agent_ingest(self, request, pk=None):
        contract = self.get_object()
        try:
            count = services.ingest_contract_for_legal_agent(contract)
        except LegalAgentNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"chunks_indexed": count})

    @action(detail=True, methods=["post"], url_path="legal-agent/ask")
    def legal_agent_ask(self, request, pk=None):
        contract = self.get_object()
        serializer = LegalAgentQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = services.ask_legal_agent(
                project=contract.project, question=serializer.validated_data["question"],
                asked_by=request.user, language=serializer.validated_data["language"],
            )
        except LegalAgentNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(result)


class PaymentMilestoneViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PaymentMilestoneSerializer

    def get_queryset(self):
        project = _project_from_query(self.request)
        return PaymentMilestone.objects.filter(project=project)

    def get_object(self):
        # Same reasoning as ContractViewSet.get_object - `release` is a
        # detail route with no `?project=` query param to filter on.
        milestone = get_object_or_404(PaymentMilestone, pk=self.kwargs["pk"])
        if get_role(self.request.user, milestone.project) is None:
            raise NotFound("Not found.")
        return milestone

    def perform_create(self, serializer):
        contract = Contract.objects.get(id=self.request.data.get("contract"))
        if get_role(self.request.user, contract.project) not in FINANCIAL_ACTION_ROLES:
            raise PermissionDenied("Only an owner or admin can add a payment milestone.")
        serializer.save(project=contract.project)

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        milestone = self.get_object()
        if get_role(request.user, milestone.project) not in FINANCIAL_ACTION_ROLES:
            raise PermissionDenied("Only an owner or admin can release a payment milestone.")
        try:
            services.release_payment_milestone(milestone, request.user)
        except PaymentNotVerified as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        milestone.refresh_from_db()
        return Response(self.get_serializer(milestone).data)


class InvoiceViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        project = _project_from_query(self.request)
        return Invoice.objects.filter(milestone__project=project)


class ContractAmendmentViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ContractAmendmentSerializer

    def get_queryset(self):
        project = _project_from_query(self.request)
        return ContractAmendment.objects.filter(contract__project=project)

    def perform_create(self, serializer):
        contract = Contract.objects.get(id=self.request.data.get("contract"))
        if get_role(self.request.user, contract.project) not in FINANCIAL_ACTION_ROLES:
            raise PermissionDenied("Only an owner or admin can request a contract amendment signing.")
        # approvals.services.request_decision requires actual User instances
        # in raci, not ids - request.data can't carry model instances, so a
        # client-supplied "raci" isn't wired up here yet (would need id ->
        # instance resolution); only the default (current user) path works.
        raci = [{"user": self.request.user, "raci_role": "A"}]
        amendment = services.request_contract_signing(
            contract=contract, requested_by=self.request.user, raci=raci,
            version_number=serializer.validated_data["version_number"], summary=serializer.validated_data["summary"],
        )
        # request_contract_signing already persists the row via the service
        # layer - assign the real instance here rather than calling
        # serializer.save(), which would either duplicate it or fail (the
        # serializer's validated_data has no decision_id to save with).
        serializer.instance = amendment


class CeilingBreachCheckView(APIView):
    """Standalone check (not tied to a specific contract's detail route) for callers like rfi-change-control's future integration."""

    def get(self, request):
        project = _project_from_query(request)
        additional_amount = request.query_params.get("additional_amount", "0")
        return Response(services.check_ceiling_breach(project, additional_amount=additional_amount))
