import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  ConstructionEvent,
  Project,
  IngestionStats,
  EventCategory,
  ProjectIntelligence,
} from "../types";
import {
  APPROVAL_CATEGORIES,
  CATEGORY_META,
  OUTLOOK_META,
  RISK_META,
  formatTime,
  isOverdue,
  isToday,
  toneClasses,
  type Tone,
} from "./eventMeta";

interface Props {
  events: ConstructionEvent[];
  reviewQueue: ConstructionEvent[];
  stats: IngestionStats;
  project: Project;
  /** Owner briefing produced by Layer 2 for the active project. */
  intelligence: ProjectIntelligence | null;
  reasoningEnabled: boolean;
  syncing: boolean;
  darkMode: boolean;
  onOpenTimeline: () => void;
  onOpenSources: () => void;
  onReanalyse: () => void;
}

export function Dashboard({
  events,
  reviewQueue,
  stats,
  project,
  intelligence,
  reasoningEnabled,
  syncing,
  darkMode,
  onOpenTimeline,
  onOpenSources,
  onReanalyse,
}: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const intel = useMemo(() => {
    const byRecency = [...events].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
    const todays = events.filter((e) => isToday(e.occurredAt));

    const categoryCounts = new Map<EventCategory, number>();
    for (const e of events) categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);

    return {
      recent: byRecency.slice(0, 5),
      safety: byRecency.filter((e) => e.isSafetyAlert),
      approvals: events.filter((e) => APPROVAL_CATEGORIES.includes(e.category)).length,
      rfis: events.filter((e) => e.category === "rfi").length,
      // Layer 2 sharpens this: a reasoned risk counts even if extraction didn't flag one.
      risks: events.filter(
        (e) =>
          e.reasoning?.createsRisk ||
          e.riskLevel === "critical" ||
          e.riskLevel === "high"
      ).length,
      pendingActions: events.filter((e) => e.actionRequired.trim().length > 0).length,
      delayed: events.filter(
        (e) =>
          e.category === "delay" ||
          isOverdue(e.deadline) ||
          e.reasoning?.scheduleImpact === "confirmed" ||
          e.reasoning?.scheduleImpact === "likely"
      ).length,
      contradictions: byRecency.filter((e) => e.reasoning?.contradictsPrevious),
      notifyPm: byRecency.filter((e) => e.reasoning?.notifyProjectManager),
      todayCount: todays.length,
      categories: [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [events]);

  const cardBg = darkMode ? "bg-[#111c2d] border-white/8" : "bg-white border-gray-200";
  const textCls = darkMode ? "text-white/90" : "text-gray-900";
  const subCls = darkMode ? "text-white/50" : "text-gray-500";
  const labelCls = darkMode ? "text-white/30" : "text-gray-400";

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const outlook = intelligence ? OUTLOOK_META[intelligence.scheduleOutlook] : null;

  const metrics: { id: string; icon: string; value: number; label: string; tone: Tone; onClick?: () => void }[] = [
    { id: "comms", icon: "📡", value: stats.receivedToday, label: isAr ? "اتصالات اليوم" : "Today's Communications", tone: "neutral", onClick: onOpenSources },
    { id: "events", icon: "🏗️", value: events.length, label: isAr ? "الأحداث الإنشائية" : "Construction Events", tone: "info", onClick: onOpenTimeline },
    { id: "safety", icon: "⚠️", value: intel.safety.length, label: isAr ? "تنبيهات السلامة" : "Safety Alerts", tone: intel.safety.length > 0 ? "danger" : "neutral", onClick: onOpenTimeline },
    { id: "approvals", icon: "📋", value: intel.approvals, label: isAr ? "الاعتمادات" : "Approvals", tone: "good", onClick: onOpenTimeline },
    { id: "rfis", icon: "❓", value: intel.rfis, label: isAr ? "طلبات المعلومات" : "RFIs", tone: "warn", onClick: onOpenTimeline },
    { id: "risks", icon: "🛡️", value: intel.risks, label: isAr ? "المخاطر المحتملة" : "Potential Risks", tone: intel.risks > 0 ? "danger" : "neutral", onClick: onOpenTimeline },
    { id: "actions", icon: "✅", value: intel.pendingActions, label: isAr ? "إجراءات معلّقة" : "Pending Actions", tone: "warn", onClick: onOpenTimeline },
    { id: "delayed", icon: "⏳", value: intel.delayed, label: isAr ? "بنود متأخرة" : "Delayed Items", tone: intel.delayed > 0 ? "danger" : "neutral", onClick: onOpenTimeline },
  ];

  return (
    <div className="h-full overflow-y-auto px-8 py-8 space-y-6">
      <div>
        <div className={`text-[0.85rem] font-semibold uppercase tracking-widest ${labelCls}`}>
          {isAr ? "ذكاء المشروع" : "Project Intelligence"}
        </div>
        <div className={`mt-1 text-[0.9rem] ${subCls}`}>
          {isAr ? project.nameAr : project.name} · {isAr ? project.phaseAr : project.phase}
        </div>
      </div>

      {/* ─── AI Insights · produced by the reasoning layer ───────────────── */}
      <div className={`rounded-2xl border p-6 ${darkMode ? "border-[#c9a227]/25 bg-[#c9a227]/6" : "border-amber-200 bg-amber-50"}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[1rem]">🧠</span>
          <span className="text-[0.72rem] font-bold uppercase tracking-widest text-[#c9a227]">
            {isAr ? "رؤى الذكاء الاصطناعي" : "AI Insights"}
          </span>
          <span className={`text-[0.66rem] uppercase tracking-widest ${labelCls}`}>
            {isAr ? "· طبقة الاستدلال" : "· Reasoning layer"}
          </span>

          {outlook && (
            <span className={`rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${toneClasses(outlook.tone, darkMode)}`}>
              {outlook.icon} {isAr ? outlook.labelAr : outlook.label}
            </span>
          )}

          {events.length > 0 && (
            <button
              onClick={onReanalyse}
              disabled={syncing}
              className={`ms-auto text-[0.72rem] font-semibold text-[#c9a227] transition-opacity hover:opacity-80 ${syncing ? "cursor-not-allowed opacity-40" : ""}`}
            >
              {syncing ? (isAr ? "جارٍ الاستدلال…" : "Reasoning…") : isAr ? "إعادة الاستدلال ↻" : "Re-reason ↻"}
            </button>
          )}
        </div>

        {!reasoningEnabled ? (
          <p className={`text-[0.95rem] ${subCls}`}>
            {isAr ? "طبقة الاستدلال معطّلة في الإعدادات." : "The reasoning layer is disabled in configuration."}
          </p>
        ) : !intelligence ? (
          <p className={`text-[0.95rem] leading-relaxed ${textCls}`}>
            {syncing
              ? isAr
                ? "يجري تحليل السجل واستنتاج حالة المشروع…"
                : "Reasoning over the record to establish project state…"
              : events.length === 0
              ? isAr
                ? "لا توجد أحداث بعد. شغّل المزامنة ليبدأ تحليل المشروع."
                : "No events yet. Run a sync to begin analysing this project."
              : isAr
              ? "لم يُنتج الاستدلال ملخصاً لهذا المشروع بعد."
              : "The reasoning layer has not produced a briefing for this project yet."}
          </p>
        ) : (
          <>
            <p className={`font-display text-[1.15rem] font-bold leading-snug ${textCls}`}>
              {isAr ? intelligence.headlineAr || intelligence.headline : intelligence.headline}
            </p>
            <p className={`mt-2 text-[0.95rem] leading-relaxed ${subCls}`}>
              {isAr ? intelligence.narrativeAr || intelligence.narrative : intelligence.narrative}
            </p>

            {(isAr ? intelligence.scheduleNoteAr : intelligence.scheduleNote) && (
              <p className={`mt-2 text-[0.85rem] ${labelCls}`}>
                ⏱ {isAr ? intelligence.scheduleNoteAr : intelligence.scheduleNote}
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {intelligence.topRisks.length > 0 && (
                <div>
                  <div className={`mb-2 text-[0.68rem] font-semibold uppercase tracking-widest ${labelCls}`}>
                    {isAr ? "أبرز المخاطر" : "Top risks"}
                  </div>
                  <div className="space-y-2">
                    {intelligence.topRisks.map((r, i) => (
                      <button
                        key={i}
                        onClick={onOpenTimeline}
                        className={`flex w-full items-start gap-2 rounded-xl border p-3 text-start text-[0.84rem] ${toneClasses(
                          r.severity === "critical" || r.severity === "high" ? "danger" : "warn",
                          darkMode
                        )}`}
                      >
                        <span className="mt-0.5">🛡️</span>
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">{isAr ? r.titleAr || r.title : r.title}</span>
                          <span className="block text-[0.72rem] opacity-75">
                            {isAr ? RISK_META[r.severity].labelAr : RISK_META[r.severity].label}
                            {r.eventIds.length > 0 && ` · ${r.eventIds.length} ${isAr ? "حدث" : r.eventIds.length === 1 ? "event" : "events"}`}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {intelligence.recommendedActions.length > 0 && (
                <div>
                  <div className={`mb-2 text-[0.68rem] font-semibold uppercase tracking-widest ${labelCls}`}>
                    {isAr ? "الإجراءات الموصى بها" : "Recommended actions"}
                  </div>
                  <div className="space-y-2">
                    {intelligence.recommendedActions.map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-xl p-3 text-[0.84rem] ${darkMode ? "bg-white/5 text-white/80" : "bg-white text-gray-700"}`}
                      >
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${a.priority === "high" ? "bg-red-500" : a.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                        <span>{isAr ? a.actionAr || a.action : a.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {(reviewQueue.length > 0 || stats.filtered > 0) && (
          <div className={`mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-[0.78rem] ${darkMode ? "border-white/8" : "border-amber-200"} ${subCls}`}>
            {reviewQueue.length > 0 && (
              <button onClick={onOpenSources} className="font-semibold text-[#c9a227] hover:opacity-80">
                {isAr
                  ? `${reviewQueue.length} بند بحاجة لمراجعة بشرية ←`
                  : `${reviewQueue.length} ${reviewQueue.length === 1 ? "item needs" : "items need"} human review →`}
              </button>
            )}
            {stats.filtered > 0 && (
              <span>
                {isAr
                  ? `${stats.filtered} رسالة غير متعلقة بالمشروع تم استبعادها`
                  : `${stats.filtered} non-construction ${stats.filtered === 1 ? "message" : "messages"} filtered out`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── Contradictions — the reasoning layer's sharpest signal ──────── */}
      {intel.contradictions.length > 0 && (
        <div className={`rounded-2xl border p-5 ${darkMode ? "border-red-500/30 bg-red-500/5" : "border-red-200 bg-red-50"}`}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[1rem]">⚡</span>
            <span className="text-[0.8rem] font-semibold uppercase tracking-widest text-red-400">
              {isAr ? "تعارضات في الروايات" : "Contradictions detected"}
            </span>
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[0.68rem] font-bold text-white">
              {intel.contradictions.length}
            </span>
          </div>
          <div className="space-y-2">
            {intel.contradictions.slice(0, 3).map((e) => (
              <button
                key={e.id}
                onClick={onOpenTimeline}
                className={`w-full rounded-xl p-3 text-start ${darkMode ? "bg-red-500/10 hover:bg-red-500/15" : "bg-white hover:bg-red-100/60"}`}
              >
                <div className={`text-[0.88rem] font-semibold ${darkMode ? "text-red-300" : "text-red-700"}`}>
                  {isAr ? e.titleAr : e.title}
                </div>
                <div className={`mt-1 text-[0.8rem] ${subCls}`}>
                  {isAr
                    ? e.reasoning?.contradictionExplanationAr || e.reasoning?.contradictionExplanation
                    : e.reasoning?.contradictionExplanation}
                </div>
                {(e.reasoning?.contradictedEventIds.length ?? 0) > 0 && (
                  <div className={`mt-1.5 text-[0.72rem] ${labelCls}`}>
                    {isAr ? "يتعارض مع: " : "Conflicts with: "}
                    {e.reasoning!.contradictedEventIds
                      .map((id) => eventById.get(id))
                      .filter(Boolean)
                      .map((c) => (isAr ? c!.titleAr : c!.title))
                      .join(" · ")}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Metrics ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <button
            key={m.id}
            onClick={m.onClick}
            className={`rounded-2xl border p-5 text-start transition-all hover:border-[#c9a227]/30 ${cardBg}`}
          >
            <div className="flex items-start justify-between">
              <div className={`font-display text-[1.9rem] font-bold leading-none ${m.value > 0 && (m.tone === "danger" || m.tone === "warn") ? (m.tone === "danger" ? "text-red-400" : "text-amber-400") : textCls}`}>
                {m.value}
              </div>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[0.9rem] ${toneClasses(m.tone, darkMode)}`}>
                {m.icon}
              </span>
            </div>
            <div className={`mt-2 text-[0.78rem] ${labelCls}`}>{m.label}</div>
          </button>
        ))}
      </div>

      {/* ─── Needs the PM's attention ────────────────────────────────────── */}
      {intel.notifyPm.length > 0 && (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[1rem]">📣</span>
            <span className={`text-[0.8rem] font-semibold uppercase tracking-widest ${labelCls}`}>
              {isAr ? "يستدعي إبلاغ مدير المشروع" : "Needs the project manager now"}
            </span>
            <span className="rounded-full bg-[#c9a227] px-2 py-0.5 text-[0.68rem] font-bold text-[#0a1628]">
              {intel.notifyPm.length}
            </span>
          </div>
          <div className="space-y-2">
            {intel.notifyPm.slice(0, 4).map((e) => (
              <button
                key={e.id}
                onClick={onOpenTimeline}
                className={`flex w-full items-start gap-3 rounded-xl p-3 text-start transition-colors ${darkMode ? "hover:bg-white/4" : "hover:bg-gray-50"}`}
              >
                <span className="mt-0.5 text-[0.85rem]">{CATEGORY_META[e.category].icon}</span>
                <div className="min-w-0 flex-1">
                  <div className={`text-[0.88rem] font-semibold ${textCls}`}>{isAr ? e.titleAr : e.title}</div>
                  <div className={`mt-0.5 text-[0.78rem] ${subCls}`}>
                    {isAr ? e.reasoning?.notifyReasonAr || e.reasoning?.notifyReason : e.reasoning?.notifyReason}
                  </div>
                </div>
                <span className={`shrink-0 text-[0.7rem] ${labelCls}`}>{formatTime(e.occurredAt, isAr)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Safety ──────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${intel.safety.length > 0 ? "border-red-500/30 " + (darkMode ? "bg-red-500/5" : "bg-red-50") : cardBg}`}>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[1rem]">⚠️</span>
          <span className={`text-[0.8rem] font-semibold uppercase tracking-widest ${intel.safety.length > 0 ? "text-red-400" : labelCls}`}>
            {isAr ? "تنبيهات السلامة" : "Safety Alerts"}
          </span>
          {intel.safety.length > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[0.68rem] font-bold text-white">{intel.safety.length}</span>
          )}
        </div>

        {intel.safety.length === 0 ? (
          <div className={`text-[0.85rem] ${subCls}`}>
            {isAr ? "لا توجد إشارات سلامة في سجل هذا المشروع." : "No safety signals in this project's record."}
          </div>
        ) : (
          <div className="space-y-2">
            {intel.safety.slice(0, 4).map((e) => (
              <button
                key={e.id}
                onClick={onOpenTimeline}
                className={`flex w-full items-start gap-3 rounded-xl p-3 text-start transition-colors ${darkMode ? "bg-red-500/10 hover:bg-red-500/15" : "bg-white hover:bg-red-100/60"}`}
              >
                <span className="mt-0.5 text-[0.9rem]">⚠️</span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[0.88rem] font-semibold ${darkMode ? "text-red-300" : "text-red-700"}`}>
                    {isAr ? e.titleAr : e.title}
                  </div>
                  <div className={`mt-0.5 line-clamp-2 text-[0.78rem] ${subCls}`}>{isAr ? e.summaryAr : e.summary}</div>
                </div>
                <span className={`shrink-0 text-[0.7rem] ${labelCls}`}>{formatTime(e.occurredAt, isAr)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ─── Recent events ─────────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-5 lg:col-span-2 ${cardBg}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className={`text-[0.8rem] font-semibold uppercase tracking-widest ${labelCls}`}>
              {isAr ? "أحدث الأحداث الإنشائية" : "Recent Construction Events"}
            </span>
            <button onClick={onOpenTimeline} className="text-[0.75rem] font-semibold text-[#c9a227] transition-opacity hover:opacity-80">
              {isAr ? "عرض السجل الكامل ←" : "View full record →"}
            </button>
          </div>

          {intel.recent.length === 0 ? (
            <div className={`py-8 text-center text-[0.85rem] ${labelCls}`}>{isAr ? "لا توجد أحداث بعد." : "No events yet."}</div>
          ) : (
            <div className="space-y-2">
              {intel.recent.map((e) => {
                const meta = CATEGORY_META[e.category];
                return (
                  <button
                    key={e.id}
                    onClick={onOpenTimeline}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-start transition-colors ${darkMode ? "hover:bg-white/4" : "hover:bg-gray-50"}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[0.95rem] ${toneClasses(meta.tone, darkMode)}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[0.88rem] font-semibold ${textCls}`}>{isAr ? e.titleAr : e.title}</div>
                      <div className={`mt-0.5 truncate text-[0.75rem] ${labelCls}`}>
                        {isAr ? meta.labelAr : meta.label} · {formatTime(e.occurredAt, isAr)}
                      </div>
                    </div>
                    {e.reasoning?.contradictsPrevious && <span className="shrink-0 text-[0.85rem]">⚡</span>}
                    {e.isSafetyAlert && <span className="shrink-0 text-[0.85rem]">⚠️</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* ─── Category mix ────────────────────────────────────────────── */}
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <div className={`mb-4 text-[0.8rem] font-semibold uppercase tracking-widest ${labelCls}`}>
              {isAr ? "توزيع الأحداث" : "Event Breakdown"}
            </div>
            {intel.categories.length === 0 ? (
              <div className={`text-[0.85rem] ${labelCls}`}>{isAr ? "لا توجد بيانات." : "No data yet."}</div>
            ) : (
              <div className="space-y-3">
                {intel.categories.map(([cat, count]) => {
                  const meta = CATEGORY_META[cat];
                  const pct = events.length > 0 ? Math.round((count / events.length) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="mb-1.5 flex items-center justify-between text-[0.78rem]">
                        <span className={subCls}>
                          {meta.icon} {isAr ? meta.labelAr : meta.label}
                        </span>
                        <span className={`font-semibold ${textCls}`}>
                          {count} <span className={labelCls}>· {pct}%</span>
                        </span>
                      </div>
                      <div className={`h-2 w-full overflow-hidden rounded-full ${darkMode ? "bg-white/8" : "bg-gray-200"}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            meta.tone === "danger" ? "bg-red-500"
                            : meta.tone === "warn" ? "bg-amber-500"
                            : meta.tone === "good" ? "bg-emerald-500"
                            : meta.tone === "info" ? "bg-sky-500"
                            : "bg-[#c9a227]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Project ─────────────────────────────────────────────────── */}
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <div className={`mb-3 text-[0.8rem] font-semibold uppercase tracking-widest ${labelCls}`}>
              {isAr ? "المشروع" : "Project"}
            </div>
            <div className={`font-display text-[1.05rem] font-bold leading-snug ${textCls}`}>
              {isAr ? project.nameAr : project.name}
            </div>
            <div className={`mt-1 text-[0.8rem] ${subCls}`}>{isAr ? project.phaseAr : project.phase}</div>
            <div className={`mt-1 text-[0.75rem] ${labelCls}`}>📍 {project.location}</div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[0.78rem]">
                <span className={subCls}>{isAr ? "نسبة الإنجاز المُبلّغة" : "Reported progress"}</span>
                <span className="font-semibold text-[#c9a227]">{project.progress}%</span>
              </div>
              <div className={`h-2 w-full overflow-hidden rounded-full ${darkMode ? "bg-white/8" : "bg-gray-200"}`}>
                <div className="h-full rounded-full bg-[#c9a227] transition-all duration-500" style={{ width: `${project.progress}%` }} />
              </div>
              {outlook && intelligence && intelligence.scheduleOutlook !== "unknown" && (
                <div className={`mt-2 text-[0.72rem] ${labelCls}`}>
                  {isAr ? "تقييم الاستدلال: " : "Reasoning verdict: "}
                  <span className="font-semibold">{isAr ? outlook.labelAr : outlook.label}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
