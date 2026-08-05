import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import hi from "./locales/hi.json";
import ur from "./locales/ur.json";

// Languages with locale resources bundled. NOTE: the site UI (landing page and
// workspace demo) only offers English and Arabic — the landing content is
// authored as EN text + data-ar attributes and has no hi/ur translations, so
// `uiLanguages` below is what language switchers must cycle through. The hi/ur
// JSON files are kept for future use but are not user-selectable.
export const supportedLanguages = ["en", "ar", "hi", "ur"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

/** The languages the site UI actually lets users pick. */
export const uiLanguages = ["en", "ar"] as const;

export const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  ar: "العربية",
  hi: "हिन्दी",
  ur: "اردو",
};

// ar and ur are both Perso-Arabic-script, right-to-left languages. (ur stays
// listed even though it is not currently user-selectable — harmless, and
// correct if it ever becomes selectable.)
export const rtlLanguages: SupportedLanguage[] = ["ar", "ur"];

/** Normalizes a full locale code ("ar-SA", "en-GB") to a supported base code. */
export function toBaseLanguage(language: string | undefined): SupportedLanguage {
  const base = (language ?? "en").split("-")[0].toLowerCase();
  return (supportedLanguages as readonly string[]).includes(base) ? (base as SupportedLanguage) : "en";
}

/** Single owner of document.documentElement.lang/dir. Regional codes such as
 *  "ar-SA" are normalized to their base language instead of falling back to
 *  English/LTR. */
function applyDocumentDirection(language: string) {
  const lang = toBaseLanguage(language);
  document.documentElement.lang = lang;
  document.documentElement.dir = rtlLanguages.includes(lang) ? "rtl" : "ltr";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      hi: { translation: hi },
      ur: { translation: ur },
    },
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "truepoint-language",
      caches: ["localStorage"],
    },
    react: { useSuspense: false },
  });

applyDocumentDirection(i18n.resolvedLanguage ?? i18n.language);
i18n.on("languageChanged", applyDocumentDirection);

export default i18n;
