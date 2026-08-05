import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import type { Project } from '../../lib/types'

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
      'Dear Masar Team,\n\nPlease refer to drawing ST-104 regarding Zone B column specs. We require the exact admixture supplier certificate and water-cement ratio calculation by Wednesday 5 PM to approve Thursday morning pour.\n\nRegards,\nKhalid Al-Otaibi',
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

export function EmailIntegrationsPage({ project }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('connection')
  const [emails, setEmails] = useState<ExtractedEmail[]>(INITIAL_EMAILS)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<ExtractedEmail | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [syncInterval, setSyncInterval] = useState('5m')

  const pendingCount = useMemo(() => emails.filter((e) => e.status === 'pending').length, [emails])

  function handleSyncNow() {
    setIsSyncing(true)
    setTimeout(() => {
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
    }, 1200)
  }

  function handleAction(id: string, action: 'approve' | 'dismiss') {
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action === 'approve' ? 'approved' : 'dismissed' } : item)),
    )
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
      {/* Header Banner following Saudi / Masar Design System */}
      <div className="relative overflow-hidden rounded-[var(--radius-l)] border border-gold/30 bg-navy-deep p-6 text-cream shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold-ink">
                <Sparkles size={13} /> Main Feature · Gmail OAuth 2.0
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active Connection
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
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing Gmail...' : 'Sync Gmail Now'}
            </button>
            {pendingCount > 0 && (
              <button
                onClick={() => setActiveTab('extraction')}
                className="flex items-center gap-2 rounded-[var(--radius-s)] border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                <span>{pendingCount} Items Needing Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-cream/60">Connected Email</div>
            <div className="mt-0.5 truncate font-mono text-sm font-semibold text-gold">pm@masar-construction.sa</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-cream/60">Emails Processed Today</div>
            <div className="mt-0.5 text-sm font-bold text-white">12 Emails</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-cream/60">AI Extraction Rate</div>
            <div className="mt-0.5 text-sm font-bold text-emerald-400">98.4% Confidence</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-cream/60">Linked RFIs & Records</div>
            <div className="mt-0.5 text-sm font-bold text-white">247 Total Items</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs bar for Email Integration sub-features */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-sand pb-1">
        <button
          onClick={() => setActiveTab('connection')}
          className={`flex items-center gap-2 rounded-[var(--radius-s)] px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'connection'
              ? 'bg-navy text-cream shadow-sm'
              : 'text-navy/60 hover:bg-navy/5 hover:text-navy'
          }`}
        >
          <Mail size={16} />
          1. Gmail Connection & OAuth
        </button>
        <button
          onClick={() => setActiveTab('extraction')}
          className={`flex items-center gap-2 rounded-[var(--radius-s)] px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'extraction'
              ? 'bg-navy text-cream shadow-sm'
              : 'text-navy/60 hover:bg-navy/5 hover:text-navy'
          }`}
        >
          <Zap size={16} />
          2. Live Extraction Pipeline
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-navy">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`flex items-center gap-2 rounded-[var(--radius-s)] px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'intelligence'
              ? 'bg-navy text-cream shadow-sm'
              : 'text-navy/60 hover:bg-navy/5 hover:text-navy'
          }`}
        >
          <Sparkles size={16} />
          3. AI Intelligence & Rules
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 rounded-[var(--radius-s)] px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'channels'
              ? 'bg-navy text-cream shadow-sm'
              : 'text-navy/60 hover:bg-navy/5 hover:text-navy'
          }`}
        >
          <Radio size={16} />
          4. Multi-Channel Feeds
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 rounded-[var(--radius-s)] px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'health'
              ? 'bg-navy text-cream shadow-sm'
              : 'text-navy/60 hover:bg-navy/5 hover:text-navy'
          }`}
        >
          <ShieldCheck size={16} />
          5. Sync Health & Webhooks
        </button>
      </div>

      {/* TAB 1: GMAIL CONNECTION & OAUTH */}
      {activeTab === 'connection' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-[var(--radius-m)] border border-sand bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="font-[var(--font-display)] text-lg font-bold text-navy">
                      Google Workspace / Gmail Account
                    </h3>
                    <p className="text-xs text-navy/60">OAuth 2.0 Verified Connection</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  ✓ Connected & Authorized
                </span>
              </div>

              <div className="mt-6 space-y-4 rounded-xl bg-cream p-4 text-sm text-navy">
                <div className="flex items-center justify-between border-b border-sand/60 pb-3">
                  <span className="text-navy/60">Connected Email Address:</span>
                  <span className="font-mono font-semibold text-navy">pm@masar-construction.sa</span>
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
                  <span className="font-semibold text-emerald-700">4 minutes ago</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-sand pt-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-navy">Auto Sync Email:</label>
                  <button
                    onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoSyncEnabled ? 'bg-gold' : 'bg-sand'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm text-navy">
                  <span className="text-navy/60">Interval:</span>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(e.target.value)}
                    className="rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1 text-sm font-semibold"
                  >
                    <option value="1m">Every 1 minute (Instant)</option>
                    <option value="5m">Every 5 minutes (Recommended)</option>
                    <option value="15m">Every 15 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-[var(--radius-m)] border border-sand bg-white p-6 shadow-sm">
              <h3 className="font-[var(--font-display)] text-base font-bold text-navy">
                Gmail Webhook & Pub/Sub Configuration
              </h3>
              <p className="mt-1 text-xs text-navy/60">
                Google Cloud Pub/Sub pushes incoming project emails instantly without waiting for polling intervals.
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-sand/80 bg-cream/50 p-3">
                  <div className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
                    Webhook Endpoint URL
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 font-mono text-xs text-navy">
                    <span className="truncate">https://api.masar-construction.sa/v1/webhooks/gmail/pubsub</span>
                    <button
                      onClick={() => alert('Webhook URL copied to clipboard')}
                      className="text-xs text-gold-ink hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-sand/80 p-3">
                    <span className="text-navy/60">Pub/Sub Topic ID:</span>
                    <div className="mt-0.5 font-mono font-semibold text-navy">projects/masar-prod/topics/gmail-events</div>
                  </div>
                  <div className="rounded-lg border border-sand/80 p-3">
                    <span className="text-navy/60">Push Subscription:</span>
                    <div className="mt-0.5 font-mono font-semibold text-navy">sub-gmail-masar-rt</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[var(--radius-m)] border border-sand bg-white p-6 shadow-sm">
              <h3 className="font-[var(--font-display)] text-base font-bold text-navy">Supported Email Signals</h3>
              <p className="mt-1 text-xs text-navy/60">AI automatically detects and categorizes these items:</p>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center gap-3 rounded-lg border border-sand/60 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold">
                    RFI
                  </div>
                  <div>
                    <div className="font-semibold text-navy">Requests for Information</div>
                    <div className="text-navy/60">Concrete specs, drawings, design clarifications</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-sand/60 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold">
                    SUB
                  </div>
                  <div>
                    <div className="font-semibold text-navy">Submittals & Shop Drawings</div>
                    <div className="text-navy/60">Rebar, MEP approvals, material catalogs</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-sand/60 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 font-bold">
                    SAF
                  </div>
                  <div>
                    <div className="font-semibold text-navy">Safety & Hazard Alerts</div>
                    <div className="text-navy/60">Scaffold checks, PPE notices, incident logs</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-sand/60 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold">
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
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-[var(--radius-m)] border border-sand bg-white p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
                <input
                  type="text"
                  placeholder="Search extracted emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-[var(--radius-s)] border border-sand bg-cream/30 pl-9 pr-3 py-1.5 text-sm text-navy placeholder:text-navy/40 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-navy">
                <Filter size={15} className="text-navy/50" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1.5 text-sm font-semibold"
                >
                  <option value="all">All Categories</option>
                  <option value="RFI">RFIs Only</option>
                  <option value="Permit">Building Permits</option>
                  <option value="Submittal">Submittals</option>
                  <option value="Safety">Safety Alerts</option>
                  <option value="Payment">Payment Claims</option>
                </select>
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
                    ? 'border-amber-400/80 bg-gradient-to-r from-amber-50/40 via-white to-white shadow-sm'
                    : 'border-sand bg-white hover:border-sand/90'
                }`}
              >
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.category === 'RFI'
                            ? 'bg-blue-100 text-blue-800'
                            : item.category === 'Permit'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.category === 'Safety'
                            ? 'bg-red-100 text-red-800'
                            : item.category === 'Payment'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {item.category}
                      </span>

                      <span className="flex items-center gap-1 text-xs font-semibold text-navy/60">
                        <Sparkles size={12} className="text-gold" /> {item.confidence}% AI Confidence
                      </span>

                      {item.priority === 'high' && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                          <AlertTriangle size={12} /> High Priority
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-navy/50">
                      <span>{item.time}</span>
                      <span>·</span>
                      <span
                        className={`font-semibold uppercase tracking-wider ${
                          item.status === 'pending'
                            ? 'text-amber-600'
                            : item.status === 'approved'
                            ? 'text-emerald-600'
                            : 'text-navy/40'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <h4 className="mt-3 font-[var(--font-display)] text-base font-bold text-navy">{item.subject}</h4>
                  <p className="text-xs font-semibold text-gold-ink">{item.subjectAr}</p>

                  <div className="mt-2 text-xs text-navy/60">From: {item.sender}</div>

                  {/* AI Extracted Summary box */}
                  <div className="mt-3 rounded-xl border border-sand/80 bg-cream/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                      <Sparkles size={14} className="text-gold" /> Extracted Construction Summary:
                    </div>
                    <p className="mt-1 text-sm text-navy">{item.summary}</p>
                    <p className="mt-1 text-xs text-navy/70 dir-rtl">{item.summaryAr}</p>
                  </div>

                  {item.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-navy/70">
                      <span className="font-semibold text-navy/50">Attachments:</span>
                      {item.attachments.map((att, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 rounded-md border border-sand bg-white px-2 py-1 font-mono text-[11px]"
                        >
                          <FileText size={12} className="text-navy/40" /> {att}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand/60 pt-3">
                    <button
                      onClick={() => setSelectedEmail(item)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-gold-ink"
                    >
                      <Eye size={14} /> Preview Email & AI JSON Payload
                    </button>

                    {item.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(item.id, 'dismiss')}
                          className="flex items-center gap-1.5 rounded-[var(--radius-s)] border border-sand px-3 py-1.5 text-xs font-semibold text-navy/70 hover:bg-cream"
                        >
                          <X size={14} /> Dismiss
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'approve')}
                          className="flex items-center gap-1.5 rounded-[var(--radius-s)] bg-navy px-3.5 py-1.5 text-xs font-semibold text-cream shadow-sm hover:bg-navy-deep"
                        >
                          <Check size={14} /> Approve & Link to Project Record
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={14} /> Linked to Project Record
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
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[var(--radius-m)] border border-sand bg-white p-6 shadow-sm">
            <h3 className="font-[var(--font-display)] text-lg font-bold text-navy flex items-center gap-2">
              <Sparkles size={20} className="text-gold" /> Extraction Pipeline Architecture
            </h3>
            <p className="mt-1 text-xs text-navy/60">
              How Gmail messages are transformed into structured Saudi/GCC construction data.
            </p>

            <div className="mt-6 space-y-4">
              <div className="relative pl-6 border-l-2 border-gold/40 space-y-4">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-navy">
                    1
                  </span>
                  <div className="font-bold text-sm text-navy">Gmail Webhook / OAuth Ingestion</div>
                  <div className="text-xs text-navy/60">Pulls MIME body, headers, and attachments securely via OAuth tokens.</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-navy">
                    2
                  </span>
                  <div className="font-bold text-sm text-navy">Heuristic Regex & Keyword Parser</div>
                  <div className="text-xs text-navy/60">Detects project IDs, RFI numbers, ZATCA e-invoices, and Saudi Balady permit IDs.</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-navy">
                    3
                  </span>
                  <div className="font-bold text-sm text-navy">Bilingual LLM Structural Extraction</div>
                  <div className="text-xs text-navy/60">Extracts concise English & Arabic summaries, urgency ratings, and required next steps.</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                    4
                  </span>
                  <div className="font-bold text-sm text-navy">Truepoint Audit Log Verification</div>
                  <div className="text-xs text-navy/60">Generates cryptographic hash for immutable compliance tracking across stakeholders.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-m)] border border-sand bg-white p-6 shadow-sm">
            <h3 className="font-[var(--font-display)] text-lg font-bold text-navy flex items-center gap-2">
              <Sliders size={20} className="text-navy/70" /> Extraction Confidence Thresholds
            </h3>
            <p className="mt-1 text-xs text-navy/60">Configure automatic approval rules for incoming email items.</p>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-navy">
                  <span>Auto-Approve High Confidence RFIs</span>
                  <span className="text-gold-ink font-bold">85% Confidence</span>
                </div>
                <input type="range" min="70" max="98" defaultValue="85" className="mt-2 w-full accent-gold" />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-navy">
                  <span>Safety Alert Escalation Sensitivity</span>
                  <span className="text-red-600 font-bold">Immediate Flag</span>
                </div>
                <input type="range" min="50" max="95" defaultValue="80" className="mt-2 w-full accent-red-600" />
              </div>

              <div className="rounded-xl bg-cream p-4 text-xs text-navy space-y-2">
                <div className="font-bold text-navy">Current Active Rules:</div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <Check size={14} /> Auto-link emails matching subject "RFI #[0-9]+" to RFI module.
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <Check size={14} /> Auto-extract ZATCA e-invoices directly into Contract & Payments.
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <Check size={14} /> Translate English summaries into Saudi Arabic (IBM Plex Sans Arabic).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MULTI-CHANNEL FEEDS */}
      {activeTab === 'channels' && (
        <div className="rounded-[var(--radius-m)] border border-sand bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-[var(--font-display)] text-lg font-bold text-navy">Unified Communication Stream</h3>
              <p className="text-xs text-navy/60">Gmail, WhatsApp Site Groups, and Field Logs in one timeline.</p>
            </div>
            <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy">3 Active Channels</span>
          </div>

          <div className="divide-y divide-sand/60">
            <div className="py-3 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <Mail size={16} />
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

            <div className="py-3 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Radio size={16} />
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

            <div className="py-3 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Building size={16} />
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
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[var(--radius-m)] border border-sand bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-[var(--font-display)] text-base font-bold text-navy">Connector Uptime & Status</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-sand p-3">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-red-500" />
                  <span className="font-bold text-navy">Gmail OAuth 2.0 API</span>
                </div>
                <span className="text-emerald-700 font-bold">100% Operational (18ms)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-sand p-3">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-emerald-500" />
                  <span className="font-bold text-navy">WhatsApp Business API</span>
                </div>
                <span className="text-amber-700 font-bold">Beta / Connected</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-sand p-3">
                <div className="flex items-center gap-2">
                  <Building size={16} className="text-blue-500" />
                  <span className="font-bold text-navy">Saudi Balady Portal API</span>
                </div>
                <span className="text-emerald-700 font-bold">Connected (Weekly Sync)</span>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-m)] border border-sand bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-[var(--font-display)] text-base font-bold text-navy">API Quotas & Usage</h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-navy font-semibold">
                  <span>Gmail Daily Request Limit</span>
                  <span>1,240 / 50,000 requests</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: '2.5%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-navy font-semibold">
                  <span>LLM Structural Extraction Tokens</span>
                  <span>145,200 / 1,000,000 tokens</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-gold" style={{ width: '14.5%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Email Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-deep/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sand pb-4">
              <div>
                <span className="text-xs font-bold text-gold-ink uppercase">Raw Email & Extraction Inspection</span>
                <h3 className="font-[var(--font-display)] text-lg font-bold text-navy">{selectedEmail.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="rounded-full p-2 text-navy/60 hover:bg-cream"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg bg-cream p-3 text-navy space-y-1">
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
                <h4 className="font-bold text-navy mb-1">Email Body Text</h4>
                <div className="rounded-lg border border-sand bg-white p-3 font-mono text-xs whitespace-pre-wrap text-navy/80">
                  {selectedEmail.rawBody}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-navy mb-1">AI Extracted JSON Schema</h4>
                <pre className="rounded-lg bg-navy p-3 font-mono text-[11px] text-amber-300 overflow-x-auto">
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
                className="rounded-[var(--radius-s)] border border-sand px-4 py-2 text-xs font-semibold text-navy"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
