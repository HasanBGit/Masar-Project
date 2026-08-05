// ─── Communication Hub — Gmail only (MVP) ─────────────────────────────────────
// Module 1 (field-capture) — ingestion of messages into the project record.
// No headers, no payload, no tokens, no dev tools. Project manager view only.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GMAIL_ACCOUNT,
  IMPORTED_EMAILS,
  PROJECTS,
  type Priority,
} from "./mockData";
import { useWorkspace } from "./WorkspaceContext";

const PRIORITY_META: Record<Priority, { label: string; labelAr: string; cls: string }> = {
  high: { label: "High", labelAr: "عالية", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  medium: { label: "Medium", labelAr: "متوسطة", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  low: { label: "Low", labelAr: "منخفضة", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function formatTime(iso: string, isAr: boolean) {
  return new Date(iso).toLocaleString(isAr ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(iso: string, isAr: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (isAr) {
    if (days > 0) return `منذ ${days} ${days === 1 ? "يوم" : "أيام"}`;
    if (hours > 0) return `منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
    return `منذ ${mins} دقيقة`;
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

const STATUS_META = {
  imported: { label: "Imported", labelAr: "مُستورد", cls: "bg-sky-500/10 text-sky-400" },
  mapped: { label: "Mapped to project", labelAr: "مرتبط بالمشروع", cls: "bg-emerald-500/10 text-emerald-400" },
  "needs-review": { label: "Needs review", labelAr: "يحتاج مراجعة", cls: "bg-amber-500/10 text-amber-400" },
};

export function CommsPanel() {
  const { i18n } = useTranslation();
  const { activeProject, darkMode } = useWorkspace();
  const isAr = i18n.language === "ar";

  const [isConnected] = useState(true); // mock: always connected
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const emails = IMPORTED_EMAILS.filter((e) => e.projectId === activeProject.id);

  const bg = darkMode ? "bg-[#0d1520]" : "bg-white";
  const cardBg = darkMode ? "bg-[#111c2d] border-white/8" : "bg-gray-50 border-gray-200";
  const textCls = darkMode ? "text-white/90" : "text-gray-900";
  const subCls = darkMode ? "text-white/50" : "text-gray-500";
  const labelCls = darkMode ? "text-white/30" : "text-gray-400";
  const panelBg = darkMode ? "bg-[#111c2d] border-white/8" : "bg-gray-50 border-gray-200";

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2200);
  }

  return (
    <div className={`flex h-full flex-col ${bg}`}>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* ── Gmail Account Card ── */}
        <div className={`rounded-2xl border p-5 ${panelBg}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {/* Gmail avatar */}
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EA4335]/15 text-[1.4rem]">
                  ✉
                </div>
                <div className={`absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 ${darkMode ? "border-[#111c2d]" : "border-gray-50"} ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
              </div>
              <div>
                <div className={`font-display text-[0.96rem] font-bold ${textCls}`}>
                  Gmail
                </div>
                <div className={`text-[0.82rem] ${subCls}`}>
                  {GMAIL_ACCOUNT.email}
                </div>
              </div>
            </div>

            {/* Status + sync button */}
            <div className="flex items-center gap-3">
              <div className="text-end">
                <div className={`flex items-center gap-1.5 text-[0.8rem] font-semibold ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
                  <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`} />
                  {isConnected
                    ? (isAr ? "متصل" : "Connected")
                    : (isAr ? "غير متصل" : "Disconnected")}
                </div>
                <div className={`mt-0.5 text-[0.72rem] ${labelCls}`}>
                  {isAr ? "آخر مزامنة: " : "Last sync: "}
                  {formatRelativeTime(GMAIL_ACCOUNT.lastSync, isAr)}
                </div>
              </div>

              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={`flex h-9 items-center gap-2 rounded-xl px-4 text-[0.82rem] font-semibold transition-all ${
                  isSyncing
                    ? "cursor-not-allowed opacity-50"
                    : "hover:opacity-90 active:scale-95"
                } bg-[#c9a227] text-[#0a1628]`}
              >
                <span className={isSyncing ? "animate-spin" : ""}>↻</span>
                {isSyncing
                  ? (isAr ? "جارٍ المزامنة…" : "Syncing…")
                  : (isAr ? "مزامنة الآن" : "Sync now")}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className={`mt-4 grid grid-cols-3 divide-x rounded-xl border ${darkMode ? "border-white/8 divide-white/8" : "border-gray-200 divide-gray-200"}`} dir="ltr">
            <Stat label={isAr ? "مُستورد إجمالاً" : "Total imported"} value={GMAIL_ACCOUNT.totalImported.toString()} darkMode={darkMode} />
            <Stat label={isAr ? "اليوم" : "Today"} value={GMAIL_ACCOUNT.todayImported.toString()} darkMode={darkMode} />
            <Stat label={isAr ? "يحتاج مراجعة" : "Needs review"} value={emails.filter(e => e.status === "needs-review").length.toString()} darkMode={darkMode} accent />
          </div>
        </div>

        {/* ── Imported Emails List ── */}
        <div>
          <div className={`mb-3 text-[0.78rem] font-semibold uppercase tracking-widest ${labelCls}`}>
            {isAr ? "الرسائل المستوردة" : "Imported emails"} · {activeProject[isAr ? "nameAr" : "name"]}
          </div>

          {emails.length === 0 && (
            <div className={`py-12 text-center text-[0.9rem] ${labelCls}`}>
              {isAr ? "لا رسائل لهذا المشروع" : "No emails for this project"}
            </div>
          )}

          <div className="space-y-3">
            {emails.map((email) => {
              const isExp = expandedId === email.id;
              const pri = PRIORITY_META[email.priority];
              const stat = STATUS_META[email.status];
              const project = PROJECTS.find((p) => p.id === email.projectId);
              return (
                <div
                  key={email.id}
                  className={`rounded-2xl border transition-all duration-200 ${cardBg} ${
                    isExp
                      ? "border-[#EA4335]/30 shadow-lg"
                      : "hover:border-[#EA4335]/20"
                  }`}
                >
                  <button
                    className="flex w-full items-start gap-4 p-5 text-start"
                    onClick={() => setExpandedId(isExp ? null : email.id)}
                  >
                    {/* Sender avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EA4335]/15 text-[0.9rem] font-bold text-[#EA4335]">
                      {email.sender[0]}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${pri.cls}`}>
                          {isAr ? pri.labelAr : pri.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${stat.cls}`}>
                          {isAr ? stat.labelAr : stat.label}
                        </span>
                        {project && (
                          <span className={`text-[0.65rem] ${labelCls}`}>
                            · {isAr ? project.nameAr : project.name}
                          </span>
                        )}
                      </div>
                      <div className={`font-semibold text-[0.9rem] leading-snug ${textCls}`}>
                        {isAr && email.subjectAr ? email.subjectAr : email.subject}
                      </div>
                      <div className={`mt-0.5 text-[0.78rem] ${subCls}`}>
                        {email.sender}
                      </div>
                    </div>

                    <div className={`shrink-0 text-end text-[0.72rem] ${labelCls}`}>
                      {formatTime(email.time, isAr)}
                    </div>
                  </button>

                  {isExp && (
                    <div className={`border-t px-5 pb-5 pt-4 space-y-3 ${darkMode ? "border-white/8" : "border-gray-200"}`}>
                      {/* AI summary */}
                      <div className={`rounded-xl p-3.5 text-[0.82rem] leading-relaxed ${darkMode ? "bg-white/4" : "bg-gray-100"}`}>
                        <div className="mb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-[#c9a227]">
                          {isAr ? "ملخص الذكاء الاصطناعي" : "AI Summary"}
                        </div>
                        <div className={subCls}>
                          {isAr ? email.aiSummaryAr : email.aiSummary}
                        </div>
                      </div>

                      {/* Attachments */}
                      {email.attachments.length > 0 && (
                        <div>
                          <div className={`mb-1.5 text-[0.7rem] font-semibold uppercase tracking-widest ${labelCls}`}>
                            {isAr ? "المرفقات" : "Attachments"}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {email.attachments.map((att) => (
                              <span
                                key={att}
                                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.75rem] ${
                                  darkMode ? "border-white/10 text-white/50" : "border-gray-200 text-gray-500"
                                }`}
                              >
                                📎 {att}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Import info */}
                      <div className={`text-[0.72rem] ${labelCls}`}>
                        {isAr ? "وقت الاستيراد: " : "Imported at: "}
                        {formatTime(email.importedAt, isAr)}
                        {" · "}
                        {isAr ? "المصدر: Gmail" : "Source: Gmail"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Future connectors placeholder ── */}
        <div className={`rounded-2xl border-2 border-dashed p-6 ${darkMode ? "border-white/8" : "border-gray-200"}`}>
          <div className={`mb-3 text-[0.72rem] font-semibold uppercase tracking-widest ${labelCls}`}>
            {isAr ? "قنوات قادمة" : "Coming next"}
          </div>
          <div className="flex flex-wrap gap-2">
            {["WhatsApp", "Outlook", isAr ? "منصة بلدي" : "Balady Portal", "Primavera P6"].map((ch) => (
              <span
                key={ch}
                className={`rounded-full border px-3 py-1 text-[0.78rem] ${
                  darkMode ? "border-white/8 text-white/20" : "border-gray-200 text-gray-300"
                }`}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  darkMode,
  accent = false,
}: {
  label: string;
  value: string;
  darkMode: boolean;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-3 text-center">
      <div
        className={`font-display text-[1.4rem] font-bold ${
          accent ? "text-amber-400" : darkMode ? "text-white" : "text-gray-900"
        }`}
      >
        {value}
      </div>
      <div className={`mt-0.5 text-[0.7rem] ${darkMode ? "text-white/30" : "text-gray-400"}`}>
        {label}
      </div>
    </div>
  );
}
