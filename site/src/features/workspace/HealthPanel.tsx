// ─── System Health panel ───────────────────────────────────────────────────────
// Module 15 (observability) — project-manager facing. Simple signal cards only.
// No logs, queues, OAuth details, latency graphs, or webhook debugging.

import { useTranslation } from "react-i18next";
import { SYSTEM_HEALTH, AI_PROCESSING, GMAIL_ACCOUNT } from "./mockData";
import { useWorkspace } from "./WorkspaceContext";

function formatRelativeTime(iso: string | undefined, isAr: boolean): string {
  if (!iso) return isAr ? "غير متاح" : "N/A";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (isAr) {
    if (hours > 0) return `منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
    return `منذ ${mins} دقيقة`;
  }
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

export function HealthPanel() {
  const { i18n } = useTranslation();
  const { darkMode } = useWorkspace();
  const isAr = i18n.language === "ar";

  const bg = darkMode ? "bg-[#0d1520]" : "bg-white";
  const labelCls = darkMode ? "text-white/30" : "text-gray-400";
  const panelBg = darkMode ? "bg-[#111c2d] border-white/8" : "bg-gray-50 border-gray-200";
  const textCls = darkMode ? "text-white/90" : "text-gray-900";
  const subCls = darkMode ? "text-white/50" : "text-gray-500";

  const gmailHealth = SYSTEM_HEALTH.find((c) => c.id === "gmail")!;
  const futureConnectors = SYSTEM_HEALTH.filter((c) => c.id !== "gmail");

  return (
    <div className={`flex h-full flex-col ${bg}`}>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* ── Section header ── */}
        <div>
          <div className={`text-[0.78rem] font-semibold uppercase tracking-widest ${labelCls}`}>
            {isAr ? "صحة النظام" : "System Health"}
          </div>
          <div className={`mt-1 text-[0.85rem] ${subCls}`}>
            {isAr
              ? "حالة جميع قنوات الاتصال المتصلة بالمنصة"
              : "Status of all communication channels connected to the platform"}
          </div>
        </div>

        {/* ── Gmail status card ── */}
        <div className={`rounded-2xl border p-5 ${panelBg}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA4335]/15 text-[1.3rem]">✉</div>
              <div>
                <div className={`font-display text-[0.96rem] font-bold ${textCls}`}>Gmail</div>
                <div className={`text-[0.78rem] ${subCls}`}>{GMAIL_ACCOUNT.email}</div>
              </div>
            </div>
            <StatusBadge status="connected" isAr={isAr} />
          </div>

          {/* Stats */}
          <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3`}>
            <InfoCard
              icon="🔄"
              label={isAr ? "آخر مزامنة" : "Last sync"}
              value={formatRelativeTime(gmailHealth.lastSync, isAr)}
              darkMode={darkMode}
            />
            <InfoCard
              icon="📬"
              label={isAr ? "رسائل مستوردة" : "Emails imported"}
              value={`${gmailHealth.emailsImported ?? 0}`}
              darkMode={darkMode}
            />
            <InfoCard
              icon="✅"
              label={isAr ? "معالجة اليوم" : "Processed today"}
              value={`${GMAIL_ACCOUNT.todayImported}`}
              darkMode={darkMode}
            />
          </div>

          <div className={`mt-3 rounded-xl p-3 text-[0.8rem] ${darkMode ? "bg-emerald-500/5 text-emerald-400/80" : "bg-emerald-50 text-emerald-700"}`}>
            {isAr ? gmailHealth.detailAr : gmailHealth.detail}
          </div>
        </div>

        {/* ── AI Processing ── */}
        <div className={`rounded-2xl border p-5 ${panelBg}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a227]/15 text-[1.3rem]">🤖</div>
            <div>
              <div className={`font-display text-[0.96rem] font-bold ${textCls}`}>
                {isAr ? "معالجة الذكاء الاصطناعي" : "AI Processing"}
              </div>
              <div className={`text-[0.78rem] ${subCls}`}>
                {isAr ? "تلخيص وتصنيف وتحديد الأولويات" : "Summarization, classification & prioritization"}
              </div>
            </div>
            <StatusBadge
              status={AI_PROCESSING.status === "active" ? "connected" : "error"}
              isAr={isAr}
              label={AI_PROCESSING.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "خطأ" : "Error")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon="📋"
              label={isAr ? "معالج اليوم" : "Processed today"}
              value={`${AI_PROCESSING.processedToday}`}
              darkMode={darkMode}
            />
            <InfoCard
              icon="⏳"
              label={isAr ? "يحتاج مراجعة" : "Pending review"}
              value={`${AI_PROCESSING.pendingReview}`}
              darkMode={darkMode}
              accent
            />
          </div>
        </div>

        {/* ── Future connectors ── */}
        <div>
          <div className={`mb-3 text-[0.78rem] font-semibold uppercase tracking-widest ${labelCls}`}>
            {isAr ? "قنوات قادمة" : "Coming soon"}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {futureConnectors.map((conn) => (
              <div
                key={conn.id}
                className={`flex items-center justify-between rounded-2xl border p-4 ${
                  darkMode ? "border-white/5 bg-white/2" : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className={`font-medium text-[0.88rem] ${darkMode ? "text-white/25" : "text-gray-300"}`}>
                  {isAr ? conn.nameAr : conn.name}
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[0.68rem] ${
                  darkMode ? "border-white/8 text-white/20" : "border-gray-200 text-gray-300"
                }`}>
                  {isAr ? conn.statusLabelAr : conn.statusLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  isAr,
  label,
}: {
  status: "connected" | "error" | "disconnected";
  isAr: boolean;
  label?: string;
}) {
  const labels = {
    connected: isAr ? "متصل" : "Connected",
    error: isAr ? "خطأ" : "Error",
    disconnected: isAr ? "غير متصل" : "Disconnected",
  };
  const styles = {
    connected: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    disconnected: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  const dots = {
    connected: "bg-emerald-400",
    error: "bg-red-400",
    disconnected: "bg-gray-400",
  };
  return (
    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] font-semibold ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {label ?? labels[status]}
    </span>
  );
}

function InfoCard({
  icon,
  label,
  value,
  darkMode,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string;
  darkMode: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3.5 ${darkMode ? "bg-white/3" : "bg-white border border-gray-100"}`}>
      <div className="text-[1.1rem]">{icon}</div>
      <div className={`mt-1.5 font-display text-[1.3rem] font-bold ${accent ? "text-amber-400" : darkMode ? "text-white" : "text-gray-900"}`}>
        {value}
      </div>
      <div className={`mt-0.5 text-[0.72rem] ${darkMode ? "text-white/35" : "text-gray-400"}`}>{label}</div>
    </div>
  );
}
