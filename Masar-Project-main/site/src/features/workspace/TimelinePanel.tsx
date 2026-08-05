// ─── Unified Project Timeline panel ───────────────────────────────────────────
// Module 2 — one chronological, project-anchored record.
// Currently only Gmail events are in the feed; future channels drop in with
// zero UI changes by pushing to TIMELINE_EVENTS with a different `channel`.

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  TIMELINE_EVENTS,
  PROJECTS,
  type SourceChannel,
  type Priority,
} from "./mockData";
import { useWorkspace } from "./WorkspaceContext";

// ─── Channel metadata (add new channels here only) ───────────────────────────
const CHANNEL_META: Record<
  SourceChannel,
  { label: string; labelAr: string; color: string; icon: string }
> = {
  gmail: { label: "Gmail", labelAr: "Gmail", color: "#EA4335", icon: "✉" },
  whatsapp: { label: "WhatsApp", labelAr: "واتساب", color: "#25D366", icon: "💬" },
  "site-photo": { label: "Site Photo", labelAr: "صورة موقع", color: "#F59E0B", icon: "📷" },
  drawing: { label: "Drawing", labelAr: "مخطط", color: "#6366F1", icon: "📐" },
  rfi: { label: "RFI", labelAr: "طلب معلومات", color: "#8B5CF6", icon: "📋" },
  permit: { label: "Permit", labelAr: "تصريح", color: "#0EA5E9", icon: "🏛" },
};

