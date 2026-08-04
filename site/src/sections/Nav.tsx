import { useTranslation } from "react-i18next";
import { Logo } from "../components/Logo";
import { Container } from "../components/Section";
import { ButtonLink } from "../components/Button";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export function Nav() {
  const { t } = useTranslation();

  const links = [
    { href: "#problem", label: t("nav.product") },
    { href: "#trust", label: t("nav.trustEvidence") },
    { href: "#culture", label: t("nav.howItFits") },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-paper/10 bg-navy/90 backdrop-blur-md">
      <Container className="flex items-center justify-between py-[0.9rem]">
        <a href="#top" aria-label={t("common.truepointHome")}>
          <Logo />
        </a>
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[0.92rem] font-medium text-text-navy-muted transition-colors hover:text-gold-soft"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4">
          <LanguageSwitcher tone="onDark" className="hidden sm:inline-flex" />
          <ButtonLink href="#access">{t("common.requestEarlyAccess")}</ButtonLink>
        </div>
      </Container>
    </nav>
  );
}
