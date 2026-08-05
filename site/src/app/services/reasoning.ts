// ─── Layer 2 · AI Reasoning ───────────────────────────────────────────────────
// Extraction reads one message in isolation. This layer reads an event *against
// the project*: what came before it, what state the project is in, what it
// contradicts, what it depends on, what it puts at risk.
//
// It consumes ConstructionEvents only — never raw messages, never channel
// formats. That is what lets WhatsApp, Outlook, Balady, Primavera or Teams plug
// in later without this file changing by a single line.

import type {
  ConstructionEvent,
  EventReasoning,
  Project,
  ProjectIntelligence,
  EventRelation,
  RiskType,
  RiskLevel,
  ScheduleImpact,
  ScheduleOutlook,
  Priority,
} from "../types";
import { REASONING_CONTEXT_EVENTS } from "../config";
import { generateJson, oneOf, str, clamp01 } from "./llm";

const RELATIONS: EventRelation[] = ["new", "update", "duplicate"];
const RISK_TYPES: RiskType[] = ["schedule", "cost", "safety", "compliance", "quality", "scope", "none"];
const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low", "none"];
const SCHEDULE_IMPACTS: ScheduleImpact[] = ["none", "possible", "likely", "confirmed"];
const OUTLOOKS: ScheduleOutlook[] = ["on-track", "at-risk", "slipping", "unknown"];
const PRIORITIES: Priority[] = ["high", "medium", "low"];

// ─── Context building ─────────────────────────────────────────────────────────
// Events are shown to the model under short refs (E1, E2 …) rather than raw
// ids: fewer tokens, and a generated id can never be mistaken for a real one —
// anything the model returns is resolved through the map or dropped.

interface RefTable {
  lines: string[];
  toEventId: Map<string, string>;
}

function buildRefTable(events: ConstructionEvent[]): RefTable {
  const toEventId = new Map<string, string>();
  const lines = events.map((e, i) => {
    const ref = `E${i + 1}`;
    toEventId.set(ref, e.id);
    const date = e.occurredAt.slice(0, 10);
    const action = e.actionRequired ? ` | action pending: ${e.actionRequired}` : "";
    const deadline = e.deadline ? ` | deadline: ${e.deadline}` : "";
    const safety = e.isSafetyAlert ? " | SAFETY" : "";
    return `[${ref}] ${date} | ${e.category} | priority ${e.priority}${safety} | from ${e.evidence.sender} (${e.evidence.channel}) | "${e.title}" | ${e.summary}${action}${deadline}`;
  });
  return { lines, toEventId };
}

function resolveRefs(value: unknown, table: RefTable, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => table.toEventId.get(String(v).trim().toUpperCase()))
    .filter((id): id is string => !!id)
    .slice(0, limit);
}

function projectStateBlock(project: Project, events: ConstructionEvent[]): string {
  const byCategory = new Map<string, number>();
  for (const e of events) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);

  const openActions = events.filter((e) => e.actionRequired.trim()).length;
  const safety = events.filter((e) => e.isSafetyAlert).length;
  const overdue = events.filter((e) => e.deadline && new Date(e.deadline) < new Date()).length;
  const mix = [...byCategory.entries()].map(([c, n]) => `${c}×${n}`).join(", ") || "none";

  return `Project: ${project.name} (${project.nameAr})
Location: ${project.location}
Current phase: ${project.phase}
Reported progress: ${project.progress}%
Events on record: ${events.length} (${mix})
Open actions: ${openActions} | Safety events: ${safety} | Past-deadline items: ${overdue}
Today's date: ${new Date().toISOString().slice(0, 10)}`;
}

// ─── Per-event reasoning ──────────────────────────────────────────────────────

const EVENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    relation: { type: "STRING", enum: RELATIONS },
    updatesEventRef: { type: "STRING" },
    dependsOnEventRefs: { type: "ARRAY", items: { type: "STRING" } },
    dependencyExplanation: { type: "STRING" },
    dependencyExplanationAr: { type: "STRING" },
    createsRisk: { type: "BOOLEAN" },
    riskType: { type: "STRING", enum: RISK_TYPES },
    riskSeverity: { type: "STRING", enum: RISK_LEVELS },
    riskExplanation: { type: "STRING" },
    riskExplanationAr: { type: "STRING" },
    scheduleImpact: { type: "STRING", enum: SCHEDULE_IMPACTS },
    scheduleImpactDays: { type: "NUMBER" },
    notifyProjectManager: { type: "BOOLEAN" },
    notifyReason: { type: "STRING" },
    notifyReasonAr: { type: "STRING" },
    contradictsPrevious: { type: "BOOLEAN" },
    contradictedEventRefs: { type: "ARRAY", items: { type: "STRING" } },
    contradictionExplanation: { type: "STRING" },
    contradictionExplanationAr: { type: "STRING" },
    rationale: { type: "STRING" },
    rationaleAr: { type: "STRING" },
    confidence: { type: "NUMBER" },
  },
  required: [
    "relation", "createsRisk", "riskType", "riskSeverity", "scheduleImpact",
    "notifyProjectManager", "contradictsPrevious", "rationale", "confidence",
  ],
};

function buildEventPrompt(
  event: ConstructionEvent,
  priorEvents: ConstructionEvent[],
  project: Project,
  table: RefTable
): string {
  return `You are the reasoning layer of San3, a construction intelligence platform for project owners in Saudi Arabia and the GCC.

A new construction event has just entered the project record. Your job is NOT to describe it — that is already done. Your job is to reason about what it MEANS for this project, given everything already on the record.

CURRENT PROJECT STATE
${projectStateBlock(project, priorEvents)}

PREVIOUS EVENTS ON THIS PROJECT (most recent first)
${table.lines.length ? table.lines.join("\n") : "(none — this is the first event on record)"}

THE NEW EVENT
Date: ${event.occurredAt}
Category: ${event.category} | Priority: ${event.priority}${event.isSafetyAlert ? " | SAFETY ALERT" : ""}
From: ${event.evidence.sender} (${event.evidence.channel})
Title: ${event.title}
Summary: ${event.summary}
Action required: ${event.actionRequired || "(none stated)"}
Deadline: ${event.deadline ?? "(none stated)"}
Stakeholders: ${event.stakeholders.join(", ") || "(none named)"}

REASON ABOUT
1. relation — is this genuinely NEW information, an UPDATE to an event already listed above, or a DUPLICATE of one? If update or duplicate, put that event's ref (e.g. "E3") in updatesEventRef. Use "" otherwise.
2. dependsOnEventRefs — earlier events this one depends on or follows from: an RFI answering an earlier RFI, a delivery unblocking earlier work, an inspection of work reported earlier. Explain the link in one sentence.
3. createsRisk / riskType / riskSeverity — does this create or escalate a real risk to the project? Not every event does. A routine progress update creates no risk; a bearing-capacity failure creates a critical one. Explain concretely, referencing what specifically is at stake.
4. scheduleImpact — could this delay the project? "none" if not, "possible" if it might, "likely" if it probably will, "confirmed" if a delay is already stated. scheduleImpactDays is your best numeric estimate in days, or 0 if unknown or none.
5. notifyProjectManager — should the project manager be told now, rather than reading it in a weekly report? True for safety, for anything blocking work, for contradictions, for decisions with a deadline. False for routine information.
6. contradictsPrevious — does this conflict with something already on the record? A contractor reporting "on track" after a delay was reported, two different dates for the same milestone, an approval of something previously rejected. List the conflicting refs and explain the conflict precisely.
7. rationale — 1-3 sentences explaining your reasoning to the owner. Write it as an analyst briefing a decision-maker, not as a summary of the event.
8. confidence — 0 to 1, how confident you are in this reasoning.

Every *Ar field is the same content in formal Arabic, natural for a Saudi construction professional. Leave a field "" when it does not apply — do not invent links, risks, or contradictions that are not there. Being wrong about a contradiction is worse than missing one.

Return only the structured JSON.`;
}

