import { useTranslation } from "react-i18next";
import { Logo } from "../components/Logo";
import { Container } from "../components/Section";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export function Footer() {
  const { t } = useTranslation();

  const productLinks = [
    { href: "#problem", label: t("problem.eyebrow") },
    { href: "#trust", label: t("nav.trustEvidence") },
    { href: "#culture", label: t("nav.howItFits") },
  ];

  const companyLinks = [
    { href: "#access", label: t("common.requestEarlyAccess") },
    { href: "#top", label: t("footer.companyLinkSan3") },
  ];

  return (
    <footer className="bg-navy-deep py-16 pb-10 text-cream">
      <Container>
        <div className="grid grid-cols-1 gap-8 border-b border-paper/10 pb-10 md:grid-cols-[1.3fr_1fr_1fr] md:gap-10">
          <div>
            <a href="#top" aria-label={t("common.truepointHome")}>
              <Logo />
            </a>
            <p className="mt-[0.9rem] max-w-[32ch] text-[0.92rem] leading-[1.6] text-text-navy-muted">
              {t("footer.tagline")}
            </p>
            <LanguageSwitcher tone="onDark" className="mt-5" />
          </div>
          <FooterColumn title={t("footer.productTitle")} links={productLinks} />
          <FooterColumn title={t("footer.companyTitle")} links={companyLinks} />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-6 pt-7">
          <p className="max-w-[60ch] text-[0.72rem] leading-[1.9] text-paper/45">
            {t("footer.footnotes")}
          </p>
          <p className="text-right text-[0.75rem] text-paper/45 sm:text-left">
            {t("footer.lastUpdated")}
            <br />
            {t("footer.copyright")}
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="mb-4 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-gold">
        {title}
      </h4>
      <ul className="flex flex-col gap-[0.65rem]">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-[0.88rem] text-text-navy-muted transition-colors hover:text-gold-soft"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
