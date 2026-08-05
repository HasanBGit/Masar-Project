// ─────────────────────────────────────────────────────────────────────────────
// Mock data for the San3 Workspace MVP
// Replace each connector's array/function with a real API call when ready.
// All other UI code consumes these typed interfaces — the UI never changes.
// ─────────────────────────────────────────────────────────────────────────────

export type SourceChannel =
  | "gmail"
  | "whatsapp" // future
  | "site-photo" // future
  | "drawing" // future
  | "rfi" // future
  | "permit"; // future

export type Priority = "high" | "medium" | "low";
export type VerifiedStatus = "verified" | "pending" | "flagged";
export type SyncStatus = "syncing" | "idle" | "error" | "disconnected";

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  nameAr: string;
  location: string;
  phase: string;
  phaseAr: string;
  progress: number; // 0-100
}

export const PROJECTS: Project[] = [
  {
    id: "proj-001",
    name: "King Abdulaziz Road Tower",
    nameAr: "برج طريق الملك عبدالعزيز",
    location: "Riyadh",
    phase: "Structure — Floor 14",
    phaseAr: "الهيكل الإنشائي — الطابق 14",
    progress: 42,
  },
  {
    id: "proj-002",
    name: "Diriyah Gate Villas — Zone C",
    nameAr: "فلل بوابة الدرعية — المنطقة ج",
    location: "Diriyah",
    phase: "MEP Rough-in",
    phaseAr: "الكهروميكانيكية الأولية",
    progress: 68,
  },
  {
    id: "proj-003",
    name: "Al Nakheel Business Park",
    nameAr: "مجمع النخيل التجاري",
    location: "Jeddah",
    phase: "Fit-out",
    phaseAr: "التشطيبات الداخلية",
    progress: 87,
  },
];

// ─── Gmail connector ───────────────────────────────────────────────────────────
// Replace GMAIL_ACCOUNT and IMPORTED_EMAILS with real OAuth + API responses.

export interface GmailAccount {
  email: string;
  displayName: string;
  avatarInitials: string;
  status: SyncStatus;
  lastSync: string; // ISO timestamp
  totalImported: number;
  todayImported: number;
}

export const GMAIL_ACCOUNT: GmailAccount = {
  email: "pm@masar-construction.sa",
  displayName: "Mohammed Al-Rashid",
  avatarInitials: "MR",
  status: "idle",
  lastSync: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 min ago
  totalImported: 247,
  todayImported: 12,
};

export interface ImportedEmail {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  subjectAr?: string;
  time: string;
  projectId: string;
  aiSummary: string;
  aiSummaryAr: string;
  priority: Priority;
  attachments: string[];
  status: "imported" | "mapped" | "needs-review";
  importedAt: string;
}

