// ─── Layer 1 · AI Extraction ──────────────────────────────────────────────────
// One question, asked of every inbound message from every channel:
//   "What construction event, if any, is this?"
//
// It knows nothing about the project's history — that is Layer 2's job. Keeping
// the layers separate means extraction stays cheap and cacheable, and reasoning
// can be re-run over the record without re-reading a single message.

import type { Project, RawMessage, EventCategory, Priority, RiskLevel } from "../types";
import { PROJECT_ALIASES } from "../config";
import { generateJson, oneOf, str, strArray, clamp01 } from "./llm";

export const CATEGORIES: EventCategory[] = [
  "permit", "safety", "inspection", "rfi", "drawing-revision",
  "material-delivery", "progress-update", "consultant-review", "invoice",
  "variation-order", "delay", "procurement", "meeting", "other",
];

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low", "none"];

export interface Extraction {
  isConstructionRelated: boolean;
  confidence: number;
  project: string;
  eventTitle: string;
  eventTitleAr: string;
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
  needsHumanReview: boolean;
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    isConstructionRelated: { type: "BOOLEAN" },
    confidence: { type: "NUMBER" },
    project: { type: "STRING" },
    eventTitle: { type: "STRING" },
    eventTitleAr: { type: "STRING" },
    category: { type: "STRING", enum: CATEGORIES },
    priority: { type: "STRING", enum: PRIORITIES },
    summary: { type: "STRING" },
    summaryAr: { type: "STRING" },
    actionRequired: { type: "STRING" },
    actionRequiredAr: { type: "STRING" },
    stakeholders: { type: "ARRAY", items: { type: "STRING" } },
    riskLevel: { type: "STRING", enum: RISK_LEVELS },
    isSafetyAlert: { type: "BOOLEAN" },
    deadline: { type: "STRING" },
    attachmentsReferenced: { type: "ARRAY", items: { type: "STRING" } },
    needsHumanReview: { type: "BOOLEAN" },
  },
  required: [
    "isConstructionRelated", "confidence", "eventTitle", "category",
    "priority", "summary", "isSafetyAlert", "needsHumanReview",
  ],
};

function buildPrompt(msg: RawMessage, projects: Project[]): string {
  const roster = projects
    .map((p) => {
      const aliases = PROJECT_ALIASES[p.id]?.join(", ") ?? "";
      return `- name: "${p.name}" | Arabic name: "${p.nameAr}" | location: ${p.location} | phase: ${p.phase}${aliases ? ` | referred to on site as: ${aliases}` : ""}`;
    })
    .join("\n");

  return `You are the extraction layer of San3, a construction intelligence platform for owners and developers in Saudi Arabia and the GCC.

You read one raw communication from a project channel and decide what CONSTRUCTION EVENT — if any — it represents. You are not summarising an email; you are converting scattered communication into a structured project record.

PROJECTS ON THIS ACCOUNT:
${roster}

INCOMING MESSAGE
Channel: ${msg.channel}
From: ${msg.sender} <${msg.senderHandle}>
Received: ${msg.receivedAt}
Subject: ${msg.subject}
Attachments: ${msg.attachments.length ? msg.attachments.join(", ") : "none"}
Body:
"""
${(msg.body || msg.subject).slice(0, 6000)}
"""

INSTRUCTIONS
1. Decide whether this is genuinely about a construction project (site work, permits, inspections, design, procurement, contracts, safety, schedule, payment for construction work). Newsletters, marketing, personal mail, receipts unrelated to a project, automated notifications, and social messages are NOT construction-related — set isConstructionRelated to false and leave the other fields empty.
2. "confidence" is your confidence in that judgement AND in the extracted fields, from 0 to 1.
3. Set needsHumanReview to true when the message is ambiguous, when it may be construction-related but you cannot tell, when critical details contradict each other, or when you had to guess the project.
4. "project" must be exactly one "name" value from the roster above, copied verbatim — never a combination of a name and its Arabic form, never both. Use "" if you genuinely cannot tell which project it belongs to.
5. "eventTitle" describes what HAPPENED, in the language of construction — not the email subject line. Write it as a project record entry.
   Bad: "RE: RFI-102"           Good: "Consultant requested clarification on reinforcement layout"
   Bad: "Permit Approved"        Good: "Municipality approved the excavation permit"
6. "summary" is 1-2 sentences on what this means for the project. "actionRequired" is the concrete next step for the owner's team, or "" if none.
7. eventTitleAr / summaryAr / actionRequiredAr are the same content in formal Arabic — natural for a Saudi construction professional, not a literal translation.
8. "stakeholders" are the people or organisations involved (names, companies, authorities), as mentioned.
9. Set isSafetyAlert true ONLY for genuine safety matters: injury, accident, fire, fall, near miss, hazard, evacuation, or a safety violation. Safety events are always priority "high".
10. "deadline" is an ISO date (YYYY-MM-DD) if the message states or clearly implies one, otherwise "".
11. "attachmentsReferenced" are documents/drawings the message refers to, whether or not they were attached.

Return only the structured JSON.`;
}

function normalise(raw: any): Extraction {
  const isSafetyAlert = raw?.isSafetyAlert === true;
  const deadline = str(raw?.deadline);

  return {
    isConstructionRelated: raw?.isConstructionRelated === true,
    confidence: clamp01(raw?.confidence),
    project: str(raw?.project),
    eventTitle: str(raw?.eventTitle),
    eventTitleAr: str(raw?.eventTitleAr),
    category: oneOf(raw?.category, CATEGORIES, "other"),
    // A safety event is high priority regardless of what else the model said.
    priority: isSafetyAlert ? "high" : oneOf(raw?.priority, PRIORITIES, "medium"),
    summary: str(raw?.summary),
    summaryAr: str(raw?.summaryAr),
    actionRequired: str(raw?.actionRequired),
    actionRequiredAr: str(raw?.actionRequiredAr),
    stakeholders: strArray(raw?.stakeholders),
    riskLevel: oneOf(raw?.riskLevel, RISK_LEVELS, isSafetyAlert ? "high" : "none"),
    isSafetyAlert,
    deadline: deadline || null,
    attachmentsReferenced: strArray(raw?.attachmentsReferenced),
    needsHumanReview: raw?.needsHumanReview === true,
  };
}

/** Returns null when extraction was impossible — the caller routes those to
 *  human review rather than guessing. */
export async function extract(msg: RawMessage, projects: Project[]): Promise<Extraction | null> {
  const raw = await generateJson<any>({
    layer: "extraction",
    prompt: buildPrompt(msg, projects),
    schema: SCHEMA,
    cacheKey: `${msg.channel}:${msg.externalId}`,
  });
  return raw ? normalise(raw) : null;
}
