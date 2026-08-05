// ─── Presentation metadata for construction events ────────────────────────────
// One vocabulary shared by the timeline, dashboard and review queue, so a
// category always looks and reads the same wherever it appears.

import type {
  EventCategory,
  EventRelation,
  Priority,
  RiskLevel,
  RiskType,
  ScheduleImpact,
  ScheduleOutlook,
  SourceChannel,
} from "../types";

export type Tone = "danger" | "warn" | "info" | "good" | "neutral";

export function toneClasses(tone: Tone, darkMode: boolean): string {
  switch (tone) {
    case "danger":
      return darkMode
        ? "bg-red-500/15 text-red-400 border-red-500/30"
        : "bg-red-50 text-red-700 border-red-200";
    case "warn":
      return darkMode
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-amber-50 text-amber-700 border-amber-200";
    case "info":
      return darkMode
        ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
        : "bg-sky-50 text-sky-700 border-sky-200";
    case "good":
      return darkMode
        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return darkMode
        ? "bg-white/5 text-white/60 border-white/10"
        : "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export interface CategoryMeta {
  icon: string;
  label: string;
  labelAr: string;
  /** Used when narrating counts, e.g. "2 permit approvals". */
  plural: string;
  pluralAr: string;
  tone: Tone;
}

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  permit: { icon: "📋", label: "Permit", labelAr: "تصريح", plural: "permits", pluralAr: "تصاريح", tone: "good" },
  safety: { icon: "⚠️", label: "Safety", labelAr: "السلامة", plural: "safety alerts", pluralAr: "تنبيهات سلامة", tone: "danger" },
  inspection: { icon: "🔍", label: "Inspection", labelAr: "تفتيش", plural: "inspections", pluralAr: "عمليات تفتيش", tone: "info" },
  rfi: { icon: "❓", label: "RFI", labelAr: "طلب معلومات", plural: "RFIs", pluralAr: "طلبات معلومات", tone: "warn" },
  "drawing-revision": { icon: "📐", label: "Drawing Revision", labelAr: "تعديل مخطط", plural: "drawing revisions", pluralAr: "تعديلات مخططات", tone: "info" },
  "material-delivery": { icon: "🚚", label: "Material Delivery", labelAr: "توريد مواد", plural: "material deliveries", pluralAr: "عمليات توريد", tone: "info" },
  "progress-update": { icon: "📈", label: "Progress Update", labelAr: "تحديث التقدم", plural: "progress updates", pluralAr: "تحديثات تقدم", tone: "good" },
  "consultant-review": { icon: "🖊️", label: "Consultant Review", labelAr: "مراجعة الاستشاري", plural: "consultant reviews", pluralAr: "مراجعات استشاري", tone: "info" },
  invoice: { icon: "💰", label: "Invoice", labelAr: "فاتورة", plural: "invoices", pluralAr: "فواتير", tone: "neutral" },
  "variation-order": { icon: "🔁", label: "Variation Order", labelAr: "أمر تغييري", plural: "variation orders", pluralAr: "أوامر تغييرية", tone: "warn" },
  delay: { icon: "⏳", label: "Delay", labelAr: "تأخير", plural: "schedule delays", pluralAr: "تأخيرات", tone: "danger" },
  procurement: { icon: "📦", label: "Procurement", labelAr: "مشتريات", plural: "procurement items", pluralAr: "بنود مشتريات", tone: "neutral" },
  meeting: { icon: "👥", label: "Meeting", labelAr: "اجتماع", plural: "meetings", pluralAr: "اجتماعات", tone: "neutral" },
  other: { icon: "📄", label: "Other", labelAr: "أخرى", plural: "other items", pluralAr: "بنود أخرى", tone: "neutral" },
};

export const PRIORITY_META: Record<Priority, { label: string; labelAr: string; tone: Tone; dot: string }> = {
  high: { label: "High", labelAr: "عالية", tone: "danger", dot: "bg-red-500" },
  medium: { label: "Medium", labelAr: "متوسطة", tone: "warn", dot: "bg-amber-500" },
  low: { label: "Low", labelAr: "منخفضة", tone: "good", dot: "bg-emerald-500" },
};

