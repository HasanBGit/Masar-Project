"""HTTP-level tests for API-key issuance validation, one-time secrets, and the public facade."""

import pytest
from rest_framework.test import APIClient

from accounts.models import ProjectMembership, Role
from core.models import Project
from platform_api.models import APIKey
from platform_api.services import revoke_api_key

INTERNAL = "/api/v1/platform-api"
PUBLIC = "/api/public/v1"


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def _issue_key(owner_user, project, scope="owner", tier="standard"):
    response = _client(owner_user).post(
        f"{INTERNAL}/api-keys/", {"project": project.id, "label": "test", "scope": scope, "tier": tier}
    )
    assert response.status_code == 201
    return response.data["raw_key"]


def _public_client(raw_key):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"ApiKey {raw_key}")
    return client


@pytest.mark.django_db
def test_api_key_create_with_unknown_tier_returns_400(project, owner_user):
    response = _client(owner_user).post(
        f"{INTERNAL}/api-keys/", {"project": project.id, "label": "x", "scope": "owner", "tier": "platinum"}
    )
    assert response.status_code == 400
    assert not APIKey.objects.exists()


@pytest.mark.django_db
def test_api_key_create_without_scope_returns_400(project, owner_user):
    response = _client(owner_user).post(f"{INTERNAL}/api-keys/", {"project": project.id, "label": "x"})
    assert response.status_code == 400
    assert not APIKey.objects.exists()


@pytest.mark.django_db
def test_api_key_raw_key_shown_once_never_on_list(project, owner_user):
    create = _client(owner_user).post(
        f"{INTERNAL}/api-keys/", {"project": project.id, "label": "x", "scope": "owner", "tier": "standard"}
    )
    assert create.status_code == 201
    assert create.data["raw_key"].startswith("tpk_")

    listing = _client(owner_user).get(f"{INTERNAL}/api-keys/", {"project": project.id})
    assert listing.status_code == 200
    rows = listing.data["results"] if "results" in listing.data else listing.data
    assert all("raw_key" not in row and "key_hash" not in row for row in rows)


@pytest.mark.django_db
def test_api_key_list_rejected_for_non_admin_member(project, project_manager_user):
    response = _client(project_manager_user).get(f"{INTERNAL}/api-keys/", {"project": project.id})
    assert response.status_code == 403


@pytest.mark.django_db
def test_public_endpoint_with_valid_key(project, owner_user):
    raw_key = _issue_key(owner_user, project)
    response = _public_client(raw_key).get(f"{PUBLIC}/projects/{project.id}/approvals/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_key_scoped_to_project_a_cannot_read_project_b(project, owner_user):
    other = Project.objects.create(name="Other Tower", slug="other-tower")
    ProjectMembership.objects.create(user=owner_user, project=other, role=Role.OWNER)
    raw_key = _issue_key(owner_user, project)

    response = _public_client(raw_key).get(f"{PUBLIC}/projects/{other.id}/approvals/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_revoked_key_is_rejected(project, owner_user):
    raw_key = _issue_key(owner_user, project)
    revoke_api_key(APIKey.objects.get())

    response = _public_client(raw_key).get(f"{PUBLIC}/projects/{project.id}/approvals/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_webhook_secret_shown_once_never_on_list(project, owner_user):
    create = _client(owner_user).post(
        f"{INTERNAL}/webhook-subscriptions/",
        {"project": project.id, "target_url": "https://example.com/hook", "event_types": ["payment.released"]},
        format="json",
    )
    assert create.status_code == 201
    assert len(create.data["secret"]) == 64

    listing = _client(owner_user).get(f"{INTERNAL}/webhook-subscriptions/", {"project": project.id})
    rows = listing.data["results"] if "results" in listing.data else listing.data
    assert all("secret" not in row for row in rows)


@pytest.mark.django_db
def test_webhook_subscription_rejects_unknown_event_type(project, owner_user):
    response = _client(owner_user).post(
        f"{INTERNAL}/webhook-subscriptions/",
        {"project": project.id, "target_url": "https://example.com/hook", "event_types": ["not.a.real.event"]},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_webhook_deliveries_rejected_for_non_admin_member(project, project_manager_user):
    response = _client(project_manager_user).get(f"{INTERNAL}/webhook-deliveries/", {"project": project.id})
    assert response.status_code == 403
