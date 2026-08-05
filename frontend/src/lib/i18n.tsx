import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'ar'

const STORAGE_KEY = 'truepoint_lang'

/**
 * App-chrome dictionary (nav, header, common actions/states). Feature-page
 * body copy remains English for now; adding a key here localises it
 * everywhere it is rendered through t().
 */
const MESSAGES = {
  'nav.overview': { en: 'Overview', ar: 'نظرة عامة' },
  'nav.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'nav.integrations': { en: 'Integrations & Signals', ar: 'التكاملات والإشارات' },
  'nav.email': { en: 'Gmail & Email Integrations', ar: 'تكامل البريد الإلكتروني' },
  'nav.trustGroup': { en: 'Trust & Approvals', ar: 'الثقة والموافقات' },
  'nav.trustEvidence': { en: 'Trust & Evidence', ar: 'الثقة والأدلة' },
  'nav.documents': { en: 'Documents & Schedule', ar: 'المستندات والجدول الزمني' },
  'nav.rfis': { en: 'RFIs & Change Orders', ar: 'طلبات المعلومات وأوامر التغيير' },
  'nav.contracts': { en: 'Contracts & Payments', ar: 'العقود والمدفوعات' },
  'nav.contractPayments': { en: 'Contract & Payments', ar: 'العقد والمدفوعات' },
  'nav.handover': { en: 'Handover', ar: 'التسليم' },
  'nav.punchList': { en: 'Punch List & Defects', ar: 'قائمة الملاحظات والعيوب' },
  'nav.design': { en: 'Design & Drawings', ar: 'التصميم والمخططات' },
  'nav.drawingsStudio': { en: 'Drawings Studio', ar: 'استوديو المخططات' },
  'nav.admin': { en: 'Administration', ar: 'الإدارة' },
  'nav.accessControl': { en: 'Access Control', ar: 'التحكم بالوصول' },
  'nav.platformApi': { en: 'Platform API', ar: 'واجهة برمجة المنصة' },
  'nav.internal': { en: 'San3 Internal', ar: 'صنع الداخلية' },
  'nav.observability': { en: 'Observability', ar: 'المراقبة' },
  'nav.docs': { en: 'Documentation', ar: 'التوثيق' },

  'title.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'title.email': { en: 'Gmail & Email Integrations', ar: 'تكامل البريد الإلكتروني' },
  'title.trustEvidence': { en: 'Trust & Evidence', ar: 'الثقة والأدلة' },
  'title.contractPayments': { en: 'Contract & Payment Verification', ar: 'التحقق من العقود والمدفوعات' },
  'title.rfis': { en: 'RFIs & Change Orders', ar: 'طلبات المعلومات وأوامر التغيير' },
  'title.handover': { en: 'Handover & Post-Handover', ar: 'التسليم وما بعد التسليم' },
  'title.drawingsStudio': { en: 'Drawings Studio', ar: 'استوديو المخططات' },
  'title.accessControl': { en: 'Security & Access Control', ar: 'الأمان والتحكم بالوصول' },
  'title.platformApi': { en: 'Platform API', ar: 'واجهة برمجة المنصة' },
  'title.observability': { en: 'Monitoring & Observability', ar: 'الرصد والمراقبة' },
  'title.decision': { en: 'Decision', ar: 'القرار' },

  'chrome.skipToContent': { en: 'Skip to content', ar: 'تخطي إلى المحتوى' },
  'chrome.switchProject': { en: 'Switch project', ar: 'تبديل المشروع' },
  'chrome.signOut': { en: 'Sign out', ar: 'تسجيل الخروج' },
  'chrome.userMenu': { en: 'User menu', ar: 'قائمة المستخدم' },
  'chrome.openNav': { en: 'Open navigation', ar: 'فتح التنقل' },
  'chrome.closeNav': { en: 'Close navigation', ar: 'إغلاق التنقل' },
  'chrome.language': { en: 'العربية', ar: 'English' },
  'chrome.languageLabel': { en: 'Switch to Arabic', ar: 'التبديل إلى الإنجليزية' },

  'common.loading': { en: 'Loading…', ar: 'جارٍ التحميل…' },
  'common.retry': { en: 'Retry', ar: 'إعادة المحاولة' },
  'common.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'common.confirm': { en: 'Confirm', ar: 'تأكيد' },
  'common.close': { en: 'Close', ar: 'إغلاق' },
  'common.error': { en: 'Something went wrong', ar: 'حدث خطأ ما' },
} as const

export type MessageKey = keyof typeof MESSAGES

interface LanguageState {
  lang: Lang
  dir: 'ltr' | 'rtl'
  toggle: () => void
  setLang: (lang: Lang) => void
  t: (key: MessageKey) => string
}

const LanguageContext = createContext<LanguageState | null>(null)

function readStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'ar' || stored === 'en' ? stored : null
  } catch {
    return null
  }
}

export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: string | null }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang() ?? (initialLang === 'ar' ? 'ar' : 'en'))

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLangState(next)
  }, [])

  const toggle = useCallback(() => {
    setLang(lang === 'ar' ? 'en' : 'ar')
  }, [lang, setLang])

  const t = useCallback((key: MessageKey) => MESSAGES[key][lang], [lang])

  const value = useMemo<LanguageState>(
    () => ({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', toggle, setLang, t }),
    [lang, toggle, setLang, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageState {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
