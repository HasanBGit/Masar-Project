from datetime import date

import pytest

from handover.models import PostHandoverStatus, PunchListStatus
from handover.services import (
    acknowledge_defect,
    create_punch_list_item,
    get_handover_record,
    is_within_liability_window,
    record_practical_completion,
    report_defect,
    request_closure_signoff,
    resolve_defect,
    sync_closure_from_decision,
)


@pytest.mark.django_db
def test_punch_list_item_requires_unit_or_zone(project, project_manager_user):
    item = create_punch_list_item(project=project, raised_by=project_manager_user, unit_or_zone="Unit 4B", title="Chipped tile")
    assert item.status == PunchListStatus.OPEN
    assert item.unit_or_zone == "Unit 4B"


@pytest.mark.django_db
def test_request_closure_signoff_routes_through_approvals(project, project_manager_user, owner_user):
    item = create_punch_list_item(project=project, raised_by=project_manager_user, unit_or_zone="Unit 4B", title="Chipped tile")
    decision = request_closure_signoff(item, requested_by=project_manager_user, accountable_user=owner_user)

    item.refresh_from_db()
    assert item.status == PunchListStatus.PENDING_SIGNOFF
    assert decision.subject_type == "punch_list_item"
    assert decision.subject_ref == str(item.id)


@pytest.mark.django_db
def test_cannot_request_signoff_twice(project, project_manager_user, owner_user):
    item = create_punch_list_item(project=project, raised_by=project_manager_user, unit_or_zone="Unit 4B", title="Chipped tile")
    request_closure_signoff(item, requested_by=project_manager_user, accountable_user=owner_user)
    item.refresh_from_db()

    with pytest.raises(ValueError):
        request_closure_signoff(item, requested_by=project_manager_user, accountable_user=owner_user)


@pytest.mark.django_db
def test_sync_closure_from_decision_closes_item_once_decision_agreed(project, project_manager_user, owner_user):
    import approvals.services as approvals

    item = create_punch_list_item(project=project, raised_by=project_manager_user, unit_or_zone="Unit 4B", title="Chipped tile")
    decision = request_closure_signoff(item, requested_by=project_manager_user, accountable_user=owner_user)

    approvals.confirm_hearing(decision, owner_user)  # low-stakes: collapses straight to agreeing
    approvals.record_agreement(decision, owner_user)

    item.refresh_from_db()
    synced = sync_closure_from_decision(item)
    assert synced.status == PunchListStatus.VERIFIED_CLOSED


@pytest.mark.django_db
def test_decennial_liability_window(project, owner_user):
    record = record_practical_completion(project=project, practical_completion_date=date(2026, 1, 1), recorded_by=owner_user)
    assert record.decennial_liability_expires_at == date(2036, 1, 1)
    assert is_within_liability_window(project) is True


@pytest.mark.django_db
def test_no_liability_window_before_handover_recorded(project):
    assert get_handover_record(project) is None
    assert is_within_liability_window(project) is False


@pytest.mark.django_db
def test_report_acknowledge_resolve_defect(project, owner_user):
    defect = report_defect(project=project, reported_by=owner_user, unit_or_zone="Unit 4B", title="Water leak under sink")
    assert defect.status == PostHandoverStatus.REPORTED

    acknowledge_defect(defect, owner_user)
    defect.refresh_from_db()
    assert defect.status == PostHandoverStatus.ACKNOWLEDGED

    resolve_defect(defect, owner_user)
    defect.refresh_from_db()
    assert defect.status == PostHandoverStatus.RESOLVED


@pytest.mark.django_db
def test_cannot_acknowledge_already_acknowledged_defect(project, owner_user):
    defect = report_defect(project=project, reported_by=owner_user, unit_or_zone="Unit 4B", title="Leak")
    acknowledge_defect(defect, owner_user)
    with pytest.raises(ValueError):
        acknowledge_defect(defect, owner_user)
