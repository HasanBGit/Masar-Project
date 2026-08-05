from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CeilingBreachCheckView, ContractAmendmentViewSet, ContractViewSet, InvoiceViewSet, PaymentMilestoneViewSet

router = DefaultRouter()
router.register("contracts", ContractViewSet, basename="contract")
router.register("payment-milestones", PaymentMilestoneViewSet, basename="payment-milestone")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("amendments", ContractAmendmentViewSet, basename="contract-amendment")

urlpatterns = router.urls + [
    path("ceiling-check/", CeilingBreachCheckView.as_view(), name="ceiling-check"),
]
