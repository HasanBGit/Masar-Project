import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConstructionEvent, ConnectorStatus, IngestionStats, SyncState, GmailUser } from "../types";
import { CHANNEL_META, formatTime, toneClasses } from "./eventMeta";

interface Props {
  stats: IngestionStats;
  reviewQueue: ConstructionEvent[];
  connectors: ConnectorStatus[];
  user: GmailUser | null;
  syncState: SyncState;
  stage: "idle" | "fetching" | "extracting" | "reasoning" | "synthesising";
  lastSync?: string;
  syncError: string | null;
  onSync: (options?: { force?: boolean }) => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  darkMode: boolean;
}

function formatRelativeTime(iso: string | undefined, isAr: boolean): string {
  if (!iso) return isAr ? "لم تتم بعد" : "Never";
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

export function Sources({
  stats,
  reviewQueue,
  connectors,
  user,
  syncState,
  stage,
  lastSync,
  syncError,
  onSync,
  onAccept,
  onDismiss,
  darkMode,
}: Props) {
  const { i18n } = useTranslation();
  const isAr = (i18n.resolvedLanguage ?? i18n.language).split("-")[0] === "ar";
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cardBg = darkMode ? "bg-[#111c2d] border-white/8" : "bg-white border-gray-200";
  const textCls = darkMode ? "text-white/90" : "text-gray-900";
  const subCls = darkMode ? "text-white/50" : "text-gray-500";
  const labelCls = darkMode ? "text-white/30" : "text-gray-400";

  const isSyncing = syncState === "syncing";
  const channels = connectors.filter((c) => c.kind === "channel");

  const funnel = [
    { id: "received", value: stats.received, label: isAr ? "رسائل واردة" : "Messages received", tone: "neutral" as const },
    { id: "events", value: stats.events, label: isAr ? "أحداث إنشائية" : "Construction events", tone: "good" as const },
    { id: "reasoned", value: stats.reasoned, label: isAr ? "خضعت للاستدلال" : "Reasoned about", tone: "info" as const },
    { id: "filtered", value: stats.filtered, label: isAr ? "غير متعلقة بالإنشاء" : "Not construction", tone: "neutral" as const },
    { id: "review", value: stats.needsReview, label: isAr ? "بحاجة لمراجعة" : "Needs review", tone: "warn" as const },
    { id: "failed", value: stats.failed, label: isAr ? "تعذّر التحليل" : "Extraction failed", tone: stats.failed > 0 ? ("danger" as const) : ("neutral" as const) },
  ];

  const STAGE_LABEL: Record<string, { en: string; ar: string }> = {
    fetching: { en: "Pulling from channels…", ar: "جلب الرسائل من القنوات…" },
    extracting: { en: "Layer 1 · extracting construction events…", ar: "الطبقة ١ · استخلاص الأحداث الإنشائية…" },
    reasoning: { en: "Layer 2 · reasoning against the project record…", ar: "الطبقة ٢ · الاستدلال على سجل المشروع…" },
    synthesising: { en: "Layer 2 · writing the owner briefing…", ar: "الطبقة ٢ · صياغة ملخص المالك…" },
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-8 space-y-6">
      {/* ─── Pipeline ────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className={`text-[0.85rem] font-semibold uppercase tracking-widest ${labelCls}`}>
              {isAr ? "خط الاستيعاب" : "Ingestion Pipeline"}
            </div>
            <div className={`mt-1 text-[0.88rem] ${subCls}`}>
              {isAr
                ? "كل رسالة تمر عبر طبقتين: الاستخلاص ثم الاستدلال"
                : "Every message passes through two layers: extraction, then reasoning"}
            </div>
            {isSyncing && stage !== "idle" && (
              <div className="mt-2 flex items-center gap-2 text-[0.8rem] font-semibold text-[#c9a227]">
                <span aria-hidden="true" className="animate-spin">↻</span>
                {isAr ? STAGE_LABEL[stage]?.ar : STAGE_LABEL[stage]?.en}
              </div>
            )}
            <div className={`mt-2 text-[0.75rem] ${labelCls}`}>
              {isAr ? "آخر تشغيل: " : "Last run: "}
              {formatRelativeTime(lastSync, isAr)}
              {user && <span className="opacity-70"> · {user.email}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSync({ force: true })}
              disabled={isSyncing || !user}
              title={isAr ? "إعادة تحليل كل الرسائل" : "Re-run the model on every message"}
              className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-[0.82rem] font-semibold transition-all ${
                isSyncing || !user
                  ? "cursor-not-allowed opacity-40"
                  : darkMode
                  ? "border-white/10 text-white/70 hover:bg-white/5"
                  : "border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span aria-hidden="true">🧠</span> {isAr ? "إعادة التحليل" : "Re-analyse"}
            </button>
            <button
              onClick={() => onSync()}
              disabled={isSyncing || !user}
              className={`flex h-10 items-center gap-2 rounded-xl px-4 text-[0.85rem] font-semibold transition-all ${
                isSyncing || !user ? "cursor-not-allowed opacity-50" : "hover:opacity-90 active:scale-95"
              } bg-[#c9a227] text-[#0a1628]`}
            >
              <span aria-hidden="true" className={isSyncing ? "animate-spin" : ""}>↻</span>
              {isSyncing ? (isAr ? "جارٍ التحليل…" : "Analysing…") : isAr ? "مزامنة الآن" : "Sync now"}
            </button>
          </div>
        </div>

        {syncError && (
          <div role="alert" className={`mt-4 rounded-xl border p-3 text-[0.82rem] ${toneClasses("danger", darkMode)}`}>
            {syncError}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {funnel.map((f) => (
            <div key={f.id} className={`rounded-xl border p-4 ${toneClasses(f.tone, darkMode)}`}>
              <div className="font-display text-[1.6rem] font-bold leading-none">{f.value}</div>
              <div className="mt-1.5 text-[0.72rem] opacity-80">{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Needs review ────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${reviewQueue.length > 0 ? (darkMode ? "border-amber-500/25 bg-amber-500/4" : "border-amber-200 bg-amber-50/60") : cardBg}`}>
        <div className="mb-1 flex items-center gap-2">
          <span aria-hidden="true" className="text-[1rem]">🔎</span>
          <span className={`text-[0.8rem] font-semibold uppercase tracking-widest ${reviewQueue.length > 0 ? "text-amber-500" : labelCls}`}>
            {isAr ? "بحاجة لمراجعة بشرية" : "Needs Human Review"}
          </span>
          {reviewQueue.length > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[0.68rem] font-bold text-[#0a1628]">
              {reviewQueue.length}
            </span>
          )}
        </div>
        <div className={`mb-4 text-[0.8rem] ${subCls}`}>
          {isAr
            ? "بنود لم يكن النموذج واثقاً منها. لا تدخل سجل المشروع حتى يؤكدها إنسان."
            : "Items the model wasn't confident about. They stay out of the project record until a human decides."}
        </div>

        {reviewQueue.length === 0 ? (
          <div className={`py-6 text-center text-[0.85rem] ${labelCls}`}>
            {isAr ? "لا توجد بنود معلّقة." : "Nothing pending review."}
          </div>
        ) : (
          <div className="space-y-3">
            {reviewQueue.map((item) => {
              const isExp = expandedId === item.id;
              const channel = CHANNEL_META[item.evidence.channel];
              const reason =
                item.confidence === 0
                  ? isAr
                    ? "تعذّر تحليل الرسالة"
                    : "Extraction unavailable"
                  : isAr
                  ? `ثقة منخفضة · ${Math.round(item.confidence * 100)}%`
                  : `Low confidence · ${Math.round(item.confidence * 100)}%`;

              return (
                <div key={item.id} className={`rounded-xl border ${darkMode ? "border-white/8 bg-[#111c2d]" : "border-gray-200 bg-white"}`}>
                  <button onClick={() => setExpandedId(isExp ? null : item.id)} className="flex w-full items-start gap-3 p-4 text-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${toneClasses("warn", darkMode)}`}>
                          {reason}
                        </span>
                        <span className={`text-[0.7rem] ${labelCls}`}>
                          {isAr ? channel.labelAr : channel.label} · {formatTime(item.evidence.receivedAt, isAr)}
                        </span>
                      </div>
                      <div className={`text-[0.92rem] font-semibold ${textCls}`}>
                        {isAr ? item.titleAr : item.title}
                      </div>
                      <div className={`mt-0.5 text-[0.78rem] ${subCls}`}>
                        {item.evidence.sender} · {item.evidence.senderHandle}
                      </div>
                      {(isAr ? item.summaryAr : item.summary) && (
                        <div className={`mt-1.5 line-clamp-2 text-[0.82rem] ${subCls}`}>
                          {isAr ? item.summaryAr : item.summary}
                        </div>
                      )}
                    </div>
                    <span aria-hidden="true" className={`shrink-0 text-[0.7rem] ${labelCls}`}>{isExp ? "▲" : "▼"}</span>
                  </button>

                  {isExp && (
                    <div className={`border-t px-4 pb-4 pt-3 ${darkMode ? "border-white/8" : "border-gray-100"}`}>
                      <div className={`mb-1.5 text-[0.7rem] ${labelCls}`}>
                        {isAr ? "الرسالة الأصلية" : "Original message"}
                      </div>
                      <div className={`max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg p-3 text-[0.8rem] leading-relaxed ${darkMode ? "bg-white/4 text-white/70" : "bg-gray-50 text-gray-700"}`}>
                        {item.evidence.originalBody || (isAr ? "لا يوجد نص." : "No message text.")}
                      </div>
                    </div>
                  )}

                  <div className={`flex gap-2 border-t p-3 ${darkMode ? "border-white/8" : "border-gray-100"}`}>
                    <button
                      onClick={() => onAccept(item.id)}
                      className="rounded-lg bg-[#c9a227] px-3 py-1.5 text-[0.78rem] font-semibold text-[#0a1628] transition-transform hover:scale-[1.02]"
                    >
                      {isAr ? "تأكيد كحدث إنشائي" : "Confirm as construction event"}
                    </button>
                    <button
                      onClick={() => onDismiss(item.id)}
                      className={`rounded-lg border px-3 py-1.5 text-[0.78rem] font-semibold transition-colors ${
                        darkMode ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {isAr ? "ليس متعلقاً بالمشروع" : "Not project-related"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Channels ────────────────────────────────────────────────────── */}
      <div>
        <div className={`mb-1 text-[0.85rem] font-semibold uppercase tracking-widest ${labelCls}`}>
          {isAr ? "قنوات التواصل" : "Communication Channels"}
        </div>
        <div className={`mb-4 text-[0.85rem] ${subCls}`}>
          {isAr
            ? "كل قناة تُغذّي نفس سجل المشروع الموحّد"
            : "Every channel feeds the same unified project record"}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((c) => {
            const meta = CHANNEL_META[c.id as keyof typeof CHANNEL_META];
            return (
              <div key={c.id} className={`rounded-2xl border p-5 ${cardBg}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-[1.1rem]">{meta?.icon ?? "🔌"}</span>
                    <span className={`font-display text-[1rem] font-bold ${textCls}`}>
                      {isAr ? c.nameAr : c.name}
                    </span>
                  </div>

                  {c.connected ? (
                    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${toneClasses("good", darkMode)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {isAr ? "متصل" : "Connected"}
                    </span>
                  ) : c.available ? (
                    <span className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${toneClasses("danger", darkMode)}`}>
                      {isAr ? "يحتاج ربط" : "Not connected"}
                    </span>
                  ) : (
                    <span className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${toneClasses("neutral", darkMode)}`}>
                      {isAr ? "قريباً" : "Planned"}
                    </span>
                  )}
                </div>

                <div className={`text-[0.82rem] ${subCls}`}>
                  {c.connected
                    ? isAr
                      ? c.detailAr
                      : c.detail
                    : c.available
                    ? isAr
                      ? "سجّل الدخول لبدء الاستيعاب."
                      : "Sign in to begin ingesting."
                    : isAr
                    ? "محوّل جاهز في السجل  -  يُفعّل دون تغيير النموذج."
                    : "Adapter slot ready  -  enabling it changes no data model."}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
