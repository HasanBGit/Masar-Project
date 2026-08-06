// ─── The pipeline ─────────────────────────────────────────────────────────────
//
//   channels ──▶ RawMessage[]
//                    │
//                    ▼  Layer 1 · extraction     "what is this message?"
//              ConstructionEvent[]
//                    │
//                    ▼  Layer 2 · reasoning      "what does it mean for the project?"
//        ConstructionEvent[] + reasoning  ──▶  ProjectIntelligence
//
// Every stage below the channel boundary speaks only ConstructionEvent. Adding
// WhatsApp, Outlook, Balady, Primavera or Teams means writing one adapter that
// emits RawMessage  -  no stage in this file changes, and neither AI layer knows
// a new source appeared.

import type {
  ConstructionEvent,
  Evidence,
  IngestionStats,
  Project,
  ProjectIntelligence,
  RawMessage,
} from "../types";
import {
  CONFIDENCE_THRESHOLD,
  EXTRACTION_CONCURRENCY,
  MAX_REASONED_EVENTS,
  REASONING_ENABLED,
} from "../config";
import { extract, type Extraction } from "./extraction";
import { reasonEvent, synthesizeProject } from "./reasoning";

export interface PipelineResult {
  /** Confident construction events  -  the project record. */
  events: ConstructionEvent[];
  /** Extracted but unsure  -  awaiting a human decision. */
  review: ConstructionEvent[];
  /** Owner briefing per project, from the reasoning layer. */
  intelligence: Record<string, ProjectIntelligence>;
  stats: IngestionStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toEvidence(msg: RawMessage): Evidence {
  return {
    channel: msg.channel,
    externalId: msg.externalId,
    sender: msg.sender,
    senderHandle: msg.senderHandle,
    originalSubject: msg.subject,
    originalBody: msg.body,
    receivedAt: msg.receivedAt,
    attachments: msg.attachments,
  };
}

/** Resolves the project the model named to a roster id.
 *  Generated text occasionally leaks reasoning into a string field, so an
 *  unrecognised value is only shown to the user if it still looks like a name. */
function resolveProject(named: string, projects: Project[]): { id: string | null; label: string } {
  const cleaned = named.split(/[\r\n]/)[0].trim().slice(0, 80);
  const needle = cleaned.toLowerCase();
  if (!needle) return { id: null, label: "" };

  const match = projects.find(
    (p) =>
      p.id.toLowerCase() === needle ||
      p.name.toLowerCase() === needle ||
      p.nameAr === cleaned ||
      p.name.toLowerCase().includes(needle) ||
      needle.includes(p.name.toLowerCase())
  );
  if (match) return { id: match.id, label: match.name };

  const plausible = cleaned.length <= 60 && named.trim().length <= 80;
  return { id: null, label: plausible ? cleaned : "" };
}

function buildEvent(msg: RawMessage, extraction: Extraction, projects: Project[]): ConstructionEvent {
  const project = resolveProject(extraction.project, projects);
  const title = extraction.eventTitle || msg.subject;

  return {
    id: `evt-${msg.channel}-${msg.externalId}`,
    projectId: project.id,
    projectLabel: project.label,
    title,
    titleAr: extraction.eventTitleAr || title,
    category: extraction.category,
    priority: extraction.priority,
    summary: extraction.summary,
    summaryAr: extraction.summaryAr || extraction.summary,
    actionRequired: extraction.actionRequired,
    actionRequiredAr: extraction.actionRequiredAr || extraction.actionRequired,
    stakeholders: extraction.stakeholders,
    riskLevel: extraction.riskLevel,
    isSafetyAlert: extraction.isSafetyAlert,
    deadline: extraction.deadline,
    attachmentsReferenced: extraction.attachmentsReferenced,
    occurredAt: msg.receivedAt, // original timestamp, never import time
    confidence: extraction.confidence,
    needsHumanReview: extraction.needsHumanReview || extraction.confidence < CONFIDENCE_THRESHOLD,
    evidence: toEvidence(msg),
  };
}

/** A message the model couldn't process  -  held for a human, not guessed at. */
function unprocessedEvent(msg: RawMessage): ConstructionEvent {
  return {
    id: `evt-${msg.channel}-${msg.externalId}`,
    projectId: null,
    projectLabel: "",
    title: msg.subject,
    titleAr: msg.subject,
    category: "other",
    priority: "medium",
    summary: "",
    summaryAr: "",
    actionRequired: "",
    actionRequiredAr: "",
    stakeholders: [],
    riskLevel: "none",
    isSafetyAlert: false,
    deadline: null,
    attachmentsReferenced: [],
    occurredAt: msg.receivedAt,
    confidence: 0,
    needsHumanReview: true,
    evidence: toEvidence(msg),
  };
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const byRecency = (a: ConstructionEvent, b: ConstructionEvent) =>
  new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();

/** Runs `task` over `items` with a bounded number of calls in flight. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

// ─── Stage 1 · extraction ─────────────────────────────────────────────────────

async function runExtraction(messages: RawMessage[], projects: Project[]) {
  const events: ConstructionEvent[] = [];
  const review: ConstructionEvent[] = [];
  let filtered = 0;
  let failed = 0;

  const extractions = await pool(messages, EXTRACTION_CONCURRENCY, async (msg) => ({
    msg,
    extraction: await extract(msg, projects),
  }));

  for (const { msg, extraction } of extractions) {
    // Extraction unavailable  -  hold for review rather than guess.
    if (!extraction) {
      failed += 1;
      review.push(unprocessedEvent(msg));
      continue;
    }

    // Understood, and it isn't about a construction project. Drop it.
    if (!extraction.isConstructionRelated) {
      filtered += 1;
      continue;
    }

    const event = buildEvent(msg, extraction, projects);
    (event.needsHumanReview ? review : events).push(event);
  }

  return { events, review, filtered, failed };
}

// ─── Stage 2 · reasoning ──────────────────────────────────────────────────────
// Deliberately sequential and oldest-first: each event is reasoned about
// against the events that genuinely preceded it, which is the whole point.

async function runReasoning(events: ConstructionEvent[], projects: Project[]): Promise<ConstructionEvent[]> {
  const reasoned: ConstructionEvent[] = [];

  for (const project of projects) {
    const projectEvents = events
      .filter((e) => e.projectId === project.id)
      .sort(byRecency);

    // Newest N get reasoned; anything older stays on the record without it.
    const inScope = projectEvents.slice(0, MAX_REASONED_EVENTS);
    const outOfScope = projectEvents.slice(MAX_REASONED_EVENTS);

    const chronological = [...inScope].reverse();
    const processed: ConstructionEvent[] = [];

    for (const event of chronological) {
      const prior = [...processed].sort(byRecency);
      const reasoning = await reasonEvent(event, prior, project);
      processed.push(reasoning ? { ...event, reasoning } : event);
    }

    reasoned.push(...processed, ...outOfScope);
  }

  // Events with no project can't be reasoned about in project context.
  reasoned.push(...events.filter((e) => !e.projectId));
  return reasoned.sort(byRecency);
}

async function runSynthesis(events: ConstructionEvent[], projects: Project[]) {
  const intelligence: Record<string, ProjectIntelligence> = {};

  for (const project of projects) {
    const projectEvents = events.filter((e) => e.projectId === project.id).sort(byRecency);
    if (projectEvents.length === 0) continue;

    const brief = await synthesizeProject(project, projectEvents);
    if (brief) intelligence[project.id] = brief;
  }

  return intelligence;
}

// ─── Orchestration ────────────────────────────────────────────────────────────

export async function runPipeline(
  messages: RawMessage[],
  projects: Project[],
  onStage?: (stage: "extracting" | "reasoning" | "synthesising") => void
): Promise<PipelineResult> {
  onStage?.("extracting");
  const { events, review, filtered, failed } = await runExtraction(messages, projects);

  let finalEvents = events;
  let intelligence: Record<string, ProjectIntelligence> = {};

  if (REASONING_ENABLED && events.length > 0) {
    onStage?.("reasoning");
    finalEvents = await runReasoning(events, projects);

    onStage?.("synthesising");
    intelligence = await runSynthesis(finalEvents, projects);
  }

  finalEvents.sort(byRecency);
  review.sort(byRecency);

  return {
    events: finalEvents,
    review,
    intelligence,
    stats: {
      received: messages.length,
      receivedToday: messages.filter((m) => isToday(m.receivedAt)).length,
      events: finalEvents.length,
      filtered,
      needsReview: review.length,
      failed,
      reasoned: finalEvents.filter((e) => e.reasoning).length,
      lastRun: new Date().toISOString(),
    },
  };
}

/** Re-runs reasoning and synthesis over an existing record without touching
 *  any channel  -  the record is already channel-neutral, so this is free of I/O
 *  against Gmail or anything else. */
export async function rerunReasoning(
  events: ConstructionEvent[],
  projects: Project[]
): Promise<{ events: ConstructionEvent[]; intelligence: Record<string, ProjectIntelligence> }> {
  const reasoned = await runReasoning(events, projects);
  const intelligence = await runSynthesis(reasoned, projects);
  return { events: reasoned, intelligence };
}
