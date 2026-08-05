// ─── San3 Workspace — full layout ─────────────────────────────────────────────
// Left sidebar + top bar + main content area.
// Thin presentation layer — panels handle their own data.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WorkspaceProvider, useWorkspace, type WorkspacePanel } from "./WorkspaceContext";
import { TimelinePanel } from "./TimelinePanel";
import { CommsPanel } from "./CommsPanel";
import { HealthPanel } from "./HealthPanel";
import { PROJECTS, TIMELINE_EVENTS } from "./mockData";

// ─── Top-level export ─────────────────────────────────────────────────────────
export function WorkspaceSection() {
  return (
    <section id="workspace" className="py-20">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8 md:px-10">
        {/* ── Intro heading ── */}
        <div className="mb-10 text-center">
          <div className="inline-block mb-3 rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 px-4 py-1.5 font-mono text-[0.75rem] font-semibold uppercase tracking-widest text-[#c9a227]">
            Live product preview
          </div>
          <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight text-navy">
            One source of truth, for your entire project.
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-[1rem] leading-relaxed text-text-cream/70">
            San3 merges every email, message, and document into a single verified project record — without asking anyone to change how they work.
          </p>
        </div>

        {/* ── Workspace shell ── */}
        <WorkspaceProvider>
          <WorkspaceShell />
        </WorkspaceProvider>
      </div>
    </section>
  );
}