export const IMPORTED_EMAILS: ImportedEmail[] = [
  {
    id: "em-001",
    sender: "Khalid Al-Otaibi",
    senderEmail: "k.otaibi@consultant-firm.sa",
    subject: "RFI #47 — Concrete Mix Specification Zone B",
    subjectAr: "طلب معلومات رقم 47 — مواصفات خلطة الخرسانة المنطقة ب",
    time: "2026-08-05T09:14:00Z",
    projectId: "proj-001",
    aiSummary:
      "Consultant requests clarification on the concrete mix design for Zone B columns — specifically water-cement ratio and admixture type. Response required before Thursday pour schedule.",
    aiSummaryAr:
      "يطلب الاستشاري توضيحاً بشأن تصميم خلطة الخرسانة لأعمدة المنطقة ب — وتحديداً نسبة الماء إلى الإسمنت ونوع المضافات. مطلوب الرد قبل جدول الصب يوم الخميس.",
    priority: "high",
    attachments: ["RFI-47-form.pdf", "Zone-B-structural.dwg"],
    status: "mapped",
    importedAt: "2026-08-05T09:16:23Z",
  },
  {
    id: "em-002",
    sender: "Salma Hussain",
    senderEmail: "s.hussain@balady.gov.sa",
    subject: "Building Permit Amendment — Floor 12 to 18",
    subjectAr: "تعديل رخصة البناء — الطوابق من 12 إلى 18",
    time: "2026-08-05T08:30:00Z",
    projectId: "proj-001",
    aiSummary:
      "Municipality approved the floor extension from 12 to 18 floors subject to revised structural drawings submission within 14 days. Permit amendment reference: BA-2026-3847.",
    aiSummaryAr:
      "وافقت البلدية على تمديد الطوابق من 12 إلى 18 طابقاً بشرط تقديم المخططات الإنشائية المعدّلة خلال 14 يوماً. مرجع تعديل الرخصة: BA-2026-3847.",
    priority: "high",
    attachments: ["permit-amendment-BA-2026-3847.pdf"],
    status: "needs-review",
    importedAt: "2026-08-05T08:33:01Z",
  },
  {
    id: "em-003",
    sender: "Ahmed Bin Saad",
    senderEmail: "ahmed@contractor-group.sa",
    subject: "Weekly Progress Report — Week 31",
    subjectAr: "تقرير التقدم الأسبوعي — الأسبوع 31",
    time: "2026-08-04T17:00:00Z",
    projectId: "proj-001",
    aiSummary:
      "Contractor reports 78% completion on floor 13 slab. MEP coordination meeting requested for next Monday. Crane maintenance scheduled Aug 8–9 will affect lifting operations.",
    aiSummaryAr:
      "يُفيد المقاول بإتمام 78% من بلاطة الطابق 13. يُطلب اجتماع تنسيق كهروميكانيكية الاثنين القادم. صيانة الرافعة المجدولة 8–9 أغسطس ستؤثر على عمليات الرفع.",
    priority: "medium",
    attachments: ["week31-progress.pdf", "week31-photos.zip"],
    status: "imported",
    importedAt: "2026-08-04T17:04:55Z",
  },
  {
    id: "em-004",
    sender: "Rania Al-Jasser",
    senderEmail: "r.jasser@pmconsult.sa",
    subject: "Submittal Review — Steel Reinforcement Shop Drawings",
    subjectAr: "مراجعة المستند المُقدَّم — مخططات تصنيع حديد التسليح",
    time: "2026-08-04T14:22:00Z",
    projectId: "proj-002",
    aiSummary:
      "PMC reviewed and conditionally approved the rebar shop drawings for Zone C villas. 3 comments require contractor response before final approval. Revise and resubmit within 5 days.",
    aiSummaryAr:
      "راجع استشاري الإدارة مخططات تصنيع حديد التسليح لفلل المنطقة ج واعتمدها بصورة مشروطة. 3 ملاحظات تستوجب رد المقاول قبل الاعتماد النهائي. مطلوب التعديل وإعادة التقديم خلال 5 أيام.",
    priority: "medium",
    attachments: ["rebar-shop-dwg-rev2.pdf", "PMC-comments.docx"],
    status: "mapped",
    importedAt: "2026-08-04T14:25:33Z",
  },
  {
    id: "em-005",
    sender: "Faris Al-Qahtani",
    senderEmail: "faris@contractor-group.sa",
    subject: "Safety Incident Report — Scaffold Fall, Zone A",
    subjectAr: "تقرير حادثة السلامة — سقوط سقالة، المنطقة أ",
    time: "2026-08-03T11:05:00Z",
    projectId: "proj-001",
    aiSummary:
      "Minor scaffold section failure at Zone A, Level 8. No injuries. Section isolated and inspected. Full scaffold inspection by safety officer scheduled tomorrow. Regulatory report filed.",
    aiSummaryAr:
      "انهيار طفيف في قسم من السقالة في المنطقة أ، المستوى 8. لا إصابات. القسم معزول وخاضع للفحص. فحص شامل للسقالة من قبل مسؤول السلامة مجدول غداً. تم تقديم التقرير التنظيمي.",
    priority: "high",
    attachments: ["incident-report-Aug03.pdf"],
    status: "needs-review",
    importedAt: "2026-08-03T11:09:22Z",
  },
  {
    id: "em-006",
    sender: "Nora Al-Shammari",
    senderEmail: "nora@interiors.sa",
    subject: "Material Approval — Italian Marble Lobby Flooring",
    subjectAr: "اعتماد مواد — بلاط الرخام الإيطالي لبهو المدخل",
    time: "2026-08-03T09:50:00Z",
    projectId: "proj-003",
    aiSummary:
      "Interior design team requests approval for Calacatta Oro marble samples (3 options) for lobby flooring. Lead time is 14 weeks from Italy — approval needed this week to maintain fit-out schedule.",
    aiSummaryAr:
      "يطلب فريق التصميم الداخلي اعتماد عينات رخام كالاكاتا أورو (3 خيارات) لأرضية البهو. مدة التوريد 14 أسبوعاً من إيطاليا — الاعتماد مطلوب هذا الأسبوع للحفاظ على جدول التشطيبات.",
    priority: "medium",
    attachments: ["marble-samples-catalog.pdf", "sample-A.jpg", "sample-B.jpg"],
    status: "imported",
    importedAt: "2026-08-03T09:53:47Z",
  },
];

// ─── Unified Timeline Events ───────────────────────────────────────────────────
// Future channels (whatsapp, site-photo, etc.) will push items into this same
// TimelineEvent shape. The UI renders all channels identically.

