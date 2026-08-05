"""HTTP-level tests: the ops dashboard is staff-gated, and platform-wide health rows are visible per-project."""

import pytest
from rest_framework.test import APIClient

from observability.models import HealthStatus, IntegrationType
from observability.services import report_integration_health

BASE = "/api/v1/observability"

STAFF_GATED_PATHS = [f"{BASE}/sla-compliance/", f"{BASE}/security-events/", f"{BASE}/integration-health/"]


@pytest.fixture
def staff_user(db, django_user_model):
    return django_user_model.objects.create(email="ops@test.local", username="ops@test.local", is_staff=True)


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
@pytest.mark.parametrize("path", STAFF_GATED_PATHS)
def test_non_staff_project_owner_is_rejected(path, owner_user):
    assert _client(owner_user).get(path).status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize("path", STAFF_GATED_PATHS)
def test_staff_user_is_allowed(path, staff_user):
    assert _client(staff_user).get(path).status_code == 200


@pytest.mark.django_db
def test_platform_wide_health_row_visible_in_project_view(project, staff_user):
    report_integration_health(
        project=project, integration_type=IntegrationType.WHATSAPP_SESSION, status=HealthStatus.HEALTHY
    )
    report_integration_health(
        project=None, integration_type=IntegrationType.GOVERNMENT_PORTAL, status=HealthStatus.HEALTHY
    )

    response = _client(staff_user).get(f"{BASE}/integration-health/", {"project": project.id})
    assert response.status_code == 200
    types = {row["integration_type"] for row in response.data}
    # The NULL-project (platform-wide) row must appear alongside the project's own.
    assert types == {IntegrationType.WHATSAPP_SESSION, IntegrationType.GOVERNMENT_PORTAL}


@pytest.mark.django_db
def test_platform_wide_health_rows_upsert_not_duplicate(db):
    report_integration_health(project=None, integration_type=IntegrationType.GOVERNMENT_PORTAL, status=HealthStatus.HEALTHY)
    report_integration_health(project=None, integration_type=IntegrationType.GOVERNMENT_PORTAL, status=HealthStatus.DOWN)

    from observability.models import IntegrationHealthCheck

    rows = IntegrationHealthCheck.objects.filter(project=None, integration_type=IntegrationType.GOVERNMENT_PORTAL)
    assert rows.count() == 1
    assert rows.get().status == HealthStatus.DOWN
