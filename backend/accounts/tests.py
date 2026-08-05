import pytest
from rest_framework.test import APIClient

from accounts.models import ProjectMembership, Role
from accounts.services import (
    add_roster_member,
    create_project,
    get_compliance_status,
    get_retention_policy,
    get_role,
    has_permission,
    reassign_roster_member,
    remove_roster_member,
)
from core.models import Project
from trust_evidence.services import get_audit_events


@pytest.mark.django_db
def test_owner_can_manage_roster(project, owner_user):
    assert has_permission(owner_user, project, "manage_roster") is True


@pytest.mark.django_db
def test_contractor_cannot_manage_roster(project, contractor_user):
    assert has_permission(contractor_user, project, "manage_roster") is False


@pytest.mark.django_db
def test_non_member_has_no_permission(project, owner_user, django_user_model):
    outsider = django_user_model.objects.create(email="outsider@test.local", username="outsider@test.local")
    assert has_permission(outsider, project, "manage_roster") is False
    assert get_role(outsider, project) is None


@pytest.mark.django_db
def test_any_member_can_do_non_elevated_actions(project, consultant_user):
    assert has_permission(consultant_user, project, "view_project") is True


@pytest.mark.django_db
def test_add_reassign_remove_roster_member_all_write_audit_events(project, owner_user, django_user_model):
    new_user = django_user_model.objects.create(email="new@test.local", username="new@test.local")

    membership = add_roster_member(project=project, user=new_user, role=Role.CONTRACTOR, added_by=owner_user)
    assert get_role(new_user, project) == Role.CONTRACTOR

    reassign_roster_member(membership, Role.CONSULTANT, changed_by=owner_user)
    assert get_role(new_user, project) == Role.CONSULTANT

    remove_roster_member(membership, removed_by=owner_user)
    assert get_role(new_user, project) is None

    event_types = {e.event_type for e in get_audit_events(project)}
    assert {"roster_member_added", "roster_member_reassigned", "roster_member_removed"} <= event_types


@pytest.mark.django_db
def test_compliance_status_reports_platform_residency_and_project_policy(project):
    policy = get_retention_policy(project)
    assert policy.data_residency_region == "sa"

    status = get_compliance_status(project)
    assert status["platform_data_residency_region"] == "sa"
    assert status["residency_matches_platform"] is True
    assert status["retention_years"] == 7


# --- IDOR regressions (roster views) ----------------------------------


@pytest.mark.django_db
def test_roster_list_requires_project_param(owner_user):
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.get("/api/v1/accounts/roster/")
    assert response.status_code == 404  # not 200 with every project's memberships


@pytest.mark.django_db
def test_roster_list_rejects_non_member(project, django_user_model):
    outsider = django_user_model.objects.create(email="outsider3@test.local", username="outsider3@test.local")
    client = APIClient()
    client.force_authenticate(outsider)
    response = client.get(f"/api/v1/accounts/roster/?project={project.id}")
    assert response.status_code == 404


@pytest.mark.django_db
def test_roster_list_scoped_to_requested_project_only(project, owner_user):
    other_project = Project.objects.create(name="Other Tower", slug="other-tower")
    ProjectMembership.objects.create(user=owner_user, project=other_project, role=Role.OWNER)

    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.get(f"/api/v1/accounts/roster/?project={project.id}")
    assert response.status_code == 200
    returned_project_ids = {row["project"] for row in response.json()["results"]} if "results" in response.json() else {row["project"] for row in response.json()}
    assert returned_project_ids == {project.id}


@pytest.mark.django_db
def test_roster_detail_hidden_from_non_member(project, owner_user, django_user_model):
    outsider = django_user_model.objects.create(email="outsider4@test.local", username="outsider4@test.local")
    client = APIClient()
    client.force_authenticate(outsider)
    response = client.get(f"/api/v1/accounts/roster/{owner_user.memberships.first().id}/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_roster_detail_visible_but_not_editable_by_fellow_member(project, owner_user, contractor_user):
    owner_membership = ProjectMembership.objects.get(user=owner_user, project=project)
    client = APIClient()
    client.force_authenticate(contractor_user)

    get_response = client.get(f"/api/v1/accounts/roster/{owner_membership.id}/")
    assert get_response.status_code == 200  # visible - contractor shares the project

    patch_response = client.patch(f"/api/v1/accounts/roster/{owner_membership.id}/", {"role": "contractor"})
    assert patch_response.status_code == 403  # but cannot reassign - not elevated


@pytest.mark.django_db
def test_create_project_makes_creator_the_owner(django_user_model):
    founder = django_user_model.objects.create(email="founder@test.local", username="founder@test.local")
    new_project = create_project(name="Jeddah Marina", description="Phase 1", created_by=founder)
    assert get_role(founder, new_project) == Role.OWNER
    assert new_project.slug == "jeddah-marina"


@pytest.mark.django_db
def test_create_project_disambiguates_duplicate_slugs(django_user_model):
    founder = django_user_model.objects.create(email="founder2@test.local", username="founder2@test.local")
    first = create_project(name="Jeddah Marina", description="", created_by=founder)
    second = create_project(name="Jeddah Marina", description="", created_by=founder)
    assert first.slug != second.slug


@pytest.mark.django_db
def test_create_project_endpoint_returns_it_in_my_projects(django_user_model):
    founder = django_user_model.objects.create(email="founder3@test.local", username="founder3@test.local")
    client = APIClient()
    client.force_authenticate(founder)

    create_response = client.post("/api/v1/accounts/projects/", {"name": "NEOM Site B", "description": ""})
    assert create_response.status_code == 201
    assert create_response.data["role"] == "owner"

    list_response = client.get("/api/v1/accounts/projects/")
    assert any(p["name"] == "NEOM Site B" for p in list_response.data)


@pytest.mark.django_db
def test_create_project_endpoint_rejects_blank_name(owner_user):
    client = APIClient()
    client.force_authenticate(owner_user)
    response = client.post("/api/v1/accounts/projects/", {"name": "  "})
    assert response.status_code == 400