export const RISK_META: Record<RiskLevel, { label: string; labelAr: string; tone: Tone }> = {
  critical: { label: "Critical risk", labelAr: "خطر حرج", tone: "danger" },
  high: { label: "High risk", labelAr: "خطر عالٍ", tone: "danger" },
  medium: { label: "Medium risk", labelAr: "خطر متوسط", tone: "warn" },
  low: { label: "Low risk", labelAr: "خطر منخفض", tone: "info" },
  none: { label: "No risk flagged", labelAr: "لا مخاطر", tone: "neutral" },
};

/** How a source is credited on an event. Purely presentational — the platform
 *  treats every channel identically. */
export const CHANNEL_META: Record<SourceChannel, { icon: string; label: string; labelAr: string }> = {
  gmail: { icon: "✉", label: "Verified Gmail", labelAr: "Gmail موثّق" },
  whatsapp: { icon: "💬", label: "Verified WhatsApp", labelAr: "واتساب موثّق" },
  outlook: { icon: "✉", label: "Verified Outlook", labelAr: "Outlook موثّق" },
  balady: { icon: "🏛️", label: "Verified Balady", labelAr: "بلدي موثّق" },
  primavera: { icon: "📊", label: "Verified Primavera", labelAr: "Primavera موثّق" },
  teams: { icon: "👥", label: "Verified Teams", labelAr: "Teams موثّق" },
};

// ─── Layer 2 vocabulary ───────────────────────────────────────────────────────

export const RELATION_META: Record<EventRelation, { icon: string; label: string; labelAr: string; tone: Tone }> = {
  new: { icon: "✨", label: "New", labelAr: "جديد", tone: "neutral" },
  update: { icon: "🔗", label: "Updates earlier event", labelAr: "تحديث لحدث سابق", tone: "info" },
  duplicate: { icon: "⧉", label: "Duplicate", labelAr: "مكرر", tone: "neutral" },
};

export const RISK_TYPE_META: Record<RiskType, { label: string; labelAr: string }> = {
  schedule: { label: "Schedule risk", labelAr: "خطر على الجدول الزمني" },
  cost: { label: "Cost risk", labelAr: "خطر على التكلفة" },
  safety: { label: "Safety risk", labelAr: "خطر على السلامة" },
  compliance: { label: "Compliance risk", labelAr: "خطر امتثال" },
  quality: { label: "Quality risk", labelAr: "خطر على الجودة" },
  scope: { label: "Scope risk", labelAr: "خطر على النطاق" },
  none: { label: "No risk", labelAr: "لا خطر" },
};

export const SCHEDULE_IMPACT_META: Record<ScheduleImpact, { label: string; labelAr: string; tone: Tone }> = {
  none: { label: "No schedule impact", labelAr: "لا أثر على الجدول", tone: "neutral" },
  possible: { label: "Possible delay", labelAr: "تأخير محتمل", tone: "warn" },
  likely: { label: "Likely delay", labelAr: "تأخير مرجّح", tone: "warn" },
  confirmed: { label: "Confirmed delay", labelAr: "تأخير مؤكد", tone: "danger" },
};

export const OUTLOOK_META: Record<ScheduleOutlook, { icon: string; label: string; labelAr: string; tone: Tone }> = {
  "on-track": { icon: "✅", label: "On track", labelAr: "ضمن المسار", tone: "good" },
  "at-risk": { icon: "⚠️", label: "At risk", labelAr: "معرّض للخطر", tone: "warn" },
  slipping: { icon: "📉", label: "Slipping", labelAr: "ينزلق عن الجدول", tone: "danger" },
  unknown: { icon: "❔", label: "Not enough signal", labelAr: "إشارات غير كافية", tone: "neutral" },
};

/** Categories that represent an approval-shaped workflow. */
export const APPROVAL_CATEGORIES: EventCategory[] = [
  "permit",
  "consultant-review",
  "variation-order",
];

export function formatTime(iso: string, isAr: boolean): string {
  try {
    return new Date(iso).toLocaleString(isAr ? "ar-SA" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso: string, isAr: boolean): string {
  try {
    return new Date(iso).toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

/** Normalizes text for bilingual search: folds Arabic letter variants and
 *  diacritics so "اصابه" also matches "إصابة". */
export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ً-ٰ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "");
}
