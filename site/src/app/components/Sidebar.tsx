import { useTranslation } from "react-i18next";
import type { Project, Panel } from "../types";

interface Props {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (p: Project) => void;
  activePanel: Panel;
  onSelectPanel: (p: Panel) => void;
  darkMode: boolean;
}

const NAV_ITEMS = [
  { id: "dashboard" as const, icon: "📊", label: "Dashboard", labelAr: "لوحة التحكم" },
  { id: "timeline" as const, icon: "🏗️", label: "Project Record", labelAr: "سجل المشروع" },
  { id: "sources" as const, icon: "🔌", label: "Data Sources", labelAr: "مصادر البيانات" },
  { id: "health" as const, icon: "💚", label: "System Health", labelAr: "صحة النظام" },
];

export function Sidebar({ projects, activeProject, onSelectProject, activePanel, onSelectPanel, darkMode }: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const borderCls = darkMode ? "border-white/8" : "border-gray-200";
  const textFaded = darkMode ? "text-white/30" : "text-gray-400";
  const textMain = darkMode ? "text-white/80" : "text-gray-700";

  return (
    <div className={`flex w-[240px] shrink-0 flex-col border-e ${borderCls} transition-colors duration-300 ${darkMode ? "bg-[#0d1e35]" : "bg-gray-50"}`}>
      {/* Logo area */}
      <div className={`flex items-center gap-3 border-b px-6 py-5 ${borderCls}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c9a227] text-[1rem] font-black text-[#0a1628]">S</div>
        <span className={`font-display text-[1.05rem] font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
          San3
        </span>
        <span className={`ms-auto text-[0.65rem] rounded-full border px-1.5 py-0.5 font-mono ${darkMode ? "border-[#c9a227]/30 text-[#c9a227]/60" : "border-amber-300 text-amber-600"}`}>
          APP
        </span>
      </div>

      {/* Projects */}
      <div className="px-4 py-6">
        <div className={`mb-3 px-2 text-[0.7rem] font-semibold uppercase tracking-widest ${textFaded}`}>
          {isAr ? "المشاريع" : "Projects"}
        </div>
        <div className="space-y-1.5">
          {projects.map((p) => {
            const isActive = activeProject.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`group flex w-full flex-col rounded-xl px-3 py-2.5 text-start transition-all duration-150 ${
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
                  <span className="truncate text-[0.85rem] font-semibold">
                    {isAr ? p.nameAr : p.name}
                  </span>
                </div>
                <div className={`mt-0.5 text-[0.7rem] truncate ${isActive ? (darkMode ? "text-white/50" : "text-gray-400") : textFaded}`}>
                  {isAr ? p.phaseAr : p.phase}
                </div>
                {/* Progress bar */}
                <div className={`mt-2 h-1 w-full rounded-full ${darkMode ? "bg-white/8" : "bg-gray-200"}`}>
                  <div
                    className="h-full rounded-full bg-[#c9a227] transition-all duration-500"
                    style={{ width: `${p.progress}%`, opacity: isActive ? 1 : 0.3 }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`border-t ${borderCls}`} />

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <div className={`mb-3 px-2 text-[0.7rem] font-semibold uppercase tracking-widest ${textFaded}`}>
          {isAr ? "التنقل" : "Navigate"}
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPanel(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-[0.88rem] font-semibold transition-all duration-150 ${
                isActive
                  ? darkMode
                    ? "bg-[#c9a227]/10 text-[#c9a227]"
                    : "bg-amber-50 text-amber-700"
                  : darkMode
                  ? `${textMain} hover:bg-white/4`
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span className="text-[1.1rem]">{item.icon}</span>
              {isAr ? item.labelAr : item.label}
            </button>
          );
        })}
      </nav>
      
      {/* Home link */}
      <div className={`border-t p-4 ${borderCls}`}>
        <a 
          href="/" 
          className={`flex items-center gap-2 px-3 py-2 text-[0.8rem] font-medium transition-colors ${darkMode ? "text-white/40 hover:text-white/80" : "text-gray-400 hover:text-gray-700"}`}
        >
          ← {isAr ? "العودة للموقع التعريفي" : "Back to website"}
        </a>
      </div>
    </div>
  );
}
