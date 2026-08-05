// Stable identifiers only — title/summary/phase-label text lives in
// src/i18n/locales/{en,ar}.json under modules.items.<number> and
// modules.phases.<phaseKey>, kept in sync with skills/README.md's module
// index and each module's own SKILL.md "Why this exists / Ground truth".

export type PhaseKey = "core" | "phase2" | "phase3" | "phase4";

export type ModuleMeta = {
  number: number;
  skill: string;
  phase: PhaseKey;
};

export const modules: ModuleMeta[] = [
  { number: 1, skill: "field-capture", phase: "core" },
  { number: 2, skill: "unified-timeline", phase: "core" },
  { number: 3, skill: "owner-dashboard", phase: "core" },
  { number: 4, skill: "approvals-workflow", phase: "core" },
  { number: 5, skill: "trust-evidence", phase: "core" },
  { number: 12, skill: "contract-payments", phase: "core" },
  { number: 15, skill: "observability", phase: "core" },
  { number: 17, skill: "access-control-admin", phase: "core" },
  { number: 6, skill: "rfi-change-control", phase: "phase2" },
  { number: 7, skill: "handover-closeout", phase: "phase2" },
  { number: 16, skill: "search", phase: "phase2" },
  { number: 8, skill: "multilingual-voice", phase: "phase3" },
  { number: 9, skill: "safety-signals", phase: "phase3" },
  { number: 10, skill: "trust-calibrated-ux", phase: "phase3" },
  { number: 11, skill: "remote-stakeholder-support", phase: "phase3" },
  { number: 13, skill: "portfolio-governance", phase: "phase4" },
  { number: 14, skill: "platform-api", phase: "phase4" },
];

export const phaseOrder: PhaseKey[] = ["core", "phase2", "phase3", "phase4"];