// ─── Shell (consumes context) ─────────────────────────────────────────────────
function WorkspaceShell() {
  const { darkMode, toggleDarkMode } = useWorkspace();
  return (
    <div
      className={`overflow-hidden rounded-3xl shadow-2xl transition-colors duration-300 ${
        darkMode ? "bg-[#0a1628]" : "bg-gray-100"
      }`}
      style={{
        border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7eb",
        minHeight: "680px",
      }}
    >
      <div className="flex h-full" style={{ minHeight: "680px" }}>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onToggleDark={toggleDarkMode} />
          <MainArea />
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: WorkspacePanel; icon: string; label: string; labelAr: string }[] = [
  { id: "timeline", icon: "⚡", label: "Unified Timeline", labelAr: "الخط الزمني الموحّد" },
  { id: "comms", icon: "✉", label: "Communication Hub", labelAr: "مركز الاتصالات" },
  { id: "health", icon: "💚", label: "System Health", labelAr: "صحة النظام" },
];

function Sidebar() {
  const { i18n } = useTranslation();
  const { activeProject, setActiveProject, activePanel, setActivePanel, darkMode } = useWorkspace();
  const isAr = i18n.language === "ar";

  const borderCls = darkMode ? "border-white/8" : "border-gray-200";
  const textFaded = darkMode ? "text-white/30" : "text-gray-400";
  const textMain = darkMode ? "text-white/80" : "text-gray-700";

  return (
    <div
      className={`flex w-[220px] shrink-0 flex-col border-e ${borderCls} transition-colors duration-300 ${
        darkMode ? "bg-[#0d1e35]" : "bg-gray-50"
      }`}
    >
      {/* Logo area */}
      <div className={`flex items-center gap-2.5 border-b px-5 py-4 ${borderCls}`}>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c9a227] text-[0.9rem] font-black text-[#0a1628]">S</div>
        <span className={`font-display text-[0.9rem] font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
          San3
        </span>
        <span className={`ms-auto text-[0.65rem] rounded-full border px-1.5 py-0.5 ${darkMode ? "border-[#c9a227]/30 text-[#c9a227]/60" : "border-amber-300 text-amber-600"}`}>
          MVP
        </span>
      </div>

      {/* Projects */}
      <div className="px-3 py-4">
        <div className={`mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-widest ${textFaded}`}>
          {isAr ? "المشاريع" : "Projects"}
        </div>
        {PROJECTS.map((p) => {
          const isActive = activeProject.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              className={`group mb-1 flex w-full flex-col rounded-xl px-3 py-2.5 text-start transition-all duration-150 ${
                isActive
                  ? darkMode
                    ? "bg-[#c9a227]/10 text-white"
                    : "bg-amber-50 text-gray-900"
                  : darkMode
                  ? "text-white/50 hover:bg-white/4 hover:text-white/70"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#c9a227]" />}
                <span className="truncate text-[0.8rem] font-semibold">
                  {isAr ? p.nameAr : p.name}
                </span>
              </div>
              <div className={`mt-0.5 text-[0.68rem] truncate ${isActive ? (darkMode ? "text-white/50" : "text-gray-400") : textFaded}`}>
                {isAr ? p.phaseAr : p.phase}
              </div>
              {/* Progress bar */}
              <div className={`mt-1.5 h-0.5 w-full rounded-full ${darkMode ? "bg-white/8" : "bg-gray-200"}`}>
                <div
                  className="h-full rounded-full bg-[#c9a227]"
                  style={{ width: `${p.progress}%`, opacity: isActive ? 1 : 0.3 }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className={`border-t ${borderCls}`} />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className={`mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-widest ${textFaded}`}>
          {isAr ? "التنقل" : "Navigate"}
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[0.82rem] font-semibold transition-all duration-150 ${
                isActive
                  ? darkMode
                    ? "bg-[#c9a227]/10 text-[#c9a227]"
                    : "bg-amber-50 text-amber-700"
                  : darkMode
                  ? `${textMain} hover:bg-white/4`
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span className="text-[1rem]">{item.icon}</span>
              {isAr ? item.labelAr : item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ onToggleDark }: { onToggleDark: () => void }) {
  const { i18n } = useTranslation();
  const { activeProject, activePanel, darkMode } = useWorkspace();
  const isAr = i18n.language === "ar";
  const [notifOpen, setNotifOpen] = useState(false);

  const panelTitles: Record<WorkspacePanel, { en: string; ar: string }> = {
    timeline: { en: "Unified Timeline", ar: "الخط الزمني الموحّد" },
    comms: { en: "Communication Hub", ar: "مركز الاتصالات" },
    health: { en: "System Health", ar: "صحة النظام" },
  };

  const borderCls = darkMode ? "border-white/8" : "border-gray-200";
  const textMain = darkMode ? "text-white/90" : "text-gray-900";
  const textFaded = darkMode ? "text-white/30" : "text-gray-400";
  const btnCls = darkMode
    ? "border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5"
    : "border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100";

  const urgentCount = TIMELINE_EVENTS.filter(
    (e) => e.projectId === activeProject.id && e.priority === "high",
  ).length;

  return (
    <div className={`flex items-center gap-4 border-b px-6 py-3.5 transition-colors ${borderCls} ${darkMode ? "bg-[#0d1e35]" : "bg-gray-50"}`}>
      {/* Panel title */}
      <div>
        <div className={`font-display text-[0.96rem] font-bold ${textMain}`}>
          {isAr ? panelTitles[activePanel].ar : panelTitles[activePanel].en}
        </div>
        <div className={`text-[0.72rem] ${textFaded}`}>
          {isAr ? activeProject.nameAr : activeProject.name}
        </div>
      </div>

      <div className="ms-auto flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${btnCls}`}
          >
            🔔
          </button>
          {urgentCount > 0 && (
            <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[0.55rem] font-bold text-white">
              {urgentCount}
            </span>
          )}
          {notifOpen && (
            <div className={`absolute end-0 top-10 z-50 w-64 rounded-2xl border p-3 shadow-xl ${darkMode ? "bg-[#111c2d] border-white/8" : "bg-white border-gray-200"}`}>
              <div className={`mb-2 text-[0.72rem] font-semibold uppercase tracking-widest ${textFaded}`}>
                {isAr ? "تنبيهات عاجلة" : "Urgent alerts"}
              </div>
              {TIMELINE_EVENTS.filter(
                (e) => e.projectId === activeProject.id && e.priority === "high"
              ).map((e) => (
                <div key={e.id} className={`mb-1.5 rounded-lg p-2.5 text-[0.76rem] ${darkMode ? "bg-red-500/8 text-red-400" : "bg-red-50 text-red-700"}`}>
                  {isAr ? e.titleAr : e.title}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dark/light toggle */}
        <button
          onClick={onToggleDark}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${btnCls}`}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c9a227]/20 text-[0.75rem] font-bold text-[#c9a227]">
          MR
        </div>
      </div>
    </div>
  );
}

// ─── Main area ────────────────────────────────────────────────────────────────
function MainArea() {
  const { activePanel } = useWorkspace();
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      {activePanel === "timeline" && <TimelinePanel />}
      {activePanel === "comms" && <CommsPanel />}
      {activePanel === "health" && <HealthPanel />}
    </div>
  );
}
