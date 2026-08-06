from datetime import timedelta

import pytest
from django.utils import timezone

from trust_evidence.models import ActorRole
from trust_evidence.services import (
    export_dispute_bundle,
    flag_if_silent,
    get_verification_status,
    record_event,
    resolve_silence_flag,
    submit_evidence,
    verify_evidence,
)


@pytest.mark.django_db
def test_record_event_snapshots_actor_role(project, owner_user):
    event = record_event(project=project, actor=owner_user, event_type="test_event")
    assert event.actor_role == "owner"


@pytest.mark.django_db
def test_system_event_has_no_actor_and_system_role(project):
    event = record_event(project=project, actor=None, event_type="system_sweep")
    assert event.actor is None
    assert event.actor_role == ActorRole.SYSTEM


@pytest.mark.django_db
def test_evidence_only_counts_after_verification(project, project_manager_user, owner_user):
    record = submit_evidence(
        project=project, subject_type="milestone", subject_id=1, submitted_by=project_manager_user,
        caption="Level 5 slab poured", captured_at=timezone.now(),
    )
    status_before = get_verification_status(project, "milestone", 1)
    assert status_before["has_verified_evidence"] is False
    assert status_before["pending_count"] == 1

    verify_evidence(record, owner_user)
    status_after = get_verification_status(project, "milestone", 1)
    assert status_after["has_verified_evidence"] is True
    assert status_after["verified_count"] == 1


@pytest.mark.django_db
def test_flag_if_silent_creates_flag_and_is_idempotent(project):
    expected_by = timezone.now() - timedelta(hours=2)
    flag = flag_if_silent(project=project, subject_type="rfi", subject_id=99, expected_by=expected_by)
    assert flag is not None

    again = flag_if_silent(project=project, subject_type="rfi", subject_id=99, expected_by=expected_by)
    assert again is None  # already an open flag for this subject


@pytest.mark.django_db
def test_flag_if_silent_does_nothing_before_deadline(project):
    flag = flag_if_silent(project=project, subject_type="rfi", subject_id=5, expected_by=timezone.now() + timedelta(hours=2))
    assert flag is None


@pytest.mark.django_db
def test_resolve_silence_flag(project):
    expected_by = timezone.now() - timedelta(hours=1)
    flag_if_silent(project=project, subject_type="rfi", subject_id=7, expected_by=expected_by)

    count = resolve_silence_flag(project, "rfi", 7)
    assert count == 1

    # a fresh breach after resolution opens a new flag rather than reopening
    again = flag_if_silent(project=project, subject_type="rfi", subject_id=7, expected_by=expected_by)
    assert again is not None


@pytest.mark.django_db
def test_dispute_export_is_chronological_and_preserves_source_ref(project, owner_user):
    record_event(project=project, actor=owner_user, event_type="first", source_message_ref="wa://msg/1")
    record_event(project=project, actor=owner_user, event_type="second")

    bundle = export_dispute_bundle(project)
    assert [e["event_type"] for e in bundle] == ["first", "second"]
    assert bundle[0]["source_message_ref"] == "wa://msg/1"
    assert bundle[1]["source_message_ref"] is None
