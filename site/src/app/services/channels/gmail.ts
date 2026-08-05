// ─── Gmail channel adapter ────────────────────────────────────────────────────
// Gmail is a *source of communication*, nothing more. This file's only job is
// to turn Gmail's wire format into channel-neutral RawMessages. Nothing
// downstream — not the pipeline, not the timeline, not the dashboard — knows
// that Gmail was involved beyond the channel tag on the evidence record.

import type { RawMessage, GmailUser } from "../../types";
import { MAX_MESSAGES, GMAIL_LABEL_FILTER } from "../../config";

const BASE = "https://gmail.googleapis.com/gmail/v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseFrom(from: string): { name: string; email: string } {
  // "John Smith <john@example.com>" or just "john@example.com"
  const match = from.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2] };
  return { name: from, email: from };
}

function decodeBase64Url(data: string): string {
  try {
    return decodeURIComponent(
      atob(data.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return "";
  }
}

interface GmailPayload {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; attachmentId?: string };
  parts?: GmailPayload[];
  filename?: string;
}

// Extract plain text body from Gmail payload (handles multipart recursively)
function extractBody(payload: GmailPayload): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    // Prefer text/plain over text/html
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);

    // Recurse into nested parts
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  return "";
}

// Strip HTML so the model reads prose, not markup
function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractAttachments(payload: GmailPayload): string[] {
  const results: string[] = [];
  if (!payload) return results;

  if (payload.filename && payload.body?.attachmentId) {
    results.push(payload.filename);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      results.push(...extractAttachments(part));
    }
  }
  return results;
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function gmailFetch(token: string, path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Gmail API error ${res.status}`);
  }
  return res.json();
}

/** Fetch the authenticated user's profile */
export async function fetchGmailUser(token: string): Promise<GmailUser> {
  const profile = await gmailFetch(token, "/users/me/profile");
  const email: string = profile.emailAddress ?? "";
  // Also try userinfo endpoint for display name
  let name = email;
  try {
    const uiRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (uiRes.ok) {
      const ui = await uiRes.json();
      name = ui.name ?? email;
    }
  } catch {
    /* non-fatal */
  }
  const parts = name.split(" ");
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return { email, name, initials };
}

// ─── Label resolution ─────────────────────────────────────────────────────────

async function resolveLabelId(token: string, labelName: string): Promise<string | null> {
  const data = await gmailFetch(token, "/users/me/labels");
  const labels: { id: string; name: string }[] = data.labels ?? [];
  const match = labels.find((l) => l.name.toLowerCase() === labelName.toLowerCase());
  return match?.id ?? null;
}

// ─── Adapter entry point ──────────────────────────────────────────────────────

/** Pulls messages and hands them over as channel-neutral RawMessages. */
export async function fetchGmailMessages(token: string): Promise<RawMessage[]> {
  let labelId: string | null = null;
  if (GMAIL_LABEL_FILTER) {
    labelId = await resolveLabelId(token, GMAIL_LABEL_FILTER);
    if (!labelId) {
      throw new Error(
        `Gmail label "${GMAIL_LABEL_FILTER}" not found. Please create it in your Gmail account first.`
      );
    }
  }

  const query = labelId
    ? `/users/me/messages?maxResults=${MAX_MESSAGES}&labelIds=${labelId}`
    : `/users/me/messages?maxResults=${MAX_MESSAGES}&q=in:inbox`;

  const listData = await gmailFetch(token, query);
  const ids: { id: string }[] = listData.messages ?? [];
  if (ids.length === 0) return [];

  const BATCH = 10;
  const messages: RawMessage[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(({ id }) =>
        gmailFetch(token, `/users/me/messages/${id}?format=full`).then(toRawMessage)
      )
    );
    messages.push(...results);
  }

  return messages.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
}

function toRawMessage(msg: any): RawMessage {
  const headers = msg.payload?.headers ?? [];
  const { name, email } = parseFrom(getHeader(headers, "From"));
  const subject = getHeader(headers, "Subject") || "(no subject)";
  const dateStr = getHeader(headers, "Date");
  const receivedAt = dateStr
    ? new Date(dateStr).toISOString()
    : new Date(msg.internalDate ? Number(msg.internalDate) : Date.now()).toISOString();

  const rawBody = extractBody(msg.payload);
  const body = stripHtml(rawBody) || msg.snippet || "";

  return {
    channel: "gmail",
    externalId: msg.id,
    threadRef: msg.threadId,
    sender: name || email,
    senderHandle: email,
    subject,
    body,
    receivedAt,
    attachments: extractAttachments(msg.payload),
  };
}