const PRIORITY_META: Record<Priority, { label: string; labelAr: string; cls: string }> = {
  high: { label: "High", labelAr: "عالية", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  medium: { label: "Medium", labelAr: "متوسطة", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  low: { label: "Low", labelAr: "منخفضة", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function formatRelativeTime(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (lang === "ar") {
    if (days > 0) return `منذ ${days} ${days === 1 ? "يوم" : "أيام"}`;
    if (hours > 0) return `منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
    return `منذ ${mins} دقيقة`;
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

export function TimelinePanel() {
  const { i18n } = useTranslation();
  const { activeProject, darkMode } = useWorkspace();
  const lang = i18n.language;
  const isAr = lang === "ar";

  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState<SourceChannel | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const events = useMemo(() => {
    return TIMELINE_EVENTS.filter((e) => {
      const matchProject = e.projectId === activeProject.id;
      const matchChannel = filterChannel === "all" || e.channel === filterChannel;
      const matchPriority = filterPriority === "all" || e.priority === filterPriority;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.titleAr.includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.sender ?? "").toLowerCase().includes(q);
      return matchProject && matchChannel && matchPriority && matchSearch;
    });
  }, [activeProject.id, filterChannel, filterPriority, search]);

  const bg = darkMode ? "bg-[#0d1520]" : "bg-white";
  const cardBg = darkMode ? "bg-[#111c2d] border-white/8" : "bg-gray-50 border-gray-200";
  const inputBg = darkMode ? "bg-[#1a2540] border-white/10 text-white placeholder-white/30" : "bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400";
  const labelCls = darkMode ? "text-white/50" : "text-gray-400";
  const textCls = darkMode ? "text-white/90" : "text-gray-900";
  const subCls = darkMode ? "text-white/50" : "text-gray-500";

  return (
    <div className={`flex h-full flex-col ${bg}`}>
      {/* ── Toolbar ── */}
      <div className={`flex flex-wrap items-center gap-3 border-b px-6 py-4 ${darkMode ? "border-white/8" : "border-gray-200"}`}>
        <input
          type="search"
          placeholder={isAr ? "ابحث في الخط الزمني…" : "Search timeline…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`h-9 w-[220px] rounded-lg border px-3 text-[0.85rem] outline-none transition focus:border-[#c9a227] ${inputBg}`}
        />

        {/* Channel filter pills */}
        <div className="flex flex-wrap gap-2">
          {(["all", "gmail"] as const).map((ch) => {
            const meta = ch === "all" ? null : CHANNEL_META[ch];
            const active = filterChannel === ch;
            return (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.78rem] font-medium transition-all ${
                  active
                    ? "border-[#c9a227] bg-[#c9a227]/15 text-[#c9a227]"
                    : darkMode
                    ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                    : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                }`}
              >
                {meta && <span>{meta.icon}</span>}
                {ch === "all" ? (isAr ? "الكل" : "All") : isAr ? meta!.labelAr : meta!.label}
              </button>
            );
          })}
        </div>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
          className={`h-9 rounded-lg border px-3 text-[0.82rem] outline-none transition focus:border-[#c9a227] ${inputBg} cursor-pointer`}
        >
          <option value="all">{isAr ? "كل الأولويات" : "All priorities"}</option>
          <option value="high">{isAr ? "عالية" : "High"}</option>
          <option value="medium">{isAr ? "متوسطة" : "Medium"}</option>
          <option value="low">{isAr ? "منخفضة" : "Low"}</option>
        </select>

        <span className={`ms-auto text-[0.78rem] ${labelCls}`}>
          {events.length} {isAr ? "حدث" : "events"}
        </span>
      </div>

      {/* ── Event list ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {events.length === 0 && (
          <div className={`py-16 text-center text-[0.9rem] ${labelCls}`}>
            {isAr ? "لا توجد أحداث مطابقة" : "No matching events"}
          </div>
        )}
        {events.map((ev) => {
          const isExpanded = expandedId === ev.id;
          const ch = CHANNEL_META[ev.channel];
          const pri = PRIORITY_META[ev.priority];
          const project = PROJECTS.find((p) => p.id === ev.projectId);
          return (
            <div
              key={ev.id}
              className={`group rounded-2xl border transition-all duration-200 ${cardBg} ${
                isExpanded
                  ? darkMode
                    ? "border-[#c9a227]/40 shadow-lg shadow-[#c9a227]/5"
                    : "border-[#c9a227]/40"
                  : "hover:border-[#c9a227]/20"
              }`}
            >
              {/* Card header */}
              <button
                className="flex w-full items-start gap-4 p-5 text-start"
                onClick={() => setExpandedId(isExpanded ? null : ev.id)}
              >
                {/* Channel badge */}
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[1.1rem]"
                  style={{ background: ch.color + "20" }}
                >
                  {ch.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[0.68rem] font-semibold"
                      style={{ background: ch.color + "20", color: ch.color }}
                    >
                      {isAr ? ch.labelAr : ch.label}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${pri.cls}`}>
                      {isAr ? pri.labelAr : pri.label}
                    </span>
                    {ev.verification === "verified" && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.68rem] font-semibold text-emerald-400">
                        ✓ {isAr ? "موثّق" : "Verified"}
                      </span>
                    )}
                    {ev.verification === "pending" && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.68rem] text-amber-400">
                        ⏳ {isAr ? "قيد المراجعة" : "Pending"}
                      </span>
                    )}
                  </div>

                  <h3 className={`mt-1.5 font-display text-[0.96rem] font-bold leading-snug ${textCls}`}>
                    {isAr ? ev.titleAr : ev.title}
                  </h3>

                  {/* AI summary preview */}
                  <p className={`mt-1 text-[0.82rem] leading-relaxed ${subCls}`}>
                    {isAr ? ev.aiSummaryAr : ev.aiSummary}
                  </p>
                </div>

                <div className={`shrink-0 text-end text-[0.72rem] ${labelCls}`}>
                  <div>{formatRelativeTime(ev.time, lang)}</div>
                  {project && (
                    <div className="mt-0.5 opacity-70">{isAr ? project.nameAr : project.name}</div>
                  )}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className={`border-t px-5 pb-5 pt-4 ${darkMode ? "border-white/8" : "border-gray-200"}`}>
                  {ev.sender && (
                    <div className={`mb-3 text-[0.8rem] ${subCls}`}>
                      <span className={darkMode ? "text-white/40" : "text-gray-400"}>
                        {isAr ? "المرسِل: " : "From: "}
                      </span>
                      {ev.sender} · {ev.senderEmail}
                    </div>
                  )}
                  {ev.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ev.attachments.map((att) => (
                        <span
                          key={att}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.76rem] ${
                            darkMode
                              ? "border-white/10 text-white/50"
                              : "border-gray-200 text-gray-500"
                          }`}
                        >
                          📎 {att}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={`mt-3 rounded-xl p-3 text-[0.8rem] leading-relaxed ${darkMode ? "bg-white/4 text-white/60" : "bg-gray-100 text-gray-600"}`}>
                    <span className="font-semibold text-[#c9a227]">
                      {isAr ? "ملخص الذكاء الاصطناعي · " : "AI Summary · "}
                    </span>
                    {isAr ? ev.aiSummaryAr : ev.aiSummary}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Future channel placeholder */}
        <div className={`rounded-2xl border-2 border-dashed p-6 text-center text-[0.82rem] ${darkMode ? "border-white/8 text-white/20" : "border-gray-200 text-gray-300"}`}>
          {isAr
            ? "قنوات المستقبل — واتساب · صور الموقع · المخططات · التصاريح — ستظهر هنا تلقائياً"
            : "Future channels — WhatsApp · Site Photos · Drawings · Permits — will appear here automatically"}
        </div>
      </div>
    </div>
  );
}
