// ─── San3 — Construction Intelligence Platform · shared types ─────────────────
//
// Architectural rule: nothing below this line knows what Gmail is.
// A communication channel produces `RawMessage`; the AI extraction layer turns
// that into a `ConstructionEvent`; the UI only ever renders ConstructionEvents.
// Adding WhatsApp / Outlook / Balady / Primavera / Teams means writing one new
// ChannelAdapter — no change to this model and no change to any component.

export type Priority = "high" | "medium" | "low";
export type RiskLevel = "critical" | "high" | "medium" | "low" | "none";
export type SyncState = "idle" | "syncing" | "error";
export type Panel = "dashboard" | "timeline" | "sources" | "health";

export type SourceChannel =
  | "gmail"
  | "whatsapp"
  | "outlook"
  | "balady"
  | "primavera"
  | "teams";

export type EventCategory =
  | "permit"
  | "safety"
  | "inspection"
  | "rfi"
  | "drawing-revision"
  | "material-delivery"
  | "progress-update"
  | "consultant-review"
  | "invoice"
  | "variation-order"
  | "delay"
  | "procurement"
  | "meeting"
  | "other";

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  nameAr: string;
  location: string;
  phase: string;
  phaseAr: string;
  progress: number;
}

// ─── Channel layer ────────────────────────────────────────────────────────────

/** A channel-neutral inbound message. Every connector emits exactly this. */
export interface RawMessage {
  channel: SourceChannel;
  externalId: string;   // channel-internal id — used for dedupe/caching, never rendered
  threadRef?: string;
  sender: string;       // display name
  senderHandle: string; // email address / phone number / portal reference
  subject: string;
  body: string;
  receivedAt: string;   // ISO timestamp
  attachments: string[];
}

// ─── Evidence ─────────────────────────────────────────────────────────────────

/** The original communication, kept as supporting evidence behind the event.
 *  Human-readable fields only — no headers, ids, payloads or auth metadata. */
export interface Evidence {
  channel: SourceChannel;
  externalId: string;   // internal only — never rendered in the UI
  sender: string;
  senderHandle: string;
  originalSubject: string;
  originalBody: string;
  receivedAt: string;
  attachments: string[];
}

// ─── Layer 2 · reasoning ──────────────────────────────────────────────────────
// Extraction says what a message *is*. Reasoning says what it *means* for the
// project, by looking at the event against everything that came before it.

export type EventRelation = "new" | "update" | "duplicate";
export type RiskType = "schedule" | "cost" | "safety" | "compliance" | "quality" | "scope" | "none";
export type ScheduleImpact = "none" | "possible" | "likely" | "confirmed";
export type ScheduleOutlook = "on-track" | "at-risk" | "slipping" | "unknown";

/** The reasoning engine's verdict on one event, in the context of the project. */
export interface EventReasoning {
  /** Is this a new event, an update to one already on the record, or a repeat? */
  relation: EventRelation;
  updatesEventId: string | null;

  /** Dependencies and linkage to earlier events. */
  dependsOnEventIds: string[];
  dependencyExplanation: string;
  dependencyExplanationAr: string;

  /** Does it create a risk? */
  createsRisk: boolean;
  riskType: RiskType;
  riskSeverity: RiskLevel;
  riskExplanation: string;
  riskExplanationAr: string;

  /** Does it affect the schedule? */
  scheduleImpact: ScheduleImpact;
  scheduleImpactDays: number | null;

  /** Does it need to reach the project manager? */
  notifyProjectManager: boolean;
  notifyReason: string;
  notifyReasonAr: string;

  /** Does it contradict what was said before? */
  contradictsPrevious: boolean;
  contradictedEventIds: string[];
  contradictionExplanation: string;
  contradictionExplanationAr: string;

  rationale: string;
  rationaleAr: string;
  confidence: number;
}

/** Project-level synthesis across every event — what the Dashboard shows. */
export interface ProjectIntelligence {
  projectId: string;
  headline: string;
  headlineAr: string;
  narrative: string;
  narrativeAr: string;
  scheduleOutlook: ScheduleOutlook;
  scheduleNote: string;
  scheduleNoteAr: string;
  topRisks: {
    title: string;
    titleAr: string;
    severity: RiskLevel;
    eventIds: string[];
  }[];
  recommendedActions: {
    action: string;
    actionAr: string;
    priority: Priority;
    eventIds: string[];
  }[];
  generatedAt: string;
  eventCount: number;
}

// ─── The unit of truth ────────────────────────────────────────────────────────

/** A structured construction event. This — not a message — is what the
 *  timeline, dashboard and every future channel converge on. */
export interface ConstructionEvent {
  id: string;
  projectId: string | null;
  projectLabel: string;        // project as the AI named it (shown when unmapped)
  title: string;
  titleAr: string;
  category: EventCategory;
  priority: Priority;
  summary: string;
  summaryAr: string;
  actionRequired: string;
  actionRequiredAr: string;
  stakeholders: string[];
  riskLevel: RiskLevel;
  isSafetyAlert: boolean;
  deadline: string | null;
  attachmentsReferenced: string[];
  occurredAt: string;
  confidence: number;          // 0–1, from the extraction layer
  needsHumanReview: boolean;
  evidence: Evidence;
  /** Layer 2's verdict. Absent when reasoning is off or unavailable — the event
   *  is still a valid record entry, it just has no interpretation yet. */
  reasoning?: EventReasoning;
}

// ─── Ingestion telemetry ──────────────────────────────────────────────────────
export interface IngestionStats {
  received: number;      // raw messages pulled from all connected channels
  receivedToday: number; // ...of which arrived today, across every channel
  events: number;      // construction events extracted
  filtered: number;    // understood as not construction-related, discarded
  needsReview: number; // low confidence / explicitly flagged by the model
  failed: number;      // extraction errors — routed to review, never dropped
  reasoned: number;    // events Layer 2 produced an interpretation for
  lastRun?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface GmailUser {
  email: string;
  name: string;
  initials: string;
}

export interface AuthState {
  token: string | null;
  user: GmailUser | null;
  isLoading: boolean;
  error: string | null;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export interface ConnectorStatus {
  id: string;
  name: string;
  nameAr: string;
  kind: "channel" | "intelligence";
  available: boolean;
  connected: boolean;
  lastSync?: string;
  count?: number;
  detail?: string;
  detailAr?: string;
  healthy?: boolean;
}
