import pytest
from rest_framework.exceptions import PermissionDenied

from approvals.models import RaciRole
from approvals.services import request_decision
from dashboard.services import get_role_dashboard


@pytest.mark.django_db
def test_owner_sees_every_decision(project, owner_user, project_manager_user):
    request_decision(
        project=project,
        title="Low-stakes item",
        requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}],
        high_stakes=False,
    )
    request_decision(
        project=project,
        title="High-stakes item",
        requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}, {"user": project_manager_user, "raci_role": RaciRole.RESPONSIBLE}],
        high_stakes=True,
    )

    result = get_role_dashboard(owner_user, project)
    assert len(result["decisions"]) == 2


@pytest.mark.django_db
def test_project_manager_only_sees_own_participant_decisions(project, owner_user, project_manager_user, consultant_user):
    request_decision(
        project=project,
        title="Project Manager is Responsible",
        requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}, {"user": project_manager_user, "raci_role": RaciRole.RESPONSIBLE}],
        high_stakes=True,
    )
    request_decision(
        project=project,
        title="Project Manager not involved",
        requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}, {"user": consultant_user, "raci_role": RaciRole.CONSULTED}],
        high_stakes=True,
    )

    result = get_role_dashboard(project_manager_user, project)
    assert len(result["decisions"]) == 1
    assert result["decisions"][0].title == "Project Manager is Responsible"


@pytest.mark.django_db
def test_designer_only_sees_own_participant_decisions(project, owner_user, designer_user, consultant_user):
    request_decision(
        project=project,
        title="Designer is Responsible",
        requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}, {"user": designer_user, "raci_role": RaciRole.RESPONSIBLE}],
        high_stakes=True,
    )
    request_decision(
        project=project,
        title="Designer not involved",
        requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}, {"user": consultant_user, "raci_role": RaciRole.CONSULTED}],
        high_stakes=True,
    )

    result = get_role_dashboard(designer_user, project)
    assert len(result["decisions"]) == 1
    assert result["decisions"][0].title == "Designer is Responsible"


@pytest.mark.django_db
def test_unknown_role_raises(project, django_user_model):
    outsider = django_user_model.objects.create(email="outsider2@test.local", username="outsider2@test.local")
    with pytest.raises(PermissionDenied):
        get_role_dashboard(outsider, project)
