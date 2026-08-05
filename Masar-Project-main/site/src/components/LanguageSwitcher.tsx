import { useTranslation } from "react-i18next";

type LanguageSwitcherProps = {
  tone?: "onDark" | "onLight";
  className?: string;
};

export function LanguageSwitcher({ tone = "onDark", className = "" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.resolvedLanguage === "ar";
  const nextLanguage = isArabic ? "en" : "ar";
  const nextLabel = isArabic ? t("common.switchToEnglish") : t("common.switchToArabic");
  const border = tone === "onDark" ? "border-paper/25 text-paper" : "border-navy/25 text-navy";

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(nextLanguage)}
      aria-label={t("common.language")}
      className={`inline-flex items-center rounded-full border px-3 py-[0.4rem] font-mono text-[0.75rem] font-semibold tracking-[0.03em] transition-colors hover:border-gold hover:text-gold-soft ${border} ${className}`}
    >
      {nextLabel}
    </button>
  );
}
