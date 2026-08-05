import { useTranslation } from "react-i18next";
import type { ConnectorStatus } from "../types";
import { toneClasses } from "./eventMeta";

interface Props {
  connectors: ConnectorStatus[];
  darkMode: boolean;
}

export function Health({ connectors, darkMode }: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const cardBg = darkMode ? "bg-[#111c2d] border-white/8" : "bg-white border-gray-200";
  const labelCls = darkMode ? "text-white/30" : "text-gray-400";
  const textCls = darkMode ? "text-white/90" : "text-gray-900";
  const subCls = darkMode ? "text-white/50" : "text-gray-500";

  const intelligence = connectors.filter((c) => c.kind === "intelligence");
  const channels = connectors.filter((c) => c.kind === "channel");

  const statusBadge = (c: ConnectorStatus) => {
    if (!c.available) {
      return (
        <span className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${toneClasses("neutral", darkMode)}`}>
          {isAr ? "قريباً" : "Planned"}
        </span>
      );
    }
    if (!c.connected) {
      return (
        <span className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${toneClasses("danger", darkMode)}`}>
          {isAr ? "غير متصل" : "Not connected"}
        </span>
      );
    }
    if (c.healthy === false) {
      return (
        <span className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${toneClasses("danger", darkMode)}`}>
          {isAr ? "يوجد خلل" : "Degraded"}
        </span>
      );
    }
    return (
      <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${toneClasses("good", darkMode)}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {isAr ? "سليم" : "Healthy"}
      </span>
    );
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-8 space-y-6">
      <div>
        <div className={`text-[0.85rem] font-semibold uppercase tracking-widest ${labelCls}`}>
          {isAr ? "صحة النظام" : "System Health"}
        </div>
        <div className={`mt-1 text-[0.9rem] ${subCls}`}>
          {isAr
            ? "نحن نراقب الأنابيب حتى لا يضطر المالك لذلك"
            : "We watch the pipes so the owner doesn't have to"}
        </div>
      </div>

      {/* ─── Intelligence layer ──────────────────────────────────────────── */}
      <div>
        <div className={`mb-3 text-[0.75rem] font-semibold uppercase tracking-widest ${labelCls}`}>
          {isAr ? "طبقة الذكاء" : "Intelligence layer"}
        </div>
        {intelligence.map((c) => (
          <div
            key={c.id}
            className={`rounded-2xl border p-5 ${
              c.healthy === false ? "border-red-500/30 " + (darkMode ? "bg-red-500/5" : "bg-red-50") : cardBg
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[1.1rem]">🧠</span>
                <span className={`font-display text-[1.05rem] font-bold ${textCls}`}>
                  {isAr ? c.nameAr : c.name}
                </span>
              </div>
              {statusBadge(c)}
            </div>
            <div className={`text-[0.85rem] ${subCls}`}>{(isAr ? c.detailAr : c.detail) ?? "—"}</div>
            {c.healthy === false && (
              <div className={`mt-3 rounded-xl border p-3 text-[0.8rem] ${toneClasses("danger", darkMode)}`}>
                {isAr
                  ? "بدون هذه الطبقة لا يمكن تحويل الرسائل إلى أحداث إنشائية — تُحفظ الرسائل في قائمة المراجعة بدلاً من تخمين محتواها."
                  : "Without this layer messages cannot become construction events — they are held in the review queue rather than guessed at."}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── Channels ────────────────────────────────────────────────────── */}
      <div>
        <div className={`mb-3 text-[0.75rem] font-semibold uppercase tracking-widest ${labelCls}`}>
          {isAr ? "قنوات التواصل" : "Communication channels"}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {channels.map((c) => (
            <div key={c.id} className={`rounded-2xl border p-5 ${cardBg}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className={`font-display text-[1.05rem] font-bold ${textCls}`}>
                  {isAr ? c.nameAr : c.name}
                </div>
                {statusBadge(c)}
              </div>

              <div className={`text-[0.85rem] ${subCls}`}>
                {c.available
                  ? (isAr ? c.detailAr : c.detail) ??
                    (isAr ? "بانتظار المزامنة." : "Awaiting sync.")
                  : isAr
                  ? "هذه القناة غير مفعّلة بعد."
                  : "This channel is not enabled yet."}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