function normaliseEventReasoning(raw: any, table: RefTable): EventReasoning {
  const relation = oneOf(raw?.relation, RELATIONS, "new");
  const createsRisk = raw?.createsRisk === true;
  const contradicts = raw?.contradictsPrevious === true;
  const updatesRef = str(raw?.updatesEventRef).toUpperCase();
  const contradicted = resolveRefs(raw?.contradictedEventRefs, table);
  const days = Number(raw?.scheduleImpactDays ?? 0);

  return {
    relation,
    updatesEventId: table.toEventId.get(updatesRef) ?? null,
    dependsOnEventIds: resolveRefs(raw?.dependsOnEventRefs, table),
    dependencyExplanation: str(raw?.dependencyExplanation),
    dependencyExplanationAr: str(raw?.dependencyExplanationAr),
    createsRisk,
    riskType: createsRisk ? oneOf(raw?.riskType, RISK_TYPES, "schedule") : "none",
    riskSeverity: createsRisk ? oneOf(raw?.riskSeverity, RISK_LEVELS, "medium") : "none",
    riskExplanation: str(raw?.riskExplanation),
    riskExplanationAr: str(raw?.riskExplanationAr),
    scheduleImpact: oneOf(raw?.scheduleImpact, SCHEDULE_IMPACTS, "none"),
    scheduleImpactDays: Number.isFinite(days) && days > 0 ? Math.round(days) : null,
    notifyProjectManager: raw?.notifyProjectManager === true,
    notifyReason: str(raw?.notifyReason),
    notifyReasonAr: str(raw?.notifyReasonAr),
    // A contradiction claim only stands if it actually points at known events.
    contradictsPrevious: contradicts && contradicted.length > 0,
    contradictedEventIds: contradicted,
    contradictionExplanation: str(raw?.contradictionExplanation),
    contradictionExplanationAr: str(raw?.contradictionExplanationAr),
    rationale: str(raw?.rationale),
    rationaleAr: str(raw?.rationaleAr),
    confidence: clamp01(raw?.confidence),
  };
}

/**
 * Reasons about one event against the project record.
 * `priorEvents` must be the events that came BEFORE this one, most recent first.
 */
export async function reasonEvent(
  event: ConstructionEvent,
  priorEvents: ConstructionEvent[],
  project: Project
): Promise<EventReasoning | null> {
  const context = priorEvents.slice(0, REASONING_CONTEXT_EVENTS);
  const table = buildRefTable(context);

  const raw = await generateJson<any>({
    layer: "reasoning",
    prompt: buildEventPrompt(event, context, project, table),
    schema: EVENT_SCHEMA,
    // Reasoning depends on what came before, so the context is part of the key.
    cacheKey: `evt:${event.id}:${context.length}:${context[0]?.id ?? "none"}`,
    maxTokens: 1600,
  });

  return raw ? normaliseEventReasoning(raw, table) : null;
}

// ─── Project-level synthesis ──────────────────────────────────────────────────

const PROJECT_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    headlineAr: { type: "STRING" },
    narrative: { type: "STRING" },
    narrativeAr: { type: "STRING" },
    scheduleOutlook: { type: "STRING", enum: OUTLOOKS },
    scheduleNote: { type: "STRING" },
    scheduleNoteAr: { type: "STRING" },
    topRisks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          titleAr: { type: "STRING" },
          severity: { type: "STRING", enum: RISK_LEVELS },
          eventRefs: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["title", "severity"],
      },
    },
    recommendedActions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          action: { type: "STRING" },
          actionAr: { type: "STRING" },
          priority: { type: "STRING", enum: PRIORITIES },
          eventRefs: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["action", "priority"],
      },
    },
  },
  required: ["headline", "narrative", "scheduleOutlook"],
};

