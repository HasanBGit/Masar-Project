import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'ar' | 'ur' | 'hi'

const STORAGE_KEY = 'truepoint_lang'
const RTL_LANGS = new Set<Lang>(['ar', 'ur'])

export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: 'English',
  ar: 'العربية',
  ur: 'اردو',
  hi: 'हिन्दी',
}

/**
 * App-chrome dictionary (nav, header, common actions/states). Feature-page
 * body copy remains English for now; adding a key here localises it
 * everywhere it is rendered through t().
 */
const MESSAGES = {
  'nav.overview': { en: 'Overview', ar: 'نظرة عامة', ur: 'جائزہ', hi: 'अवलोकन' },
  'nav.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم', ur: 'ڈیش بورڈ', hi: 'डैशबोर्ड' },
  'nav.integrations': { en: 'Integrations & Signals', ar: 'التكاملات والإشارات', ur: 'انضمام اور سگنلز', hi: 'एकीकरण और संकेत' },
  'nav.email': { en: 'Gmail & Email Integrations', ar: 'تكامل Gmail والبريد الإلكتروني', ur: 'جی میل اور ای میل انضمام', hi: 'जीमेल और ईमेल एकीकरण' },
  'nav.trustGroup': { en: 'Trust & Approvals', ar: 'الثقة والاعتمادات', ur: 'اعتماد اور منظوریاں', hi: 'विश्वास और स्वीकृतियाँ' },
  'nav.trustEvidence': { en: 'Trust & Evidence', ar: 'الثقة والأدلة', ur: 'اعتماد اور شواہد', hi: 'विश्वास और साक्ष्य' },
  'nav.documents': { en: 'Documents & Schedule', ar: 'المستندات والجدول الزمني', ur: 'دستاویزات اور شیڈول', hi: 'दस्तावेज़ और अनुसूची' },
  'nav.rfis': { en: 'RFIs & Change Orders', ar: 'طلبات المعلومات وأوامر التغيير', ur: 'آر ایف آئیز اور تبدیلی کے احکامات', hi: 'RFI और परिवर्तन आदेश' },
  'nav.contracts': { en: 'Contracts & Payments', ar: 'العقود والمدفوعات', ur: 'معاہدے اور ادائیگیاں', hi: 'अनुबंध और भुगतान' },
  'nav.contractPayments': { en: 'Contract & Payments', ar: 'العقد والمدفوعات', ur: 'معاہدہ اور ادائیگیاں', hi: 'अनुबंध और भुगतान' },
  'nav.handover': { en: 'Handover', ar: 'التسليم', ur: 'حوالگی', hi: 'हैंडओवर' },
  'nav.punchList': { en: 'Punch List & Defects', ar: 'قائمة الملاحظات والعيوب', ur: 'پنچ لسٹ اور خامیاں', hi: 'पंच लिस्ट और खामियाँ' },
  'nav.design': { en: 'Design & Drawings', ar: 'التصميم والمخططات', ur: 'ڈیزائن اور نقشے', hi: 'डिज़ाइन और चित्र' },
  'nav.drawingsStudio': { en: 'Drawings Studio', ar: 'استوديو المخططات', ur: 'ڈرائنگ اسٹوڈیو', hi: 'ड्रॉइंग स्टूडियो' },
  'nav.admin': { en: 'Administration', ar: 'الإدارة', ur: 'انتظامیہ', hi: 'प्रशासन' },
  'nav.accessControl': { en: 'Access Control', ar: 'التحكم بالوصول', ur: 'رسائی کا کنٹرول', hi: 'अभिगम नियंत्रण' },
  'nav.platformApi': { en: 'Platform API', ar: 'واجهة برمجة المنصة', ur: 'پلیٹ فارم اے پی آئی', hi: 'प्लेटफ़ॉर्म एपीआई' },
  'nav.internal': { en: 'Truepoint Internal', ar: 'الداخلية — Truepoint', ur: 'Truepoint اندرونی', hi: 'Truepoint आंतरिक' },
  'nav.observability': { en: 'Observability', ar: 'الرصد والمراقبة', ur: 'نگرانی', hi: 'निगरानी' },
  'nav.docs': { en: 'Documentation', ar: 'التوثيق', ur: 'دستاویزات', hi: 'दस्तावेज़ीकरण' },

  'title.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم', ur: 'ڈیش بورڈ', hi: 'डैशबोर्ड' },
  'title.email': { en: 'Gmail & Email Integrations', ar: 'تكامل Gmail والبريد الإلكتروني', ur: 'جی میل اور ای میل انضمام', hi: 'जीमेल और ईमेल एकीकरण' },
  'title.trustEvidence': { en: 'Trust & Evidence', ar: 'الثقة والأدلة', ur: 'اعتماد اور شواہد', hi: 'विश्वास और साक्ष्य' },
  'title.contractPayments': { en: 'Site Payments', ar: 'التحقق من العقود والمدفوعات', ur: 'معاہدہ اور ادائیگی کی تصدیق', hi: 'अनुबंध और भुगतान सत्यापन' },
  'title.rfis': { en: 'RFIs & Change Orders', ar: 'طلبات المعلومات وأوامر التغيير', ur: 'آر ایف آئیز اور تبدیلی کے احکامات', hi: 'RFI और परिवर्तन आदेश' },
  'title.handover': { en: 'Handover & Post-Handover', ar: 'التسليم وما بعده', ur: 'حوالگی اور مابعد حوالگی', hi: 'हैंडओवर और पोस्ट-हैंडओवर' },
  'title.drawingsStudio': { en: 'Drawings Studio', ar: 'استوديو المخططات', ur: 'ڈرائنگ اسٹوڈیو', hi: 'ड्रॉइंग स्टूडियो' },
  'title.accessControl': { en: 'Security & Access Control', ar: 'الأمان والتحكم بالوصول', ur: 'سیکیورٹی اور رسائی کا کنٹرول', hi: 'सुरक्षा और अभिगम नियंत्रण' },
  'title.platformApi': { en: 'Platform API', ar: 'واجهة برمجة المنصة', ur: 'پلیٹ فارم اے پی آئی', hi: 'प्लेटफ़ॉर्म एपीआई' },
  'title.observability': { en: 'Monitoring & Observability', ar: 'الرصد والمراقبة', ur: 'نگرانی اور مشاہدہ', hi: 'निगरानी और ऑब्ज़र्वेबिलिटी' },
  'title.decision': { en: 'Decision', ar: 'القرار', ur: 'فیصلہ', hi: 'निर्णय' },

  'chrome.skipToContent': { en: 'Skip to content', ar: 'تخطَّ إلى المحتوى', ur: 'مواد پر جائیں', hi: 'सामग्री पर जाएँ' },
  'chrome.switchProject': { en: 'Switch project', ar: 'تبديل المشروع', ur: 'پروجیکٹ تبدیل کریں', hi: 'प्रोजेक्ट बदलें' },
  'chrome.signOut': { en: 'Sign out', ar: 'تسجيل الخروج', ur: 'سائن آؤٹ', hi: 'साइन आउट' },
  'chrome.userMenu': { en: 'User menu', ar: 'قائمة حسابك', ur: 'صارف مینو', hi: 'उपयोगकर्ता मेनू' },
  'chrome.openNav': { en: 'Open navigation', ar: 'فتح القائمة', ur: 'نیویگیشن کھولیں', hi: 'नेविगेशन खोलें' },
  'chrome.closeNav': { en: 'Close navigation', ar: 'إغلاق القائمة', ur: 'نیویگیشن بند کریں', hi: 'नेविगेशन बंद करें' },
  'chrome.language': { en: 'Language', ar: 'اللغة', ur: 'زبان', hi: 'भाषा' },
  'chrome.languageLabel': { en: 'Change language', ar: 'تغيير اللغة', ur: 'زبان تبدیل کریں', hi: 'भाषा बदलें' },

  'common.loading': { en: 'Loading…', ar: 'جارٍ التحميل…', ur: 'لوڈ ہو رہا ہے…', hi: 'लोड हो रहा है…' },
  'common.retry': { en: 'Retry', ar: 'حاوِل مجددًا', ur: 'دوبارہ کوشش کریں', hi: 'फिर से प्रयास करें' },
  'common.cancel': { en: 'Cancel', ar: 'إلغاء', ur: 'منسوخ کریں', hi: 'रद्द करें' },
  'common.confirm': { en: 'Confirm', ar: 'تأكيد', ur: 'تصدیق کریں', hi: 'पुष्टि करें' },
  'common.close': { en: 'Close', ar: 'إغلاق', ur: 'بند کریں', hi: 'बंद करें' },
  'common.error': { en: 'Something went wrong', ar: 'حدث خطأ ما. حاوِل مجددًا.', ur: 'کچھ غلط ہو گیا', hi: 'कुछ गलत हो गया' },

  'auth.tagline': { en: 'Sign in to your project workspace', ar: 'سجِّل دخولك إلى مساحة مشروعك', ur: 'اپنے پروجیکٹ ورک اسپیس میں سائن ان کریں', hi: 'अपने प्रोजेक्ट वर्कस्पेस में साइन इन करें' },
  'auth.email': { en: 'Email', ar: 'البريد الإلكتروني', ur: 'ای میل', hi: 'ईमेल' },
  'auth.password': { en: 'Password', ar: 'كلمة المرور', ur: 'پاس ورڈ', hi: 'पासवर्ड' },
  'auth.signIn': { en: 'Sign in', ar: 'تسجيل الدخول', ur: 'سائن ان کریں', hi: 'साइन इन करें' },
  'auth.signingIn': { en: 'Signing in…', ar: 'جارٍ تسجيل الدخول…', ur: 'سائن ان ہو رہا ہے…', hi: 'साइन इन हो रहा है…' },
  'auth.orDivider': { en: 'or', ar: 'أو', ur: 'یا', hi: 'या' },
  'auth.googleSignIn': { en: 'Continue with Google', ar: 'المتابعة بحساب Google', ur: 'Google کے ساتھ جاری رکھیں', hi: 'Google के साथ जारी रखें' },
  'auth.invalidCredentials': { en: 'Incorrect email or password.', ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', ur: 'ای میل یا پاس ورڈ غلط ہے۔', hi: 'ईमेल या पासवर्ड गलत है।' },
  'auth.googleError': { en: 'Could not sign in with Google. Please try again.', ar: 'تعذَّر تسجيل الدخول بحساب Google. حاوِل مجددًا.', ur: 'Google کے ساتھ سائن ان نہیں ہو سکا۔ دوبارہ کوشش کریں۔', hi: 'Google से साइन इन नहीं हो सका। कृपया फिर से प्रयास करें।' },

  'auth.heroTitle': {
    en: 'One verified record for every project decision.',
    ar: 'سجلٌّ واحد موثَّق لكل قرار في مشروعك.',
    ur: 'ہر پروجیکٹ فیصلے کے لیے ایک تصدیق شدہ ریکارڈ۔',
    hi: 'हर प्रोजेक्ट निर्णय के लिए एक सत्यापित रिकॉर्ड।',
  },
  'auth.heroSubtitle': {
    en: 'Every decision moves through three edges before it counts as agreed.',
    ar: 'كل قرار يمر بثلاث مراحل قبل أن يُعدَّ متفقًا عليه.',
    ur: 'ہر فیصلہ متفق تصور ہونے سے پہلے تین مراحل سے گزرتا ہے۔',
    hi: 'सहमत माने जाने से पहले हर निर्णय तीन चरणों से गुजरता है।',
  },
  'auth.edgeHearingLabel': { en: 'Hearing', ar: 'الاستماع', ur: 'سماعت', hi: 'सुनवाई' },
  'auth.edgeHearingHint': {
    en: 'A decision enters the queue the moment it is raised.',
    ar: 'يدخل القرار قائمة الانتظار فور طرحه.',
    ur: 'فیصلہ اٹھائے جاتے ہی قطار میں شامل ہو جاتا ہے۔',
    hi: 'उठाए जाते ही निर्णय कतार में शामिल हो जाता है।',
  },
  'auth.edgeUnderstandingLabel': { en: 'Understanding', ar: 'الفهم', ur: 'تفہیم', hi: 'समझ' },
  'auth.edgeUnderstandingHint': {
    en: 'High-stakes items need a teach-back before anyone signs off.',
    ar: 'البنود عالية الأهمية تحتاج إلى إعادة شرح قبل أن يوافق أي طرف.',
    ur: 'اہم نوعیت کے معاملات میں منظوری سے پہلے وضاحت دہرانا ضروری ہے۔',
    hi: 'अहम मामलों में मंजूरी से पहले समझाकर दोहराना जरूरी है।',
  },
  'auth.edgeAgreeingLabel': { en: 'Agreeing', ar: 'الموافقة', ur: 'اتفاق', hi: 'सहमति' },
  'auth.edgeAgreeingHint': {
    en: 'The accountable party signs off, on the record.',
    ar: 'الطرف المسؤول يوافق رسميًا، ويُسجَّل ذلك.',
    ur: 'ذمہ دار فریق باضابطہ طور پر منظوری دیتا ہے۔',
    hi: 'जिम्मेदार पक्ष औपचारिक रूप से मंजूरी देता है।',
  },
  'auth.heroFooter': {
    en: 'Built for Saudi and GCC construction projects.',
    ar: 'مصمَّم لمشاريع البناء في السعودية ودول الخليج.',
    ur: 'سعودی عرب اور خلیجی تعمیراتی منصوبوں کے لیے تیار کردہ۔',
    hi: 'सऊदी अरब और खाड़ी की निर्माण परियोजनाओं के लिए बनाया गया।',
  },
} as const

export type MessageKey = keyof typeof MESSAGES

interface LanguageState {
  lang: Lang
  dir: 'ltr' | 'rtl'
  setLang: (lang: Lang) => void
  t: (key: MessageKey) => string
}

const LanguageContext = createContext<LanguageState | null>(null)

function readStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'ar' || stored === 'en' || stored === 'ur' || stored === 'hi' ? stored : null
  } catch {
    return null
  }
}

function isLang(value: string | null | undefined): value is Lang {
  return value === 'en' || value === 'ar' || value === 'ur' || value === 'hi'
}

export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: string | null }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang() ?? (isLang(initialLang) ? initialLang : 'en'))

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLangState(next)
  }, [])

  const t = useCallback((key: MessageKey) => MESSAGES[key][lang], [lang])

  const value = useMemo<LanguageState>(
    () => ({ lang, dir: RTL_LANGS.has(lang) ? 'rtl' : 'ltr', setLang, t }),
    [lang, setLang, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageState {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
