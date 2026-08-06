from datetime import timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone

from approvals.exceptions import InvalidTransition, NotAuthorized
from approvals.models import DecisionStatus, RaciRole
from approvals.services import (
    confirm_hearing,
    escalate_if_breached,
    record_agreement,
    record_understanding,
    request_decision,
)


def _raci(accountable, responsible=None):
    rows = [{"user": accountable, "raci_role": RaciRole.ACCOUNTABLE}]
    if responsible:
        rows.append({"user": responsible, "raci_role": RaciRole.RESPONSIBLE})
    return rows


@pytest.mark.django_db
def test_high_stakes_decision_walks_all_three_edges(project, owner_user, project_manager_user):
    decision = request_decision(
        project=project,
        title="Change order",
        requested_by=project_manager_user,
        raci=_raci(accountable=owner_user, responsible=project_manager_user),
        high_stakes=True,
    )
    assert decision.status == DecisionStatus.HEARING

    confirm_hearing(decision, owner_user)
    assert decision.status == DecisionStatus.UNDERSTANDING

    record_understanding(decision, owner_user, "This change order adds nine days and forty thousand riyals.")
    assert decision.status == DecisionStatus.AGREEING
    assert decision.understanding_text

    record_agreement(decision, owner_user)
    assert decision.status == DecisionStatus.CLOSED
    assert decision.agreement_confirmed_by == owner_user


@pytest.mark.django_db
def test_low_stakes_decision_collapses_hearing_and_agreeing(project, owner_user):
    decision = request_decision(
        project=project,
        title="Site hours notice",
        requested_by=owner_user,
        raci=_raci(accountable=owner_user),
        high_stakes=False,
    )
    confirm_hearing(decision, owner_user)
    assert decision.status == DecisionStatus.AGREEING  # skipped UNDERSTANDING

    record_agreement(decision, owner_user)
    assert decision.status == DecisionStatus.CLOSED


@pytest.mark.django_db
def test_only_accountable_can_record_understanding(project, owner_user, project_manager_user):
    decision = request_decision(
        project=project,
        title="Change order",
        requested_by=project_manager_user,
        raci=_raci(accountable=owner_user, responsible=project_manager_user),
        high_stakes=True,
    )
    confirm_hearing(decision, owner_user)

    with pytest.raises(NotAuthorized):
        record_understanding(decision, project_manager_user, "Responsible tries to close the gate themselves.")


@pytest.mark.django_db
def test_generic_understanding_is_rejected(project, owner_user):
    decision = request_decision(
        project=project,
        title="Change order",
        requested_by=owner_user,
        raci=_raci(accountable=owner_user),
        high_stakes=True,
    )
    confirm_hearing(decision, owner_user)

    with pytest.raises(ValueError):
        record_understanding(decision, owner_user, "I agree")


@pytest.mark.django_db
def test_cannot_agree_before_understanding_gate(project, owner_user):
    decision = request_decision(
        project=project,
        title="Change order",
        requested_by=owner_user,
        raci=_raci(accountable=owner_user),
        high_stakes=True,
    )
    confirm_hearing(decision, owner_user)  # now in UNDERSTANDING

    with pytest.raises(InvalidTransition):
        record_agreement(decision, owner_user)


@pytest.mark.django_db
def test_exactly_one_accountable_enforced_at_creation(project, owner_user, project_manager_user):
    with pytest.raises(ValueError):
        request_decision(
            project=project,
            title="No accountable",
            requested_by=owner_user,
            raci=[{"user": project_manager_user, "raci_role": RaciRole.RESPONSIBLE}],
        )


@pytest.mark.django_db
def test_second_accountable_rejected_at_db_level(project, owner_user, project_manager_user):
    from approvals.models import Decision, DecisionParticipant

    decision = Decision.objects.create(project=project, title="x", status=DecisionStatus.HEARING)
    DecisionParticipant.objects.create(decision=decision, user=owner_user, raci_role=RaciRole.ACCOUNTABLE)
    with pytest.raises(IntegrityError):
        DecisionParticipant.objects.create(decision=decision, user=project_manager_user, raci_role=RaciRole.ACCOUNTABLE)


@pytest.mark.django_db
def test_sla_breach_escalates_to_fallback_owner(project, owner_user, consultant_user, project_manager_user):
    decision = request_decision(
        project=project,
        title="RFI",
        requested_by=project_manager_user,
        raci=_raci(accountable=consultant_user, responsible=project_manager_user),
        high_stakes=True,
    )
    decision.sla_deadline = timezone.now() - timedelta(hours=1)
    decision.save(update_fields=["sla_deadline"])

    escalate_if_breached(decision)
    decision.refresh_from_db()

    assert decision.status == DecisionStatus.ESCALATED
    assert decision.fallback_approver == owner_user  # default fallback_role is "owner"


@pytest.mark.django_db
def test_escalate_is_idempotent(project, owner_user):
    decision = request_decision(
        project=project,
        title="Site hours",
        requested_by=owner_user,
        raci=_raci(accountable=owner_user),
    )
    decision.sla_deadline = timezone.now() - timedelta(hours=1)
    decision.save(update_fields=["sla_deadline"])

    escalate_if_breached(decision)
    escalated_at_first = decision.escalated_at
    escalate_if_breached(decision)
    decision.refresh_from_db()

    assert decision.escalated_at == escalated_at_first
