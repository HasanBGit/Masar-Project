import pytest
from rest_framework.exceptions import PermissionDenied

from approvals.models import RaciRole
from approvals.services import request_decision
from dashboard.services import get_role_dashboard


@pytest.mark.django_db
def test_owner_sees_every_decision(project, owner_user, investor_user, contractor_user):
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
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}, {"user": contractor_user, "raci_role": RaciRole.RESPONSIBLE}],
        high_stakes=True,
    )

    result = get_role_dashboard(owner_user, project)
    assert len(result["decisions"]) == 2


@pytest.mark.django_db
def test_investor_only_sees_high_stakes(project, owner_user, investor_user, contractor_user):
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
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}],
        high_stakes=True,
    )

    result = get_role_dashboard(investor_user, project)
    assert len(result["decisions"]) == 1
    assert result["decisions"][0].high_stakes is True


@pytest.mark.django_db
def test_contractor_only_sees_own_participant_decisions(project, owner_user, contractor_user, consultant_user):
    request_decision(
        project=project,
        title="Contractor is Responsible",
        requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}, {"user": contractor_user, "raci_role": RaciRole.RESPONSIBLE}],
        high_stakes=True,
    )
    request_decision(
        project=project,
        title="Contractor not involved",
        requested_by=owner_user,
        raci=[{"user": owner_user, "raci_role": RaciRole.ACCOUNTABLE}, {"user": consultant_user, "raci_role": RaciRole.CONSULTED}],
        high_stakes=True,
    )

    result = get_role_dashboard(contractor_user, project)
    assert len(result["decisions"]) == 1
    assert result["decisions"][0].title == "Contractor is Responsible"


@pytest.mark.django_db
def test_unknown_role_raises(project, django_user_model):
    outsider = django_user_model.objects.create(email="outsider2@test.local", username="outsider2@test.local")
    with pytest.raises(PermissionDenied):
        get_role_dashboard(outsider, project)
