"""
Inbox Decisions - Gmail sync + the read-and-act SLA flow.

Reuses approvals-workflow's 3-Edges infrastructure rather than building a
parallel one: a synced email that needs action becomes a Decision in the
Hearing edge; "I have read this and will act" is `confirm_hearing`; if
nobody does that before the SLA deadline, the existing escalation sweep
fires (see approvals.services.escalate_if_breached's inbox_email
special-case). This module owns Gmail OAuth/sync only.
"""

import secrets
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.utils import timezone

import approvals.services as approvals
import trust_evidence.services as trust_evidence
from accounts.models import ProjectMembership, Role

from .exceptions import GmailNotConfigured
from .models import (
    ACTION_REQUIRED_CATEGORIES,
    EMAIL_SUBJECT_TYPE,
    EmailAccount,
    EmailCategory,
    EmailMessage,
    OAuthState,
)

GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

# Roles allowed to connect/disconnect/sync the project's Gmail account -
# same shape as contract_payments.FINANCIAL_ACTION_ROLES: a plain string set
# checked by the view layer, not a project-wide RBAC primitive.
EMAIL_ACCOUNT_MANAGE_ROLES = {"owner", "consultant", "project_manager"}

OAUTH_STATE_TTL_MINUTES = 10

_CATEGORY_KEYWORDS = {
    EmailCategory.SAFETY: ("safety", "hazard", "incident", "ppe", "injury"),
    EmailCategory.PAYMENT: ("invoice", "payment", "valuation", "zatca", "milestone"),
    EmailCategory.SUBMITTAL: ("submittal", "shop drawing", "material approval", "sample"),
    EmailCategory.RFI: ("rfi", "request for information", "clarification"),
}


def _require_configured():
    if not settings.GOOGLE_OAUTH_CLIENT_ID or not settings.GOOGLE_OAUTH_CLIENT_SECRET:
        raise GmailNotConfigured("Gmail sync is not configured (missing Google OAuth client credentials).")


def _classify(subject: str, snippet: str) -> str:
    text = f"{subject} {snippet}".lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category
    return EmailCategory.GENERAL


def get_authorize_url(project, redirect_uri: str, requested_by) -> str:
    _require_configured()
    state = secrets.token_urlsafe(32)
    OAuthState.objects.create(state=state, project=project, user=requested_by)
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GMAIL_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    query = "&".join(f"{key}={requests.utils.quote(str(value), safe='')}" for key, value in params.items())
    return f"{GOOGLE_AUTHORIZE_URL}?{query}"


def _consume_oauth_state(state: str, user, project) -> None:
    """Single-use, TTL-bound, and bound to the user+project that started the
    flow - the callback's `project`/`code` are never trusted on their own."""
    cutoff = timezone.now() - timedelta(minutes=OAUTH_STATE_TTL_MINUTES)
    row = OAuthState.objects.filter(state=state, user=user, project=project, created_at__gte=cutoff).first()
    if row is None:
        raise ValueError("Invalid, expired, or already-used OAuth state.")
    row.delete()


def connect_account(*, project, code: str, redirect_uri: str, connected_by, state: str) -> EmailAccount:
    _require_configured()
    _consume_oauth_state(state, connected_by, project)
    token_response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    token_response.raise_for_status()
    tokens = token_response.json()

    profile_response = requests.get(
        f"{GMAIL_API_BASE}/profile",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        timeout=10,
    )
    profile_response.raise_for_status()
    email_address = profile_response.json()["emailAddress"]

    account, _ = EmailAccount.objects.update_or_create(
        project=project,
        defaults={
            "email_address": email_address,
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token", ""),
            "token_expires_at": timezone.now() + timedelta(seconds=tokens.get("expires_in", 3600)),
            "connected_by": connected_by,
        },
    )
    trust_evidence.record_event(
        project=project, actor=connected_by, event_type="email_account_connected",
        subject_type="email_account", subject_id=account.id, payload={"email_address": email_address},
    )
    return account


def disconnect_account(account: EmailAccount, removed_by) -> None:
    project = account.project
    trust_evidence.record_event(
        project=project, actor=removed_by, event_type="email_account_disconnected",
        subject_type="email_account", subject_id=account.id, payload={"email_address": account.email_address},
    )
    account.delete()