export interface TimelineEvent {
  id: string;
  time: string; // ISO
  channel: SourceChannel;
  projectId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  aiSummary: string;
  aiSummaryAr: string;
  priority: Priority;
  verification: VerifiedStatus;
  attachments: string[];
  // For gmail channel — links back to the email record
  emailId?: string;
  sender?: string;
  senderEmail?: string;
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "tl-001",
    time: "2026-08-05T09:14:00Z",
    channel: "gmail",
    projectId: "proj-001",
    title: "RFI #47 — Concrete Mix Specification",
    titleAr: "طلب معلومات رقم 47 — مواصفة الخلطة الخرسانية",
    description: "Consultant requests concrete mix spec clarification for Zone B pour.",
    descriptionAr: "يطلب الاستشاري توضيح مواصفات خلطة الخرسانة لصب المنطقة ب.",
    aiSummary: "Critical RFI blocking Thursday concrete pour. Consultant needs water-cement ratio and admixture details for Zone B columns. 2 attachments.",
    aiSummaryAr: "طلب معلومات حرج يعرقل صب الخرسانة يوم الخميس. الاستشاري يحتاج نسبة الماء/الإسمنت وتفاصيل المضافات لأعمدة المنطقة ب. مرفقان.",
    priority: "high",
    verification: "pending",
    attachments: ["RFI-47-form.pdf", "Zone-B-structural.dwg"],
    emailId: "em-001",
    sender: "Khalid Al-Otaibi",
    senderEmail: "k.otaibi@consultant-firm.sa",
  },
  {
    id: "tl-002",
    time: "2026-08-05T08:30:00Z",
    channel: "gmail",
    projectId: "proj-001",
    title: "Permit Amendment Approved — Floors 12–18",
    titleAr: "تعديل رخصة البناء معتمد — الطوابق 12–18",
    description: "Municipality approved floor extension. Revised drawings required within 14 days.",
    descriptionAr: "وافقت البلدية على تمديد الطوابق. المخططات المعدّلة مطلوبة خلال 14 يوماً.",
    aiSummary: "Major milestone: floor count increased 12→18. Deadline for revised structural drawings is Aug 19. Reference BA-2026-3847.",
    aiSummaryAr: "معلم رئيسي: عدد الطوابق ارتفع من 12 إلى 18. الموعد النهائي للمخططات المعدّلة 19 أغسطس. مرجع BA-2026-3847.",
    priority: "high",
    verification: "verified",
    attachments: ["permit-amendment-BA-2026-3847.pdf"],
    emailId: "em-002",
    sender: "Salma Hussain",
    senderEmail: "s.hussain@balady.gov.sa",
  },
  {
    id: "tl-003",
    time: "2026-08-04T17:00:00Z",
    channel: "gmail",
    projectId: "proj-001",
    title: "Week 31 Progress Report",
    titleAr: "تقرير تقدم الأسبوع 31",
    description: "Contractor reports 78% completion on floor 13. Crane maintenance Aug 8–9.",
    descriptionAr: "المقاول يُفيد بإتمام 78% من الطابق 13. صيانة الرافعة 8–9 أغسطس.",
    aiSummary: "Progress on track. Key risk: crane downtime Aug 8–9 may delay floor 14 pour by 2 days. MEP coordination needed next week.",
    aiSummaryAr: "التقدم في مساره. خطر رئيسي: توقف الرافعة 8–9 أغسطس قد يؤخر صب الطابق 14 يومين. التنسيق الكهروميكانيكي مطلوب الأسبوع القادم.",
    priority: "medium",
    verification: "verified",
    attachments: ["week31-progress.pdf", "week31-photos.zip"],
    emailId: "em-003",
    sender: "Ahmed Bin Saad",
    senderEmail: "ahmed@contractor-group.sa",
  },
  {
    id: "tl-004",
    time: "2026-08-04T14:22:00Z",
    channel: "gmail",
    projectId: "proj-002",
    title: "Submittal Conditionally Approved — Rebar Shop Drawings",
    titleAr: "مستند مُقدَّم معتمد بصورة مشروطة — مخططات حديد التسليح",
    description: "PMC conditionally approved rebar drawings. 3 comments require contractor response.",
    descriptionAr: "استشاري الإدارة اعتمد مخططات حديد التسليح بصورة مشروطة. 3 ملاحظات تستوجب رد المقاول.",
    aiSummary: "3 open comments block final approval. Resubmit within 5 days. Delay risk if not resolved by Aug 9.",
    aiSummaryAr: "3 ملاحظات مفتوحة تعرقل الاعتماد النهائي. أعد التقديم خلال 5 أيام. خطر تأخير إذا لم تُحل بحلول 9 أغسطس.",
    priority: "medium",
    verification: "pending",
    attachments: ["rebar-shop-dwg-rev2.pdf", "PMC-comments.docx"],
    emailId: "em-004",
    sender: "Rania Al-Jasser",
    senderEmail: "r.jasser@pmconsult.sa",
  },
  {
    id: "tl-005",
    time: "2026-08-03T11:05:00Z",
    channel: "gmail",
    projectId: "proj-001",
    title: "Safety Incident — Scaffold Fall Zone A",
    titleAr: "حادثة سلامة — سقوط سقالة المنطقة أ",
    description: "Minor scaffold failure Level 8. No injuries. Full inspection scheduled.",
    descriptionAr: "انهيار طفيف في السقالة المستوى 8. لا إصابات. فحص شامل مجدول.",
    aiSummary: "No injuries. Section isolated. Full scaffold inspection tomorrow by certified safety officer. Regulatory report filed same day.",
    aiSummaryAr: "لا إصابات. القسم معزول. فحص السقالة الكامل غداً من قبل مسؤول سلامة معتمد. تم تقديم التقرير التنظيمي في نفس اليوم.",
    priority: "high",
    verification: "verified",
    attachments: ["incident-report-Aug03.pdf"],
    emailId: "em-005",
    sender: "Faris Al-Qahtani",
    senderEmail: "faris@contractor-group.sa",
  },
  {
    id: "tl-006",
    time: "2026-08-03T09:50:00Z",
    channel: "gmail",
    projectId: "proj-003",
    title: "Material Approval Request — Lobby Marble",
    titleAr: "طلب اعتماد مواد — رخام البهو",
    description: "Interior team requests approval for Calacatta Oro marble. 14-week lead time.",
    descriptionAr: "فريق التصميم يطلب اعتماد رخام كالاكاتا أورو. مدة توريد 14 أسبوعاً.",
    aiSummary: "14-week lead time from Italy means approval this week is critical to maintain fit-out schedule. 3 sample options attached.",
    aiSummaryAr: "مدة التوريد 14 أسبوعاً من إيطاليا تعني أن الاعتماد هذا الأسبوع حرج للحفاظ على جدول التشطيبات. 3 خيارات عينات مرفقة.",
    priority: "medium",
    verification: "pending",
    attachments: ["marble-samples-catalog.pdf", "sample-A.jpg", "sample-B.jpg"],
    emailId: "em-006",
    sender: "Nora Al-Shammari",
    senderEmail: "nora@interiors.sa",
  },
];

