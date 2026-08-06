import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Zap,
  Sliders,
  Radio,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Sparkles,
  Building,
  Info,
  type LucideIcon,
} from 'lucide-react'
import type { Project } from '../../lib/types'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { SelectField, TextField } from '../../components/ui/Field'

interface Props {
  project: Project
}

type TabType = 'connection' | 'extraction' | 'intelligence' | 'channels' | 'health'

interface ExtractedEmail {
  id: string
  sender: string
  senderEmail: string
  subject: string
  subjectAr: string
  time: string
  category: 'RFI' | 'Permit' | 'Progress' | 'Submittal' | 'Safety' | 'Payment'
  summary: string
  summaryAr: string
  confidence: number
  priority: 'high' | 'medium' | 'low'
  attachments: string[]
  status: 'pending' | 'approved' | 'dismissed'
  rawBody: string
}

const INITIAL_EMAILS: ExtractedEmail[] = [
  {
    id: 'em-001',
    sender: 'Khalid Al-Otaibi (Saudi Structural Consultants)',
    senderEmail: 'k.otaibi@consultant-firm.sa',
    subject: 'RFI #47 — Concrete Mix Specification Zone B',
    subjectAr: 'طلب معلومات رقم 47 — مواصفات خلطة الخرسانة المنطقة ب',
    time: '10 mins ago',
    category: 'RFI',
    summary:
      'Consultant requests clarification on the concrete mix design for Zone B columns — specifically water-cement ratio and admixture type before Thursday pour.',
    summaryAr:
      'يطلب الاستشاري توضيحاً بشأن تصميم خلطة الخرسانة لأعمدة المنطقة ب — وتحديداً نسبة الماء إلى الإسمنت ونوع المضافات قبل صب يوم الخميس.',
    confidence: 96,
    priority: 'high',
    attachments: ['RFI-47-form.pdf', 'Zone-B-structural.dwg'],
    status: 'pending',
    rawBody:
      'Dear Site Team,\n\nPlease refer to drawing ST-104 regarding Zone B column specs. We require the exact admixture supplier certificate and water-cement ratio calculation by Wednesday 5 PM to approve Thursday morning pour.\n\nRegards,\nKhalid Al-Otaibi',
  },
  {
    id: 'em-002',
    sender: 'Salma Hussain (Riyadh Municipality / Balady)',
    senderEmail: 's.hussain@balady.gov.sa',
    subject: 'Building Permit Amendment — Floor 12 to 18 (Ref: BA-2026-3847)',
    subjectAr: 'تعديل رخصة البناء — الطوابق من 12 إلى 18 (مرجع: BA-2026-3847)',
    time: '45 mins ago',
    category: 'Permit',
    summary:
      'Municipality approved the floor extension from 12 to 18 floors subject to revised structural drawings submission within 14 days.',
    summaryAr:
      'وافقت البلدية على تمديد الطوابق من 12 إلى 18 طابقاً بشرط تقديم المخططات الإنشائية المعدّلة خلال 14 يوماً.',
    confidence: 98,
    priority: 'high',
    attachments: ['permit-amendment-BA-2026-3847.pdf'],
    status: 'pending',
    rawBody:
      'Official Permit Amendment Notice:\nApplication Ref: BA-2026-3847 for Project Tower Zone A.\nApproval Granted: Elevation upgrade to 18 floors approved under Saudi Building Code 2026.',
  },
  {
    id: 'em-003',
    sender: 'Faris Al-Qahtani (Safety Inspection Team)',
    senderEmail: 'faris@contractor-group.sa',
    subject: 'Safety Incident Report — Scaffold Inspection Level 8',
    subjectAr: 'تقرير حادثة السلامة — فحص السقالة المستوى 8',
    time: '2 hours ago',
    category: 'Safety',
    summary:
      'Minor scaffold section failure at Zone A, Level 8. No injuries reported. Section isolated and full safety audit requested.',
    summaryAr:
      'انهيار طفيف في قسم من السقالة في المنطقة أ، المستوى 8. لا إصابات. القسم معزول ومطلوب فحص شامل للسلامة.',
    confidence: 94,
    priority: 'high',
    attachments: ['incident-report-Aug05.pdf'],
    status: 'pending',
    rawBody:
      'Safety Signal Notice:\nDuring routine site check at 08:30 AM, a minor loose scaffold bracket was detected on Level 8. Area barricaded immediately.',
  },
  {
    id: 'em-004',
    sender: 'Rania Al-Jasser (PM Consult)',
    senderEmail: 'r.jasser@pmconsult.sa',
    subject: 'Submittal Review — Steel Reinforcement Shop Drawings',
    subjectAr: 'مراجعة المستند المُقدَّم — مخططات تصنيع حديد التسليح',
    time: 'Yesterday',
    category: 'Submittal',
    summary:
      'PMC reviewed and conditionally approved rebar shop drawings for Zone C. 3 comments require contractor response within 5 days.',
    summaryAr:
      'راجع استشاري الإدارة مخططات تصنيع حديد التسليح لفلل المنطقة ج واعتمدها بصورة مشروطة. 3 ملاحظات تستوجب رد المقاول.',
    confidence: 91,
    priority: 'medium',
    attachments: ['rebar-shop-dwg-rev2.pdf', 'PMC-comments.docx'],
    status: 'approved',
    rawBody:
      'Submittal #SUB-882 Status: Conditional Approval (Code B). Please revise rebar overlap details as per consultant markup in attached file.',
  },
  {
    id: 'em-005',
    sender: 'Tariq Al-Mansoor (Al-Mansoor Construction)',
    senderEmail: 'tariq@almansoor-const.sa',
    subject: 'Payment Application #3 — Foundation & Basement Slabs',
    subjectAr: 'مطالبة الدفعة رقم 3 — بلاطات الأساسات والقبو',
    time: '2 days ago',
    category: 'Payment',
    summary:
      'Contractor submitted interim payment application #3 for SAR 1,450,000 against verified milestone 3.2.',
    summaryAr:
      'قدم المقاول مطالبة الدفعة المرحلية رقم 3 بقيمة 1,450,000 ريال سعودي مقابل المرحلة المعالمية 3.2.',
    confidence: 97,
    priority: 'medium',
    attachments: ['PayApp-3-statement.pdf', 'ZATCA-VAT-invoice.pdf'],
    status: 'approved',
    rawBody:
      'Payment Valuation Request:\nInterim Valuation #3 for work executed through July 31, 2026. ZATCA compliant e-invoice included.',
  },
]