def _valid_access_token(account: EmailAccount) -> str:
    if account.token_expires_at and timezone.now() < account.token_expires_at - timedelta(minutes=2):
        return account.access_token

    refresh_response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "refresh_token": account.refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=10,
    )
    refresh_response.raise_for_status()
    tokens = refresh_response.json()
    account.access_token = tokens["access_token"]
    account.token_expires_at = timezone.now() + timedelta(seconds=tokens.get("expires_in", 3600))
    account.save(update_fields=["access_token", "token_expires_at", "updated_at"])
    return account.access_token


def _default_raci(project) -> list[dict]:
    """Consultant is the default accountable approver for PM/Designer-originated
    items (per the project's role hierarchy); Project Manager stays Responsible
    for chasing it. Falls back to the Owner if no Consultant is on the roster yet."""
    consultant = ProjectMembership.objects.filter(project=project, role=Role.CONSULTANT).first()
    project_manager = ProjectMembership.objects.filter(project=project, role=Role.PROJECT_MANAGER).first()
    accountable = consultant.user if consultant else ProjectMembership.objects.filter(project=project, role=Role.OWNER).first().user
    rows = [{"user": accountable, "raci_role": "A"}]
    if project_manager and project_manager.user_id != accountable.id:
        rows.append({"user": project_manager.user, "raci_role": "R"})
    return rows


def sync_inbox(project) -> int:
    """Pulls recent Gmail messages, ingests new ones, and opens an Inbox
    Decision for anything that needs a read-and-act response. Returns the
    count of newly-ingested messages."""
    _require_configured()
    account = EmailAccount.objects.filter(project=project).first()
    if account is None:
        raise EmailAccount.DoesNotExist(f"No Gmail account connected for {project}.")

    access_token = _valid_access_token(account)
    headers = {"Authorization": f"Bearer {access_token}"}

    list_response = requests.get(
        f"{GMAIL_API_BASE}/messages", headers=headers, params={"maxResults": 25, "q": "newer_than:14d"}, timeout=10,
    )
    list_response.raise_for_status()
    message_ids = [m["id"] for m in list_response.json().get("messages", [])]

    already_synced = set(
        EmailMessage.objects.filter(project=project, gmail_message_id__in=message_ids).values_list(
            "gmail_message_id", flat=True
        )
    )
    new_count = 0
    for message_id in message_ids:
        if message_id in already_synced:
            continue
        detail_response = requests.get(
            f"{GMAIL_API_BASE}/messages/{message_id}",
            headers=headers,
            params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
            timeout=10,
        )
        detail_response.raise_for_status()
        detail = detail_response.json()
        header_map = {h["name"]: h["value"] for h in detail.get("payload", {}).get("headers", [])}
        subject = header_map.get("Subject", "(no subject)")
        snippet = detail.get("snippet", "")
        category = _classify(subject, snippet)
        requires_action = category in ACTION_REQUIRED_CATEGORIES

        if "internalDate" in detail:
            received_at = datetime.fromtimestamp(int(detail["internalDate"]) / 1000, tz=timezone.get_current_timezone())
        else:
            received_at = timezone.now()

        message = EmailMessage.objects.create(
            project=project,
            gmail_message_id=message_id,
            gmail_thread_id=detail.get("threadId", ""),
            from_address=header_map.get("From", ""),
            subject=subject,
            snippet=snippet,
            category=category,
            requires_action=requires_action,
            received_at=received_at,
        )
        new_count += 1

        if requires_action:
            high_stakes = category == EmailCategory.PAYMENT
            approvals.request_decision(
                project=project,
                title=f"Inbox: {subject}",
                description=snippet,
                requested_by=account.connected_by,
                raci=_default_raci(project),
                high_stakes=high_stakes,
                subject_type=EMAIL_SUBJECT_TYPE,
                subject_ref=str(message.id),
            )

    account.last_synced_at = timezone.now()
    account.save(update_fields=["last_synced_at", "updated_at"])
    return new_count


def acknowledge_message(message: EmailMessage, user) -> EmailMessage:
    """The "I have read it and will act" gesture - marks the message read and
    confirms the Hearing edge on its linked Decision, if it has one."""
    message.read_at = timezone.now()
    message.read_by = user
    message.save(update_fields=["read_at", "read_by", "updated_at"])

    decision = approvals.get_decision_for_subject(EMAIL_SUBJECT_TYPE, message.id)
    if decision is not None and decision.status == "hearing":
        approvals.confirm_hearing(decision, user)
    return message


def get_decision_for_message(message: EmailMessage):
    return approvals.get_decision_for_subject(EMAIL_SUBJECT_TYPE, message.id)