function buildProjectPrompt(project: Project, events: ConstructionEvent[], table: RefTable): string {
  const flags = events
    .filter((e) => e.reasoning)
    .map((e, i) => {
      const r = e.reasoning!;
      const bits: string[] = [];
      if (r.createsRisk) bits.push(`risk:${r.riskType}/${r.riskSeverity}`);
      if (r.scheduleImpact !== "none") bits.push(`schedule:${r.scheduleImpact}${r.scheduleImpactDays ? ` ~${r.scheduleImpactDays}d` : ""}`);
      if (r.contradictsPrevious) bits.push("contradicts earlier report");
      if (r.relation !== "new") bits.push(r.relation);
      return bits.length ? `[E${i + 1}] ${bits.join(", ")}` : null;
    })
    .filter(Boolean)
    .join("\n");

  return `You are the reasoning layer of San3, a construction intelligence platform for project owners in Saudi Arabia and the GCC.

Brief the project owner on the current state of this project. You are writing for someone who will not read the individual events — this briefing IS their view of the project.

PROJECT STATE
${projectStateBlock(project, events)}

EVENTS ON RECORD (most recent first)
${table.lines.join("\n")}

WHAT THE PER-EVENT REASONING FLAGGED
${flags || "(no flags raised)"}

PRODUCE
1. headline — one sentence, under 15 words, on where this project actually stands. Not a count of events; a judgement.
2. narrative — 2-4 sentences connecting what has happened into a story: what is progressing, what is stuck, what changed recently, what the owner should be worried about. Reference specific events by what they were, not by ref code.
3. scheduleOutlook — "on-track", "at-risk", "slipping", or "unknown". Base it on evidence in the record, not on the reported progress percentage, which is self-reported by the contractor.
4. scheduleNote — one sentence justifying that outlook.
5. topRisks — up to 4, most serious first, each with the refs of the events that evidence it. Only real risks visible in the record. If there are none, return an empty array rather than inventing one.
6. recommendedActions — up to 4 concrete next steps for the owner's team, most urgent first, each with supporting event refs. Actions the OWNER can take, not instructions to the contractor.

Every *Ar field is the same content in formal Arabic, natural for a Saudi construction professional.

Return only the structured JSON.`;
}

/** Shape of one topRisks entry as the model may return it — every field is
 *  unknown until sanitised. */
interface RawRisk {
  title?: unknown;
  titleAr?: unknown;
  severity?: unknown;
  eventRefs?: unknown;
}

/** Shape of one recommendedActions entry as the model may return it. */
interface RawAction {
  action?: unknown;
  actionAr?: unknown;
  priority?: unknown;
  eventRefs?: unknown;
}

function normaliseProjectIntelligence(raw: any, project: Project, events: ConstructionEvent[], table: RefTable): ProjectIntelligence {
  const risks: RawRisk[] = Array.isArray(raw?.topRisks) ? raw.topRisks.slice(0, 4) : [];
  const actions: RawAction[] = Array.isArray(raw?.recommendedActions) ? raw.recommendedActions.slice(0, 4) : [];

  return {
    projectId: project.id,
    headline: str(raw?.headline),
    headlineAr: str(raw?.headlineAr),
    narrative: str(raw?.narrative),
    narrativeAr: str(raw?.narrativeAr),
    scheduleOutlook: oneOf(raw?.scheduleOutlook, OUTLOOKS, "unknown"),
    scheduleNote: str(raw?.scheduleNote),
    scheduleNoteAr: str(raw?.scheduleNoteAr),
    topRisks: risks
      .map((r) => ({
        title: str(r?.title),
        titleAr: str(r?.titleAr),
        severity: oneOf(r?.severity, RISK_LEVELS, "medium"),
        eventIds: resolveRefs(r?.eventRefs, table, 4),
      }))
      .filter((r) => r.title),
    recommendedActions: actions
      .map((a) => ({
        action: str(a?.action),
        actionAr: str(a?.actionAr),
        priority: oneOf(a?.priority, PRIORITIES, "medium"),
        eventIds: resolveRefs(a?.eventRefs, table, 4),
      }))
      .filter((a) => a.action),
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
  };
}

/** Synthesises the whole record for one project into an owner briefing. */
export async function synthesizeProject(
  project: Project,
  events: ConstructionEvent[]
): Promise<ProjectIntelligence | null> {
  if (events.length === 0) return null;

  const context = events.slice(0, REASONING_CONTEXT_EVENTS);
  const table = buildRefTable(context);

  const raw = await generateJson<any>({
    layer: "reasoning",
    prompt: buildProjectPrompt(project, context, table),
    schema: PROJECT_SCHEMA,
    cacheKey: `proj:${project.id}:${context.length}:${context[0]?.id ?? "none"}`,
    maxTokens: 2000,
  });

  return raw ? normaliseProjectIntelligence(raw, project, context, table) : null;
}