// ─── System Health ─────────────────────────────────────────────────────────────
// This is Module 15 (observability) — kept deliberately simple for project managers.
// No logs, no queues, no OAuth details, no latency graphs.

export interface ConnectorHealth {
  id: string;
  name: string;
  nameAr: string;
  available: boolean; // is this connector live yet?
  status: SyncStatus;
  statusLabel: string;
  statusLabelAr: string;
  lastSync?: string;
  emailsImported?: number;
  detail?: string;
  detailAr?: string;
}

export const SYSTEM_HEALTH: ConnectorHealth[] = [
  {
    id: "gmail",
    name: "Gmail",
    nameAr: "Gmail",
    available: true,
    status: "idle",
    statusLabel: "Connected · Syncing every 5 min",
    statusLabelAr: "متصل · مزامنة كل 5 دقائق",
    lastSync: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    emailsImported: 247,
    detail: "12 emails processed today · 0 errors",
    detailAr: "12 بريد مُعالَج اليوم · 0 أخطاء",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    nameAr: "واتساب",
    available: false,
    status: "disconnected",
    statusLabel: "Coming soon",
    statusLabelAr: "قريباً",
  },
  {
    id: "outlook",
    name: "Outlook",
    nameAr: "Outlook",
    available: false,
    status: "disconnected",
    statusLabel: "Coming soon",
    statusLabelAr: "قريباً",
  },
  {
    id: "balady",
    name: "Balady Portal",
    nameAr: "منصة بلدي",
    available: false,
    status: "disconnected",
    statusLabel: "Coming soon",
    statusLabelAr: "قريباً",
  },
  {
    id: "primavera",
    name: "Primavera P6",
    nameAr: "Primavera P6",
    available: false,
    status: "disconnected",
    statusLabel: "Coming soon",
    statusLabelAr: "قريباً",
  },
];

export interface AiProcessingStatus {
  status: "active" | "idle" | "error";
  processedToday: number;
  pendingReview: number;
}

export const AI_PROCESSING: AiProcessingStatus = {
  status: "active",
  processedToday: 12,
  pendingReview: 3,
};
