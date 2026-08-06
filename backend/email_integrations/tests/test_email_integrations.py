from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

import approvals.services as approvals
from accounts.models import ProjectMembership, Role
from email_integrations.exceptions import GmailNotConfigured
from email_integrations.models import EMAIL_SUBJECT_TYPE, EmailAccount, EmailCategory, EmailMessage
from email_integrations.services import acknowledge_message, get_authorize_url, sync_inbox


@pytest.fixture
def email_account(db, project, project_manager_user):
    return EmailAccount.objects.create(
        project=project, email_address="pm-site@gmail.com", refresh_token="refresh-token",
        access_token="access-token", token_expires_at=timezone.now() + timezone.timedelta(hours=1),
        connected_by=project_manager_user,
    )


@pytest.mark.django_db
def test_authorize_url_raises_when_unconfigured(project, settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    settings.GOOGLE_OAUTH_CLIENT_SECRET = ""
    with pytest.raises(GmailNotConfigured):
        get_authorize_url(project, "https://app.example.com/callback")


@pytest.mark.django_db
def test_authorize_url_includes_project_state_when_configured(project, settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    settings.GOOGLE_OAUTH_CLIENT_SECRET = "test-secret"
    url = get_authorize_url(project, "https://app.example.com/callback")
    assert f"state={project.id}" in url
    assert "test-client-id" in url


@pytest.mark.django_db
def test_sync_without_account_raises(project, settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    settings.GOOGLE_OAUTH_CLIENT_SECRET = "test-secret"
    with pytest.raises(EmailAccount.DoesNotExist):
        sync_inbox(project)


@pytest.mark.django_db
def test_sync_ingests_and_classifies_messages(project, email_account, settings, consultant_user, project_manager_user):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    settings.GOOGLE_OAUTH_CLIENT_SECRET = "test-secret"

    list_response = {"messages": [{"id": "msg-1"}]}
    detail_response = {
        "id": "msg-1", "threadId": "thread-1", "snippet": "Invoice attached for milestone 4 payment.",
        "payload": {"headers": [{"name": "Subject", "value": "Payment application - milestone 4"}, {"name": "From", "value": "pmc@example.com"}]},
    }

    with patch("email_integrations.services.requests.get") as mock_get:
        mock_get.side_effect = [
            _fake_response(list_response),
            _fake_response(detail_response),
        ]
        new_count = sync_inbox(project)

    assert new_count == 1
    message = EmailMessage.objects.get(project=project, gmail_message_id="msg-1")
    assert message.category == EmailCategory.PAYMENT
    assert message.requires_action is True

    decision = approvals.get_decision_for_subject(EMAIL_SUBJECT_TYPE, message.id)
    assert decision is not None
    assert decision.high_stakes is True
    accountable = decision.participants.get(raci_role="A")
    assert accountable.user_id == consultant_user.id


@pytest.mark.django_db
def test_acknowledge_confirms_hearing_on_linked_decision(project, email_account, consultant_user, project_manager_user):
    message = EmailMessage.objects.create(
        project=project, gmail_message_id="msg-2", from_address="pmc@example.com",
        subject="RFI: waterproofing spec", snippet="Which membrane spec applies?",
        category=EmailCategory.RFI, requires_action=True, received_at=timezone.now(),
    )
    decision = approvals.request_decision(
        project=project, title=f"Inbox: {message.subject}", requested_by=project_manager_user,
        raci=[{"user": consultant_user, "raci_role": "A"}, {"user": project_manager_user, "raci_role": "R"}],
        subject_type=EMAIL_SUBJECT_TYPE, subject_ref=str(message.id),
    )

    updated = acknowledge_message(message, consultant_user)

    assert updated.read_at is not None
    assert updated.read_by_id == consultant_user.id
    decision.refresh_from_db()
    assert decision.status in ("understanding", "agreeing")


@pytest.mark.django_db
def test_overdue_inbox_decision_escalates_to_project_manager_not_owner(project, owner_user, consultant_user, project_manager_user):
    ProjectMembership.objects.filter(user=owner_user, project=project).update(role=Role.OWNER)
    message = EmailMessage.objects.create(
        project=project, gmail_message_id="msg-3", from_address="pmc@example.com",
        subject="Safety alert: scaffold inspection overdue", snippet="",
        category=EmailCategory.SAFETY, requires_action=True, received_at=timezone.now(),
    )
    decision = approvals.request_decision(
        project=project, title=f"Inbox: {message.subject}", requested_by=project_manager_user,
        raci=[{"user": consultant_user, "raci_role": "A"}],
        subject_type=EMAIL_SUBJECT_TYPE, subject_ref=str(message.id),
    )
    decision.sla_deadline = timezone.now() - timezone.timedelta(hours=1)
    decision.save(update_fields=["sla_deadline"])

    escalated = approvals.escalate_if_breached(decision)

    assert escalated.status == "escalated"
    assert escalated.fallback_approver_id == project_manager_user.id


@pytest.mark.django_db
def test_email_message_list_api_includes_decision_status(project, email_account, consultant_user, project_manager_user):
    message = EmailMessage.objects.create(
        project=project, gmail_message_id="msg-4", from_address="pmc@example.com",
        subject="Submittal: lobby marble sample", snippet="", category=EmailCategory.SUBMITTAL,
        requires_action=True, received_at=timezone.now(),
    )
    approvals.request_decision(
        project=project, title=f"Inbox: {message.subject}", requested_by=project_manager_user,
        raci=[{"user": consultant_user, "raci_role": "A"}],
        subject_type=EMAIL_SUBJECT_TYPE, subject_ref=str(message.id),
    )

    client = APIClient()
    client.force_authenticate(consultant_user)
    response = client.get(f"/api/v1/email-integrations/messages/?project={project.id}")

    assert response.status_code == 200
    results = response.data.get("results", response.data)
    row = next(r for r in results if r["id"] == message.id)
    assert row["decision_status"] == "hearing"


def _fake_response(payload):
    class _Resp:
        def json(self):
            return payload

        def raise_for_status(self):
            return None

    return _Resp()
