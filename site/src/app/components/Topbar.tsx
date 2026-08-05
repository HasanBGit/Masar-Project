import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Project, GmailUser, ConstructionEvent, Panel } from "../types";
import { CATEGORY_META } from "./eventMeta";

interface Props {
  activeProject: Project;
  activePanel: Panel;
  darkMode: boolean;
  onToggleDark: () => void;
  user: GmailUser | null;
  onLogout: () => void;
  events: ConstructionEvent[];
  reviewCount: number;
  onOpenSources: () => void;
}

const PANEL_TITLES: Record<Panel, { en: string; ar: string }> = {
  dashboard: { en: "Project Intelligence", ar: "ذكاء المشروع" },
  timeline: { en: "Project Record", ar: "سجل المشروع" },
  sources: { en: "Data Sources", ar: "مصادر البيانات" },
  health: { en: "System Health", ar: "صحة النظام" },
};

export function Topbar({
  activeProject,
  activePanel,
  darkMode,
  onToggleDark,
  user,
  onLogout,
  events,
  reviewCount,
  onOpenSources,
}: Props) {
  const { i18n } = useTranslation();
  // resolvedLanguage + base-code split so regional codes ("ar-SA") count as Arabic.
  const isAr = (i18n.resolvedLanguage ?? i18n.language).split("-")[0] === "ar";
  const [notifOpen, setNotifOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const borderCls = darkMode ? "border-white/8" : "border-gray-200";
  const textMain = darkMode ? "text-white/90" : "text-gray-900";
  const textFaded = darkMode ? "text-white/30" : "text-gray-400";
  const btnCls = darkMode
    ? "border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5"
    : "border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100";

  // Urgent = high priority or elevated risk, minus safety (which has its own lane)
  const urgentEvents = events.filter(
    (e) => !e.isSafetyAlert && (e.priority === "high" || e.riskLevel === "critical" || e.riskLevel === "high")
  );
  const safetyEvents = events.filter((e) => e.isSafetyAlert);

  return (
    <div className={`flex items-center gap-4 border-b px-8 py-4 transition-colors ${borderCls} ${darkMode ? "bg-[#0d1e35]" : "bg-gray-50"}`}>
      <div>
        <div className={`font-display text-[1.05rem] font-bold ${textMain}`}>
          {isAr ? PANEL_TITLES[activePanel].ar : PANEL_TITLES[activePanel].en}
        </div>
        <div className={`mt-0.5 text-[0.78rem] ${textFaded}`}>
          {isAr ? activeProject.nameAr : activeProject.name}
        </div>
      </div>

      <div className="ms-auto flex items-center gap-3">
        {/* Review queue */}
        {reviewCount > 0 && (
          <button
            onClick={onOpenSources}
            title={isAr ? "بنود بحاجة لمراجعة" : "Items needing review"}
            aria-label={isAr ? `بنود بحاجة لمراجعة: ${reviewCount}` : `Items needing review: ${reviewCount}`}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-[0.78rem] font-bold text-amber-500 transition-all hover:bg-amber-500/20"
          >
            <span aria-hidden="true">🔎</span>
            <span>{reviewCount}</span>
          </button>
        )}

        {/* Safety counter — its own lane, never mixed into the bell */}
        {safetyEvents.length > 0 && (
          <div className="relative">
            <button
              onClick={() => {
                setSafetyOpen((v) => !v);
                setNotifOpen(false);
              }}
              title={isAr ? "تنبيهات السلامة" : "Safety alerts"}
              aria-label={isAr ? `تنبيهات السلامة: ${safetyEvents.length}` : `Safety alerts: ${safetyEvents.length}`}
              aria-expanded={safetyOpen}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 text-[0.78rem] font-bold text-red-400 transition-all hover:bg-red-500/20"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{safetyEvents.length}</span>
            </button>

            {safetyOpen && (
              <div className={`absolute end-0 top-11 z-50 w-80 rounded-2xl border p-4 shadow-xl ${darkMode ? "bg-[#111c2d] border-red-500/25" : "bg-white border-red-200"}`}>
                <div className="mb-3 text-[0.72rem] font-semibold uppercase tracking-widest text-red-400">
                  <span aria-hidden="true">⚠️ </span>
                  {isAr ? "تنبيهات السلامة" : "Safety alerts"}
                </div>
                <div className="space-y-2">
                  {safetyEvents.slice(0, 4).map((e) => (
                    <div key={e.id} className={`rounded-xl p-3 text-[0.8rem] ${darkMode ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
                      <div className="font-semibold">{isAr ? e.titleAr : e.title}</div>
                      <div className="mt-1 line-clamp-2 opacity-80">{isAr ? e.summaryAr : e.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Language toggle — i18next persists the choice and owns document
            lang/dir via its languageChanged listener (src/i18n/index.ts). */}
        <button
          onClick={() => void i18n.changeLanguage(isAr ? "en" : "ar")}
          aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
          className={`flex h-9 items-center justify-center rounded-xl border px-3 text-[0.75rem] font-bold transition-all ${btnCls}`}
        >
          {isAr ? "EN" : "عربي"}
        </button>

        {/* Dark/light toggle */}
        <button
          onClick={onToggleDark}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${btnCls}`}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isAr ? "الوضع الداكن" : "Dark mode"}
          aria-pressed={darkMode}
        >
          <span aria-hidden="true">{darkMode ? "☀️" : "🌙"}</span>
        </button>

        {/* Priority alerts */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setSafetyOpen(false);
            }}
            aria-label={isAr ? `بنود عاجلة: ${urgentEvents.length}` : `Urgent items: ${urgentEvents.length}`}
            aria-expanded={notifOpen}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${btnCls}`}
          >
            <span aria-hidden="true">🔔</span>
          </button>
          {urgentEvents.length > 0 && (
            <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[0.55rem] font-bold text-white shadow-sm ring-2 ring-transparent">
              {urgentEvents.length}
            </span>
          )}
          {notifOpen && (
            <div className={`absolute end-0 top-11 z-50 w-80 rounded-2xl border p-4 shadow-xl ${darkMode ? "bg-[#111c2d] border-white/8" : "bg-white border-gray-200"}`}>
              <div className={`mb-3 text-[0.72rem] font-semibold uppercase tracking-widest ${textFaded}`}>
                {isAr ? "بنود عاجلة" : "Urgent items"}
              </div>
              {urgentEvents.length === 0 ? (
                <div className={`text-[0.8rem] ${textFaded}`}>
                  {isAr ? "لا توجد بنود عاجلة." : "No urgent items."}
                </div>
              ) : (
                <div className="space-y-2">
                  {urgentEvents.slice(0, 4).map((e) => {
                    const meta = CATEGORY_META[e.category];
                    return (
                      <div key={e.id} className={`rounded-xl p-3 text-[0.8rem] ${darkMode ? "bg-white/5" : "bg-gray-50"}`}>
                        <div className={`text-[0.68rem] ${textFaded}`}>
                          {meta.icon} {isAr ? meta.labelAr : meta.label}
                        </div>
                        <div className={`mt-0.5 font-semibold ${textMain}`}>{isAr ? e.titleAr : e.title}</div>
                        {(isAr ? e.actionRequiredAr : e.actionRequired) && (
                          <div className={`mt-1 line-clamp-2 ${textFaded}`}>
                            {isAr ? e.actionRequiredAr : e.actionRequired}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        {user && (
          <div className="relative ms-2">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label={isAr ? `قائمة الحساب: ${user.name}` : `Account menu: ${user.name}`}
              aria-expanded={userMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c9a227] text-[0.85rem] font-bold text-[#0a1628] shadow-sm transition-transform hover:scale-105"
            >
              <span aria-hidden="true">{user.initials}</span>
            </button>

            {userMenuOpen && (
              <div className={`absolute end-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border shadow-xl ${darkMode ? "bg-[#111c2d] border-white/8" : "bg-white border-gray-200"}`}>
                <div className={`border-b p-4 ${darkMode ? "border-white/8" : "border-gray-100"}`}>
                  <div className={`truncate text-[0.9rem] font-semibold ${textMain}`}>{user.name}</div>
                  <div className={`truncate text-[0.75rem] ${textFaded}`}>{user.email}</div>
                </div>
                <button
                  onClick={onLogout}
                  className={`w-full p-3 text-start text-[0.85rem] font-semibold transition-colors ${darkMode ? "text-red-400 hover:bg-white/5" : "text-red-600 hover:bg-gray-50"}`}
                >
                  {isAr ? "تسجيل الخروج" : "Sign out"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
