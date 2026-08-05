import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConstructionEvent, EventCategory } from "../types";
import {
  CATEGORY_META,
  CHANNEL_META,
  PRIORITY_META,
  RELATION_META,
  RISK_META,
  RISK_TYPE_META,
  SCHEDULE_IMPACT_META,
  formatDate,
  formatTime,
  isOverdue,
  normalizeForSearch,
  toneClasses,
} from "./eventMeta";

interface Props {
  events: ConstructionEvent[];
  darkMode: boolean;
  /** Shown when the project record is empty but messages were processed. */
  syncing?: boolean;
}

export function Timeline({ events, darkMode, syncing }: Props) {
  const { i18n } = useTranslation();
  const isAr = (i18n.resolvedLanguage ?? i18n.language).split("-")[0] === "ar";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EventCategory | "all">("all");

  // Categories actually present in this project's record
  const presentCategories = useMemo(() => {
    const counts = new Map<EventCategory, number>();
    for (const e of events) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    return events.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      const haystack = normalizeForSearch(
        [
          e.title,
          e.titleAr,
          e.summary,
          e.summaryAr,
          e.actionRequired,
          e.actionRequiredAr,
          e.projectLabel,
          e.stakeholders.join(" "),
          e.attachmentsReferenced.join(" "),
          e.evidence.sender,
          e.evidence.senderHandle,
          e.evidence.originalSubject,
          e.evidence.attachments.join(" "),
          CATEGORY_META[e.category].label,
          CATEGORY_META[e.category].labelAr,
        ].join(" ")
      );
      return haystack.includes(q);
    });
  }, [events, query, category]);

  const cardBg = darkMode ? "bg-[#111c2d] border-white/8" : "bg-white border-gray-200";
  const textCls = darkMode ? "text-white/90" : "text-gray-900";
  const subCls = darkMode ? "text-white/50" : "text-gray-500";
  const labelCls = darkMode ? "text-white/30" : "text-gray-400";
  const inputCls = darkMode
    ? "bg-[#111c2d] border-white/8 text-white/90 placeholder:text-white/25"
    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400";

  const isFiltering = query.trim().length > 0 || category !== "all";

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className={`mb-1 text-[0.85rem] font-semibold uppercase tracking-widest ${labelCls}`}>
        {isAr ? "سجل المشروع" : "Project Record"}
      </div>
      <div className={`mb-5 text-[0.85rem] ${subCls}`}>
        {isAr
          ? "أحداث إنشائية مستخلصة من كل قنوات التواصل"
          : "Construction events extracted from every communication channel"}
      </div>

      {/* ─── Search ──────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="relative">
          <span aria-hidden="true" className={`pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[0.95rem] ${labelCls}`}>
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={isAr ? "البحث في سجل المشروع" : "Search the project record"}
            placeholder={
              isAr
                ? "ابحث في الأحداث، الملخصات، الجهات، المرفقات…"
                : "Search events, summaries, stakeholders, attachments…"
            }
            className={`w-full rounded-2xl border py-3 ps-12 pe-12 text-[0.9rem] outline-none transition-all focus:border-[#c9a227]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227] ${inputCls}`}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={isAr ? "مسح البحث" : "Clear search"}
              className={`absolute end-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[0.9rem] transition-colors ${
                darkMode ? "text-white/40 hover:bg-white/8 hover:text-white/80" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Category filter ─────────────────────────────────────────────── */}
      {presentCategories.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className={`rounded-full border px-3 py-1.5 text-[0.75rem] font-semibold transition-all ${
              category === "all"
                ? "border-[#c9a227]/50 bg-[#c9a227]/15 text-[#c9a227]"
                : toneClasses("neutral", darkMode)
            }`}
          >
            {isAr ? "الكل" : "All"} · {events.length}
          </button>
          {presentCategories.map(([cat, count]) => {
            const meta = CATEGORY_META[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(active ? "all" : cat)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-[0.75rem] font-semibold transition-all ${
                  active ? "border-[#c9a227]/50 bg-[#c9a227]/15 text-[#c9a227]" : toneClasses(meta.tone, darkMode)
                }`}
              >
                <span aria-hidden="true">{meta.icon} </span>
                {isAr ? meta.labelAr : meta.label} · {count}
              </button>
            );
          })}
        </div>
      )}

      {isFiltering && (
        <div className={`mb-4 px-1 text-[0.78rem] ${subCls}`}>
          {isAr
            ? `${filtered.length} من ${events.length} حدث`
            : `${filtered.length} of ${events.length} events`}
        </div>
      )}

      {/* ─── Record ──────────────────────────────────────────────────────── */}
      {events.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 text-center ${labelCls}`}>
          <div aria-hidden="true" className="mb-4 text-4xl opacity-50">{syncing ? "🧠" : "🏗️"}</div>
          <p className="max-w-sm">
            {syncing
              ? isAr
                ? "يجري تحليل الرسائل واستخلاص الأحداث الإنشائية…"
                : "Analysing communications and extracting construction events…"
              : isAr
              ? "لا توجد أحداث إنشائية في سجل هذا المشروع بعد."
              : "No construction events in this project's record yet."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 text-center ${labelCls}`}>
          <div aria-hidden="true" className="mb-4 text-4xl opacity-50">🔍</div>
          <p>{isAr ? "لا توجد أحداث مطابقة." : "No events match your filters."}</p>
          <button
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="mt-4 rounded-xl border border-[#c9a227]/40 px-4 py-2 text-[0.8rem] font-semibold text-[#c9a227] transition-colors hover:bg-[#c9a227]/10"
          >
            {isAr ? "إزالة عوامل التصفية" : "Clear filters"}
          </button>
        </div>
      ) : (
        <div className="relative space-y-4">
          <div className={`absolute bottom-0 start-[2.2rem] top-4 w-px ${darkMode ? "bg-white/10" : "bg-gray-200"}`} />

          {filtered.map((event) => {
            const isExp = expandedId === event.id;
            const showEvidence = evidenceId === event.id;
            const cat = CATEGORY_META[event.category];
            const pri = PRIORITY_META[event.priority];
            const channel = CHANNEL_META[event.evidence.channel];
            const overdue = isOverdue(event.deadline);

            return (
              <div key={event.id} className="relative z-10 ps-[4.5rem]">
                <div
                  className={`absolute start-[1.75rem] top-6 h-4 w-4 -translate-y-1/2 rounded-full border-4 ${
                    darkMode ? "border-[#0a1628]" : "border-gray-100"
                  } ${event.isSafetyAlert ? "bg-red-500" : darkMode ? "bg-white/20" : "bg-gray-300"}`}
                />

                <div
                  className={`rounded-2xl border transition-all duration-200 ${cardBg} ${
                    event.isSafetyAlert
                      ? "border-red-500/40"
                      : isExp
                      ? "border-[#c9a227]/40 shadow-lg"
                      : "hover:border-[#c9a227]/20"
                  }`}
                >
                  <button
                    className="flex w-full items-start gap-4 p-5 text-start"
                    onClick={() => setExpandedId(isExp ? null : event.id)}
                  >
                    <div aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-[1.3rem] ${toneClasses(cat.tone, darkMode)}`}>
                      {cat.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className={`mb-1.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] ${labelCls}`}>
                        {isAr ? "حدث إنشائي" : "Construction Event"}
                      </div>

                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {event.isSafetyAlert && (
                          <span className="rounded-full border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[0.68rem] font-bold text-red-400">
                            ⚠️ {isAr ? "تنبيه سلامة" : "Safety Alert"}
                          </span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${toneClasses(cat.tone, darkMode)}`}>
                          {isAr ? cat.labelAr : cat.label}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${toneClasses(pri.tone, darkMode)}`}>
                          {isAr ? pri.labelAr : pri.label}
                        </span>
                        {overdue && (
                          <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${toneClasses("danger", darkMode)}`}>
                            ⏳ {isAr ? "تجاوز الموعد" : "Overdue"}
                          </span>
                        )}
                        <span className={`text-[0.7rem] ${labelCls}`}>• {formatTime(event.occurredAt, isAr)}</span>
                      </div>

                      {/* ─── Layer 2 flags ─────────────────────────────── */}
                      {event.reasoning && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {event.reasoning.relation !== "new" && (
                            <span className={`rounded-full border px-2 py-0.5 text-[0.66rem] font-semibold ${toneClasses(RELATION_META[event.reasoning.relation].tone, darkMode)}`}>
                              {RELATION_META[event.reasoning.relation].icon}{" "}
                              {isAr ? RELATION_META[event.reasoning.relation].labelAr : RELATION_META[event.reasoning.relation].label}
                            </span>
                          )}
                          {event.reasoning.contradictsPrevious && (
                            <span className={`rounded-full border px-2 py-0.5 text-[0.66rem] font-bold ${toneClasses("danger", darkMode)}`}>
                              ⚡ {isAr ? "يتعارض مع تقرير سابق" : "Contradicts earlier report"}
                            </span>
                          )}
                          {event.reasoning.scheduleImpact !== "none" && (
                            <span className={`rounded-full border px-2 py-0.5 text-[0.66rem] font-semibold ${toneClasses(SCHEDULE_IMPACT_META[event.reasoning.scheduleImpact].tone, darkMode)}`}>
                              ⏱ {isAr ? SCHEDULE_IMPACT_META[event.reasoning.scheduleImpact].labelAr : SCHEDULE_IMPACT_META[event.reasoning.scheduleImpact].label}
                              {event.reasoning.scheduleImpactDays ? ` ~${event.reasoning.scheduleImpactDays}${isAr ? " يوم" : "d"}` : ""}
                            </span>
                          )}
                          {event.reasoning.createsRisk && (
                            <span className={`rounded-full border px-2 py-0.5 text-[0.66rem] font-semibold ${toneClasses(event.reasoning.riskSeverity === "critical" || event.reasoning.riskSeverity === "high" ? "danger" : "warn", darkMode)}`}>
                              🛡️ {isAr ? RISK_TYPE_META[event.reasoning.riskType].labelAr : RISK_TYPE_META[event.reasoning.riskType].label}
                            </span>
                          )}
                          {event.reasoning.notifyProjectManager && (
                            <span className="rounded-full border border-[#c9a227]/40 bg-[#c9a227]/10 px-2 py-0.5 text-[0.66rem] font-bold text-[#c9a227]">
                              📣 {isAr ? "يستدعي إبلاغ مدير المشروع" : "Notify PM"}
                            </span>
                          )}
                        </div>
                      )}

                      <div className={`font-display text-[1.05rem] font-bold leading-snug ${textCls}`}>
                        {isAr ? event.titleAr : event.title}
                      </div>

                      <div className={`mt-1 text-[0.78rem] ${subCls}`}>
                        <span className={labelCls}>{isAr ? "المشروع: " : "Project: "}</span>
                        {event.projectLabel || (isAr ? "غير محدد" : "Unassigned")}
                      </div>

                      {(isAr ? event.summaryAr : event.summary) && (
                        <div className={`mt-2 ${isExp ? "" : "line-clamp-2"} text-[0.85rem] leading-relaxed ${subCls}`}>
                          {isAr ? event.summaryAr : event.summary}
                        </div>
                      )}

                      <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] ${labelCls}`}>
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span className="text-emerald-500">✅</span>
                          {isAr ? channel.labelAr : channel.label}
                        </span>
                        {event.stakeholders.length > 0 && (
                          <span>· {event.stakeholders.slice(0, 2).join(", ")}</span>
                        )}
                        <span className="ms-auto font-semibold text-[#c9a227]">
                          {isExp ? (isAr ? "إخفاء ▲" : "Less ▲") : (isAr ? "التفاصيل ▼" : "Details ▼")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExp && (
                    <div className={`border-t px-5 pb-5 pt-4 space-y-4 ${darkMode ? "border-white/8" : "border-gray-100"}`}>
                      {/* Action required */}
                      {(isAr ? event.actionRequiredAr : event.actionRequired) && (
                        <div className={`rounded-xl border-s-4 border-[#c9a227] p-4 ${darkMode ? "bg-[#c9a227]/8" : "bg-amber-50"}`}>
                          <div className="mb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-[#c9a227]">
                            {isAr ? "الإجراء المطلوب" : "Action Required"}
                          </div>
                          <div className={`text-[0.88rem] leading-relaxed ${textCls}`}>
                            {isAr ? event.actionRequiredAr : event.actionRequired}
                          </div>
                        </div>
                      )}

                      {/* ─── Layer 2 · reasoning ───────────────────────── */}
                      {event.reasoning && (
                        <div className={`rounded-xl border p-4 ${darkMode ? "border-white/8 bg-white/2" : "border-gray-200 bg-gray-50"}`}>
                          <div className="mb-2 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-widest text-[#c9a227]">
                            🧠 {isAr ? "استدلال الذكاء الاصطناعي" : "AI Reasoning"}
                            <span className={`ms-auto font-normal ${labelCls}`}>
                              {isAr ? "الثقة" : "confidence"} {Math.round(event.reasoning.confidence * 100)}%
                            </span>
                          </div>

                          <div className={`text-[0.86rem] leading-relaxed ${textCls}`}>
                            {isAr ? event.reasoning.rationaleAr || event.reasoning.rationale : event.reasoning.rationale}
                          </div>

                          {event.reasoning.contradictsPrevious &&
                            (isAr ? event.reasoning.contradictionExplanationAr : event.reasoning.contradictionExplanation) && (
                              <div className={`mt-3 rounded-lg border p-3 text-[0.82rem] ${toneClasses("danger", darkMode)}`}>
                                <span className="font-semibold">⚡ {isAr ? "تعارض: " : "Contradiction: "}</span>
                                {isAr ? event.reasoning.contradictionExplanationAr : event.reasoning.contradictionExplanation}
                              </div>
                            )}

                          {event.reasoning.createsRisk &&
                            (isAr ? event.reasoning.riskExplanationAr : event.reasoning.riskExplanation) && (
                              <div className={`mt-3 rounded-lg border p-3 text-[0.82rem] ${toneClasses(event.reasoning.riskSeverity === "critical" || event.reasoning.riskSeverity === "high" ? "danger" : "warn", darkMode)}`}>
                                <span className="font-semibold">
                                  🛡️ {isAr ? RISK_TYPE_META[event.reasoning.riskType].labelAr : RISK_TYPE_META[event.reasoning.riskType].label}:{" "}
                                </span>
                                {isAr ? event.reasoning.riskExplanationAr : event.reasoning.riskExplanation}
                              </div>
                            )}

                          {event.reasoning.dependsOnEventIds.length > 0 &&
                            (isAr ? event.reasoning.dependencyExplanationAr : event.reasoning.dependencyExplanation) && (
                              <div className={`mt-3 rounded-lg p-3 text-[0.82rem] ${darkMode ? "bg-white/4 text-white/70" : "bg-white text-gray-700"}`}>
                                <span className="font-semibold">🔗 {isAr ? "ارتباط: " : "Depends on: "}</span>
                                {isAr ? event.reasoning.dependencyExplanationAr : event.reasoning.dependencyExplanation}
                              </div>
                            )}

                          {event.reasoning.notifyProjectManager &&
                            (isAr ? event.reasoning.notifyReasonAr : event.reasoning.notifyReason) && (
                              <div className={`mt-3 rounded-lg p-3 text-[0.82rem] ${darkMode ? "bg-[#c9a227]/10 text-[#c9a227]" : "bg-amber-50 text-amber-800"}`}>
                                <span className="font-semibold">📣 {isAr ? "سبب الإبلاغ: " : "Why notify: "}</span>
                                {isAr ? event.reasoning.notifyReasonAr : event.reasoning.notifyReason}
                              </div>
                            )}
                        </div>
                      )}

                      {/* Intelligence facts */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Fact label={isAr ? "التصنيف" : "Event type"} value={`${cat.icon} ${isAr ? cat.labelAr : cat.label}`} darkMode={darkMode} />
                        <Fact
                          label={isAr ? "مستوى الخطورة" : "Risk level"}
                          value={isAr ? RISK_META[event.riskLevel].labelAr : RISK_META[event.riskLevel].label}
                          darkMode={darkMode}
                        />
                        <Fact
                          label={isAr ? "الموعد النهائي" : "Deadline"}
                          value={event.deadline ? formatDate(event.deadline, isAr) : isAr ? "غير محدد" : "None stated"}
                          darkMode={darkMode}
                          alert={overdue}
                        />
                        <Fact
                          label={isAr ? "ثقة التحليل" : "AI confidence"}
                          value={`${Math.round(event.confidence * 100)}%`}
                          darkMode={darkMode}
                        />
                      </div>

                      {event.stakeholders.length > 0 && (
                        <div>
                          <div className={`mb-2 text-[0.7rem] font-semibold uppercase tracking-widest ${labelCls}`}>
                            {isAr ? "الأطراف المعنية" : "Stakeholders"}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {event.stakeholders.map((s, i) => (
                              <span key={i} className={`rounded-lg border px-3 py-1.5 text-[0.8rem] ${toneClasses("neutral", darkMode)}`}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {event.attachmentsReferenced.length > 0 && (
                        <div>
                          <div className={`mb-2 text-[0.7rem] font-semibold uppercase tracking-widest ${labelCls}`}>
                            {isAr ? "المستندات المشار إليها" : "Documents referenced"}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {event.attachmentsReferenced.map((a, i) => (
                              <span key={i} className={`rounded-lg border px-3 py-1.5 text-[0.8rem] ${toneClasses("neutral", darkMode)}`}>
                                📎 {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ─── Evidence ──────────────────────────────────── */}
                      <div className={`rounded-xl border ${darkMode ? "border-white/8" : "border-gray-200"}`}>
                        <button
                          onClick={() => setEvidenceId(showEvidence ? null : event.id)}
                          className={`flex w-full items-center gap-2 p-4 text-start text-[0.7rem] font-semibold uppercase tracking-widest transition-colors ${
                            darkMode ? "text-white/50 hover:text-white/80" : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          <span className="text-emerald-500">✅</span>
                          {isAr ? "الدليل الداعم" : "Evidence"}
                          <span className={`ms-auto text-[0.7rem] ${labelCls}`}>
                            {showEvidence ? "▲" : "▼"}
                          </span>
                        </button>

                        {showEvidence && (
                          <div className={`border-t px-4 pb-4 pt-3 space-y-3 ${darkMode ? "border-white/8" : "border-gray-100"}`}>
                            <EvidenceRow label={isAr ? "المصدر" : "Source"} darkMode={darkMode}>
                              {isAr ? channel.labelAr : channel.label}
                            </EvidenceRow>
                            <EvidenceRow label={isAr ? "المرسل" : "Sender"} darkMode={darkMode}>
                              {event.evidence.sender}
                              <span className="opacity-60"> · {event.evidence.senderHandle}</span>
                            </EvidenceRow>
                            <EvidenceRow label={isAr ? "الموضوع الأصلي" : "Original subject"} darkMode={darkMode}>
                              {event.evidence.originalSubject}
                            </EvidenceRow>
                            <EvidenceRow label={isAr ? "وقت الاستلام" : "Received"} darkMode={darkMode}>
                              {formatTime(event.evidence.receivedAt, isAr)}
                            </EvidenceRow>

                            <div>
                              <div className={`mb-1.5 text-[0.7rem] ${labelCls}`}>
                                {isAr ? "الرسالة الأصلية" : "Original message"}
                              </div>
                              <div className={`max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg p-3 text-[0.8rem] leading-relaxed ${darkMode ? "bg-white/4 text-white/70" : "bg-gray-50 text-gray-700"}`}>
                                {event.evidence.originalBody || (isAr ? "لا يوجد نص." : "No message text.")}
                              </div>
                            </div>

                            {event.evidence.attachments.length > 0 && (
                              <div>
                                <div className={`mb-1.5 text-[0.7rem] ${labelCls}`}>
                                  {isAr ? "المرفقات" : "Attachments"}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {event.evidence.attachments.map((a, i) => (
                                    <span key={i} className={`rounded-lg border px-3 py-1.5 text-[0.8rem] ${toneClasses("neutral", darkMode)}`}>
                                      📎 {a}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Fact({
  label,
  value,
  darkMode,
  alert,
}: {
  label: string;
  value: string;
  darkMode: boolean;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${darkMode ? "bg-white/4" : "bg-gray-50"}`}>
      <div className={`text-[0.65rem] uppercase tracking-widest ${darkMode ? "text-white/30" : "text-gray-400"}`}>
        {label}
      </div>
      <div className={`mt-1 text-[0.82rem] font-semibold ${alert ? "text-red-400" : darkMode ? "text-white/85" : "text-gray-800"}`}>
        {value}
      </div>
    </div>
  );
}

function EvidenceRow({
  label,
  children,
  darkMode,
}: {
  label: string;
  children: React.ReactNode;
  darkMode: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-[0.82rem]">
      <span className={`w-36 shrink-0 text-[0.7rem] ${darkMode ? "text-white/30" : "text-gray-400"}`}>{label}</span>
      <span className={`min-w-0 break-words ${darkMode ? "text-white/80" : "text-gray-700"}`}>{children}</span>
    </div>
  );
}