const WEBHOOK_URL = 'https://api.truepoint.sa/v1/webhooks/gmail/pubsub'

const TABS: { id: TabType; label: string; icon: LucideIcon }[] = [
  { id: 'connection', label: '1. Gmail Connection & OAuth', icon: Mail },
  { id: 'extraction', label: '2. Live Extraction Pipeline', icon: Zap },
  { id: 'intelligence', label: '3. AI Intelligence & Rules', icon: Sparkles },
  { id: 'channels', label: '4. Multi-Channel Feeds', icon: Radio },
  { id: 'health', label: '5. Sync Health & Webhooks', icon: ShieldCheck },
]

const CATEGORY_BADGE: Record<ExtractedEmail['category'], string> = {
  RFI: 'bg-status-understanding/10 text-status-understanding',
  Permit: 'bg-status-agreeing/10 text-status-agreeing',
  Safety: 'bg-status-escalated/10 text-status-escalated',
  Payment: 'bg-status-hearing/10 text-status-hearing',
  Submittal: 'bg-gold/15 text-gold-ink',
  Progress: 'bg-gold/15 text-gold-ink',
}

export function EmailIntegrationsPage({ project }: Props) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('connection')
  const [emails, setEmails] = useState<ExtractedEmail[]>(INITIAL_EMAILS)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<ExtractedEmail | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [syncInterval, setSyncInterval] = useState('5m')
  const [demoNoticeDismissed, setDemoNoticeDismissed] = useState(false)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const webhookUrlRef = useRef<HTMLSpanElement | null>(null)
  const syncTimeoutRef = useRef<number | null>(null)

  // The simulated sync uses a timeout; clear it on unmount so it can't fire
  // setState against an unmounted page.
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current !== null) window.clearTimeout(syncTimeoutRef.current)
    }
  }, [])

  const pendingCount = useMemo(() => emails.filter((e) => e.status === 'pending').length, [emails])

  function handleSyncNow() {
    if (isSyncing) return
    setIsSyncing(true)
    syncTimeoutRef.current = window.setTimeout(() => {
      syncTimeoutRef.current = null
      setIsSyncing(false)
      // Add a fresh mock email to show real-time extraction working!
      const newEmail: ExtractedEmail = {
        id: `em-${Date.now()}`,
        sender: 'Ahmad Al-Subaie (Civil Defense Inspector)',
        senderEmail: 'a.subaie@998.gov.sa',
        subject: 'Fire Safety NOC Clearance Certificate Approved',
        subjectAr: 'شهادة عدم مانع للسلامة من الحريق معتمدة',
        time: 'Just now',
        category: 'Permit',
        summary: 'Civil Defense approved the site fire safety plan and emergency egress layout for Tower A.',
        summaryAr: 'اعتمد الدفاع المدني خطة السلامة من الحريق ومسارات الهروب في حالات الطوارئ للبرج أ.',
        confidence: 99,
        priority: 'high',
        attachments: ['civil-defense-noc-2026.pdf'],
        status: 'pending',
        rawBody: 'Civil Defense Inspection Result: Pass. Safety clearance reference CD-2026-8841 issued.',
      }
      setEmails((prev) => [newEmail, ...prev])
      toast.success('Sample inbox synced — 1 new item extracted.')
    }, 1200)
  }

  function handleAction(id: string, action: 'approve' | 'dismiss') {
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action === 'approve' ? 'approved' : 'dismissed' } : item)),
    )
    if (action === 'approve') toast.success('Item approved and linked to the project record (demo).')
    else toast.success('Item dismissed (demo).')
  }

  async function handleCopyWebhookUrl() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(WEBHOOK_URL)
        toast.success('Webhook URL copied to clipboard.')
        return
      }
      // No async clipboard available: select the URL text so a manual
      // Ctrl/Cmd+C works, and say so.
      const node = webhookUrlRef.current
      const selection = window.getSelection()
      if (node && selection) {
        const range = document.createRange()
        range.selectNodeContents(node)
        selection.removeAllRanges()
        selection.addRange(range)
        toast.error('Clipboard unavailable — the URL is selected, press Ctrl+C (or Cmd+C) to copy it.')
      } else {
        toast.error('Could not copy the webhook URL.')
      }
    } catch {
      toast.error('Could not copy the webhook URL.')
    }
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const current = TABS.findIndex((t) => t.id === activeTab)
    let next = -1
    if (e.key === 'ArrowRight') next = (current + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next === -1) return
    e.preventDefault()
    setActiveTab(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  const filteredEmails = useMemo(() => {
    return emails.filter((e) => {
      const matchSearch =
        e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.summary.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [emails, searchQuery, categoryFilter])

  return (
    <div className="space-y-6">
      {/* Demo disclosure: everything on this page runs on sample data. */}
      {!demoNoticeDismissed && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[var(--radius-m)] border border-status-understanding/30 bg-status-understanding/5 p-4 text-navy"
        >
          <Info size={18} className="mt-0.5 shrink-0 text-status-understanding" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Demo preview — sample data, not connected to your account</p>
            <p className="mt-0.5 text-xs text-navy/70">
              The inbox items, connection details, OAuth scopes, and webhook endpoints below are illustrative sample
              content. Nothing on this page reads from or writes to a real mailbox.
            </p>
          </div>
          <button
            onClick={() => setDemoNoticeDismissed(true)}
            aria-label="Dismiss demo notice"
            className="shrink-0 rounded-[var(--radius-s)] p-1.5 text-navy/50 transition hover:bg-navy/5 hover:text-navy"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Header Banner following Truepoint Design System */}
      <div className="relative overflow-hidden rounded-[var(--radius-l)] border border-gold/30 bg-navy-deep p-6 text-cream shadow-xl">
        <div className="pointer-events-none absolute -end-16 -top-16 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold-soft">
                <Sparkles size={13} aria-hidden="true" /> Main Feature · Gmail OAuth 2.0
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-status-agreeing/30 px-2.5 py-1 text-xs font-medium text-cream">
                <span className="h-2 w-2 animate-pulse rounded-full bg-status-agreeing" aria-hidden="true" /> Sample
                Connection
              </span>
            </div>
            <h1 className="mt-2 font-[var(--font-display)] text-2xl font-bold text-white sm:text-3xl">
              Gmail & Email Integrations
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-cream/70">
              Automatically extract construction RFIs, Submittals, Pay Applications, and Safety Signals directly from
              your project Gmail inbox into {project.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-[var(--radius-s)] bg-gold px-4 py-2.5 text-sm font-bold text-navy shadow-lg transition hover:bg-gold-ink hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} aria-hidden="true" />
              {isSyncing ? 'Syncing Gmail...' : 'Sync Gmail Now'}
            </button>
            {pendingCount > 0 && (
              <button
                onClick={() => setActiveTab('extraction')}
                className="flex items-center gap-2 rounded-[var(--radius-s)] border border-gold-soft/40 bg-gold-soft/10 px-4 py-2.5 text-sm font-semibold text-gold-soft transition hover:bg-gold-soft/20"
              >
                <span>{pendingCount} Items Needing Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
          <div className="rounded-[var(--radius-s)] bg-white/5 p-3">
            <div className="text-xs text-cream/60">Connected Email</div>
            <div className="mt-0.5 truncate font-mono text-sm font-semibold text-gold">pm@yourproject.sa</div>
          </div>
          <div className="rounded-[var(--radius-s)] bg-white/5 p-3">
            <div className="text-xs text-cream/60">Emails Processed Today</div>
            <div className="mt-0.5 text-sm font-bold text-white">12 Emails</div>
          </div>
          <div className="rounded-[var(--radius-s)] bg-white/5 p-3">
            <div className="text-xs text-cream/60">AI Extraction Rate</div>
            <div className="mt-0.5 text-sm font-bold text-gold-soft">98.4% Confidence</div>
          </div>
          <div className="rounded-[var(--radius-s)] bg-white/5 p-3">
            <div className="text-xs text-cream/60">Linked RFIs & Records</div>
            <div className="mt-0.5 text-sm font-bold text-white">247 Total Items</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs bar for Email Integration sub-features */}
      <div
        role="tablist"
        aria-label="Email integration sections"
        className="flex items-center gap-2 overflow-x-auto border-b border-sand pb-1"
      >
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={onTabKeyDown}
            className={`flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-s)] px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id ? 'bg-navy text-cream shadow-sm' : 'text-navy/60 hover:bg-navy/5 hover:text-navy'
            }`}
          >
            <tab.icon size={16} aria-hidden="true" />
            {tab.label}
            {tab.id === 'extraction' && pendingCount > 0 && (
              <span className="rounded-full bg-status-hearing px-2 py-0.5 text-xs font-bold text-cream">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: GMAIL CONNECTION & OAUTH */}
      {activeTab === 'connection' && (
        <div role="tabpanel" id="panel-connection" aria-labelledby="tab-connection" className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-[var(--radius-m)] border border-sand bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-s)] bg-status-escalated/10 text-status-escalated">
                    <Mail size={24} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">
                      Google Workspace / Gmail Account
                    </h2>
                    <p className="text-xs text-navy/60">OAuth 2.0 Verified Connection (sample)</p>
                  </div>
                </div>
                <span className="rounded-full bg-status-agreeing/10 px-3 py-1 text-xs font-bold text-status-agreeing">
                  <span aria-hidden="true">✓</span> Connected & Authorized
                </span>
              </div>

              <div className="mt-6 space-y-4 rounded-[var(--radius-s)] bg-cream p-4 text-sm text-navy">
                <div className="flex items-center justify-between border-b border-sand/60 pb-3">
                  <span className="text-navy/60">Connected Email Address:</span>
                  <span className="font-mono font-semibold text-navy">pm@yourproject.sa</span>
                </div>
                <div className="flex items-center justify-between border-b border-sand/60 pb-3">
                  <span className="text-navy/60">Account Holder:</span>
                  <span className="font-semibold text-navy">Mohammed Al-Rashid (Project Manager)</span>
                </div>
                <div className="flex items-center justify-between border-b border-sand/60 pb-3">
                  <span className="text-navy/60">Granted OAuth Scope:</span>
                  <span className="font-mono text-xs text-navy/80">https://www.googleapis.com/auth/gmail.readonly</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-navy/60">Last Background Sync:</span>
                  <span className="font-semibold text-status-agreeing">4 minutes ago</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-sand pt-4">
                <div className="flex items-center gap-2">
                  <span id="auto-sync-label" className="text-sm font-semibold text-navy">
                    Auto Sync Email:
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSyncEnabled}
                    aria-labelledby="auto-sync-label"
                    onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      autoSyncEnabled ? 'bg-gold' : 'bg-sand'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoSyncEnabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm text-navy">
                  <span className="text-navy/60" aria-hidden="true">
                    Interval:
                  </span>
                  <div className="w-60">
                    <SelectField
                      label="Sync interval"
                      hideLabel
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(e.target.value)}
                      className="py-1 font-semibold"
                    >
                      <option value="1m">Every 1 minute (Instant)</option>
                      <option value="5m">Every 5 minutes (Recommended)</option>
                      <option value="15m">Every 15 minutes</option>
                    </SelectField>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[var(--radius-m)] border border-sand bg-white p-5 shadow-sm transition hover:shadow-md">
              <h2 className="font-[var(--font-display)] text-base font-bold text-navy">
                Gmail Webhook & Pub/Sub Configuration
              </h2>
              <p className="mt-1 text-xs text-navy/60">
                Google Cloud Pub/Sub pushes incoming project emails instantly without waiting for polling intervals.
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-[var(--radius-s)] border border-sand/80 bg-cream/50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-navy/50">
                    Webhook Endpoint URL (sample)
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 font-mono text-xs text-navy">
                    <span ref={webhookUrlRef} className="truncate">
                      {WEBHOOK_URL}
                    </span>
                    <button
                      onClick={handleCopyWebhookUrl}
                      className="text-xs font-semibold text-gold-ink transition hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-[var(--radius-s)] border border-sand/80 p-3">
                    <span className="text-navy/60">Pub/Sub Topic ID:</span>
                    <div className="mt-0.5 font-mono font-semibold text-navy">projects/truepoint-prod/topics/gmail-events</div>
                  </div>
                  <div className="rounded-[var(--radius-s)] border border-sand/80 p-3">
                    <span className="text-navy/60">Push Subscription:</span>
                    <div className="mt-0.5 font-mono font-semibold text-navy">sub-gmail-truepoint-rt</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[var(--radius-m)] border border-sand bg-white p-5 shadow-sm transition hover:shadow-md">
              <h2 className="font-[var(--font-display)] text-base font-bold text-navy">Supported Email Signals</h2>
              <p className="mt-1 text-xs text-navy/60">AI automatically detects and categorizes these items:</p>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center gap-3 rounded-[var(--radius-s)] border border-sand/60 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-s)] bg-status-understanding/10 font-bold text-status-understanding">
                    RFI
                  </div>
                  <div>
                    <div className="font-semibold text-navy">Requests for Information</div>
                    <div className="text-navy/60">Concrete specs, drawings, design clarifications</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[var(--radius-s)] border border-sand/60 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-s)] bg-gold/15 font-bold text-gold-ink">
                    SUB
                  </div>
                  <div>
                    <div className="font-semibold text-navy">Submittals & Shop Drawings</div>
                    <div className="text-navy/60">Rebar, MEP approvals, material catalogs</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[var(--radius-s)] border border-sand/60 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-s)] bg-status-escalated/10 font-bold text-status-escalated">
                    SAF
                  </div>
                  <div>
                    <div className="font-semibold text-navy">Safety & Hazard Alerts</div>
                    <div className="text-navy/60">Scaffold checks, PPE notices, incident logs</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[var(--radius-s)] border border-sand/60 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-s)] bg-status-agreeing/10 font-bold text-status-agreeing">
                    PAY
                  </div>
                  <div>
                    <div className="font-semibold text-navy">Payment Applications</div>
                    <div className="text-navy/60">ZATCA e-invoices, interim valuations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE EXTRACTION PIPELINE & REVIEW QUEUE */}
      {activeTab === 'extraction' && (
        <div role="tabpanel" id="panel-extraction" aria-labelledby="tab-extraction" className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-[var(--radius-m)] border border-sand bg-white p-5 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-navy/40"
                  aria-hidden="true"
                />
                <TextField
                  label="Search extracted emails"
                  hideLabel
                  type="search"
                  placeholder="Search extracted emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-cream/30 ps-9 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-navy">
                <Filter size={15} className="text-navy/50" aria-hidden="true" />
                <div className="w-44">
                  <SelectField
                    label="Filter by category"
                    hideLabel
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="font-semibold"
                  >
                    <option value="all">All Categories</option>
                    <option value="RFI">RFIs Only</option>
                    <option value="Permit">Building Permits</option>
                    <option value="Submittal">Submittals</option>
                    <option value="Safety">Safety Alerts</option>
                    <option value="Payment">Payment Claims</option>
                  </SelectField>
                </div>
              </div>
            </div>

            <div className="text-xs font-semibold text-navy/60">
              Showing {filteredEmails.length} of {emails.length} extracted items
            </div>
          </div>

          <div className="grid gap-4">
            {filteredEmails.map((item) => (
              <div
                key={item.id}
                className={`group rounded-[var(--radius-m)] border transition ${
                  item.status === 'pending'
                    ? 'border-status-hearing/50 bg-gradient-to-r from-status-hearing/5 via-white to-white shadow-sm'
                    : 'border-sand bg-white hover:border-sand/90'
                }`}
              >
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CATEGORY_BADGE[item.category]}`}>
                        {item.category}
                      </span>

                      <span className="flex items-center gap-1 text-xs font-semibold text-navy/60">
                        <Sparkles size={12} className="text-gold" aria-hidden="true" /> {item.confidence}% AI Confidence
                      </span>

                      {item.priority === 'high' && (
                        <span className="flex items-center gap-1 text-xs font-bold text-status-escalated">
                          <AlertTriangle size={12} aria-hidden="true" /> High Priority
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-navy/50">
                      <span>{item.time}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold uppercase tracking-wider ${
                          item.status === 'pending'
                            ? 'text-status-hearing'
                            : item.status === 'approved'
                            ? 'text-status-agreeing'
                            : 'text-navy/40'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-3 font-[var(--font-display)] text-base font-bold text-navy">{item.subject}</h3>
                  <p dir="rtl" lang="ar" className="text-xs font-semibold text-gold-ink">
                    {item.subjectAr}
                  </p>

                  <div className="mt-2 text-xs text-navy/60">From: {item.sender}</div>

                  {/* AI Extracted Summary box */}
                  <div className="mt-3 rounded-[var(--radius-s)] border border-sand/80 bg-cream/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                      <Sparkles size={14} className="text-gold" aria-hidden="true" /> Extracted Construction Summary:
                    </div>
                    <p className="mt-1 text-sm text-navy">{item.summary}</p>
                    <p dir="rtl" lang="ar" className="mt-1 text-xs text-navy/70">
                      {item.summaryAr}
                    </p>
                  </div>

                  {item.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-navy/70">
                      <span className="font-semibold text-navy/50">Attachments:</span>
                      {item.attachments.map((att) => (
                        <span
                          key={att}
                          className="flex items-center gap-1 rounded-[var(--radius-s)] border border-sand bg-white px-2 py-1 font-mono text-xs"
                        >
                          <FileText size={12} className="text-navy/40" aria-hidden="true" /> {att}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand/60 pt-3">
                    <button
                      onClick={() => setSelectedEmail(item)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-navy transition hover:text-gold-ink"
                    >
                      <Eye size={14} aria-hidden="true" /> Preview Email & AI JSON Payload
                    </button>

                    {item.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(item.id, 'dismiss')}
                          className="flex items-center gap-1.5 rounded-[var(--radius-s)] border border-sand px-3 py-1.5 text-xs font-semibold text-navy/70 transition hover:bg-cream"
                        >
                          <X size={14} aria-hidden="true" /> Dismiss
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'approve')}
                          className="flex items-center gap-1.5 rounded-[var(--radius-s)] bg-navy px-3.5 py-1.5 text-xs font-semibold text-cream shadow-sm transition hover:bg-navy-deep"
                        >
                          <Check size={14} aria-hidden="true" /> Approve & Link to Project Record
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-status-agreeing">
                        <CheckCircle2 size={14} aria-hidden="true" /> Linked to Project Record
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AI INTELLIGENCE & RULES */}
      {activeTab === 'intelligence' && (
        <div role="tabpanel" id="panel-intelligence" aria-labelledby="tab-intelligence" className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[var(--radius-m)] border border-sand bg-white p-5 shadow-sm transition hover:shadow-md">
            <h2 className="flex items-center gap-2 font-[var(--font-display)] text-lg font-bold text-navy">
              <Sparkles size={20} className="text-gold" aria-hidden="true" /> Extraction Pipeline Architecture
            </h2>
            <p className="mt-1 text-xs text-navy/60">
              How Gmail messages are transformed into structured Saudi/GCC construction data.
            </p>

            <div className="mt-6 space-y-4">
              <div className="relative space-y-4 border-s-2 border-gold/40 ps-6">
                <div className="relative">
                  <span className="absolute -start-[33px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy">
                    1
                  </span>
                  <div className="text-sm font-bold text-navy">Gmail Webhook / OAuth Ingestion</div>
                  <div className="text-xs text-navy/60">Pulls MIME body, headers, and attachments securely via OAuth tokens.</div>
                </div>

                <div className="relative">
                  <span className="absolute -start-[33px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy">
                    2
                  </span>
                  <div className="text-sm font-bold text-navy">Heuristic Regex & Keyword Parser</div>
                  <div className="text-xs text-navy/60">Detects project IDs, RFI numbers, ZATCA e-invoices, and Saudi Balady permit IDs.</div>
                </div>

                <div className="relative">
                  <span className="absolute -start-[33px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy">
                    3
                  </span>
                  <div className="text-sm font-bold text-navy">Bilingual LLM Structural Extraction</div>
                  <div className="text-xs text-navy/60">Extracts concise English & Arabic summaries, urgency ratings, and required next steps.</div>
                </div>

                <div className="relative">
                  <span className="absolute -start-[33px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-status-agreeing text-xs font-bold text-cream">
                    4
                  </span>
                  <div className="text-sm font-bold text-navy">Truepoint Audit Log Verification</div>
                  <div className="text-xs text-navy/60">Generates cryptographic hash for immutable compliance tracking across stakeholders.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-m)] border border-sand bg-white p-5 shadow-sm transition hover:shadow-md">
            <h2 className="flex items-center gap-2 font-[var(--font-display)] text-lg font-bold text-navy">
              <Sliders size={20} className="text-navy/70" aria-hidden="true" /> Extraction Confidence Thresholds
            </h2>
            <p className="mt-1 text-xs text-navy/60">
              Preset approval rules for incoming email items (fixed in this demo preview).
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-navy">
                  <span>Auto-Approve High Confidence RFIs</span>
                  <span className="font-bold text-gold-ink">85% Confidence</span>
                </div>
                <div aria-hidden="true" className="mt-2 h-1.5 w-full rounded-full bg-sand/60">
                  <div className="h-1.5 rounded-full bg-gold" style={{ width: '54%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-navy">
                  <span>Safety Alert Escalation Sensitivity</span>
                  <span className="font-bold text-status-escalated">Immediate Flag</span>
                </div>
                <div aria-hidden="true" className="mt-2 h-1.5 w-full rounded-full bg-sand/60">
                  <div className="h-1.5 rounded-full bg-status-escalated" style={{ width: '67%' }} />
                </div>
              </div>

              <div className="space-y-2 rounded-[var(--radius-s)] bg-cream p-4 text-xs text-navy">
                <div className="font-bold text-navy">Current Active Rules:</div>
                <div className="flex items-center gap-2 text-status-agreeing">
                  <Check size={14} aria-hidden="true" /> Auto-link emails matching subject "RFI #[0-9]+" to RFI module.
                </div>
                <div className="flex items-center gap-2 text-status-agreeing">
                  <Check size={14} aria-hidden="true" /> Auto-extract ZATCA e-invoices directly into Contract & Payments.
                </div>
                <div className="flex items-center gap-2 text-status-agreeing">
                  <Check size={14} aria-hidden="true" /> Translate English summaries into Saudi Arabic (IBM Plex Sans Arabic).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MULTI-CHANNEL FEEDS */}
      {activeTab === 'channels' && (
        <div
          role="tabpanel"
          id="panel-channels"
          aria-labelledby="tab-channels"
          className="space-y-4 rounded-[var(--radius-m)] border border-sand bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Unified Communication Stream</h2>
              <p className="text-xs text-navy/60">Gmail, WhatsApp Site Groups, and Field Logs in one timeline.</p>
            </div>
            <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy">3 Active Channels</span>
          </div>

          <div className="divide-y divide-sand/60">
            <div className="flex items-start gap-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-s)] bg-status-escalated/10 text-status-escalated">
                <Mail size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-navy">Gmail · Khalid Al-Otaibi</span>
                  <span className="text-navy/40">10m ago</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-navy">RFI #47 Concrete Mix Spec</div>
                <div className="text-xs text-navy/60">Consultant needs water-cement ratio for Zone B column pour.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-s)] bg-status-agreeing/10 text-status-agreeing">
                <Radio size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-navy">WhatsApp Site Group · Eng. Tariq</span>
                  <span className="text-navy/40">35m ago</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-navy">Photo Update: Floor 14 Rebar Placement</div>
                <div className="text-xs text-navy/60">2 photos attached showing steel tying completed on grid lines C-F.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-s)] bg-status-understanding/10 text-status-understanding">
                <Building size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-navy">Balady Portal · Ministry Notification</span>
                  <span className="text-navy/40">2h ago</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-navy">Building Permit Amendment Issued</div>
                <div className="text-xs text-navy/60">Ref: BA-2026-3847 approved for 18 floor extension.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HEALTH & WEBHOOKS */}
      {activeTab === 'health' && (
        <div role="tabpanel" id="panel-health" aria-labelledby="tab-health" className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-[var(--radius-m)] border border-sand bg-white p-5 shadow-sm transition hover:shadow-md">
            <h2 className="font-[var(--font-display)] text-base font-bold text-navy">Connector Uptime & Status</h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-[var(--radius-s)] border border-sand p-3">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-status-escalated" aria-hidden="true" />
                  <span className="font-bold text-navy">Gmail OAuth 2.0 API</span>
                </div>
                <span className="font-bold text-status-agreeing">100% Operational (18ms)</span>
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-s)] border border-sand p-3">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-status-agreeing" aria-hidden="true" />
                  <span className="font-bold text-navy">WhatsApp Business API</span>
                </div>
                <span className="font-bold text-status-hearing">Beta / Connected</span>
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-s)] border border-sand p-3">
                <div className="flex items-center gap-2">
                  <Building size={16} className="text-status-understanding" aria-hidden="true" />
                  <span className="font-bold text-navy">Saudi Balady Portal API</span>
                </div>
                <span className="font-bold text-status-agreeing">Connected (Weekly Sync)</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[var(--radius-m)] border border-sand bg-white p-5 shadow-sm transition hover:shadow-md">
            <h2 className="font-[var(--font-display)] text-base font-bold text-navy">API Quotas & Usage</h2>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-navy">
                  <span>Gmail Daily Request Limit</span>
                  <span>1,240 / 50,000 requests</span>
                </div>
                <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-status-agreeing" style={{ width: '2.5%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold text-navy">
                  <span>LLM Structural Extraction Tokens</span>
                  <span>145,200 / 1,000,000 tokens</span>
                </div>
                <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-gold" style={{ width: '14.5%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Email Preview (shared Modal: dialog semantics, focus trap,
          Escape + backdrop close, scroll lock, focus restore). */}
      <Modal
        open={selectedEmail !== null}
        onClose={() => setSelectedEmail(null)}
        title="Raw Email & Extraction Inspection"
        variant="slideover"
        wide
      >
        {selectedEmail && (
          <div>
            <h3 className="font-[var(--font-display)] text-lg font-bold text-navy">{selectedEmail.subject}</h3>

            <div className="mt-4 space-y-4 text-xs">
              <div className="space-y-1 rounded-[var(--radius-s)] bg-cream p-3 text-navy">
                <div>
                  <strong className="text-navy/60">From:</strong> {selectedEmail.sender} &lt;
                  {selectedEmail.senderEmail}&gt;
                </div>
                <div>
                  <strong className="text-navy/60">Received:</strong> {selectedEmail.time}
                </div>
                <div>
                  <strong className="text-navy/60">Category:</strong> {selectedEmail.category}
                </div>
              </div>

              <div>
                <h4 className="mb-1 font-bold text-navy">Email Body Text</h4>
                <div className="whitespace-pre-wrap rounded-[var(--radius-s)] border border-sand bg-white p-3 font-mono text-xs text-navy/80">
                  {selectedEmail.rawBody}
                </div>
              </div>

              <div>
                <h4 className="mb-1 font-bold text-navy">AI Extracted JSON Schema</h4>
                <pre className="overflow-x-auto rounded-[var(--radius-s)] bg-navy p-3 font-mono text-xs text-gold-soft">
                  {JSON.stringify(
                    {
                      email_id: selectedEmail.id,
                      category: selectedEmail.category,
                      confidence_score: selectedEmail.confidence,
                      summary_en: selectedEmail.summary,
                      summary_ar: selectedEmail.summaryAr,
                      priority: selectedEmail.priority,
                      attachments: selectedEmail.attachments,
                      suggested_actions: [
                        'Link to RFI Module',
                        'Notify Project Manager',
                        'Generate Audit Proof Hash',
                      ],
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-sand pt-4">
              <button
                onClick={() => setSelectedEmail(null)}
                className="rounded-[var(--radius-s)] border border-sand px-4 py-2 text-xs font-semibold text-navy transition hover:bg-cream"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
