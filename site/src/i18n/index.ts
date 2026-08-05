import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import hi from "./locales/hi.json";
import ur from "./locales/ur.json";

export const supportedLanguages = ["en", "ar", "hi", "ur"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  ar: "العربية",
  hi: "हिन्दी",
  ur: "اردو",
};

// ar and ur are both Perso-Arabic-script, right-to-left languages.
export const rtlLanguages: SupportedLanguage[] = ["ar", "ur"];

function applyDocumentDirection(language: string) {
  const lang = (supportedLanguages as readonly string[]).includes(language) ? language : "en";
  document.documentElement.lang = lang;
  document.documentElement.dir = rtlLanguages.includes(lang as SupportedLanguage) ? "rtl" : "ltr";
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
