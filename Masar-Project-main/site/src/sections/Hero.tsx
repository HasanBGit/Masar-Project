import { useTranslation } from "react-i18next";
import { Container } from "../components/Section";
import { Eyebrow } from "../components/Eyebrow";
import { ButtonLink } from "../components/Button";
import { ConvergeVisual } from "./ConvergeVisual";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section
      id="top"
      className="relative overflow-hidden text-cream"
      style={{
        background:
          "radial-gradient(ellipse 90% 60% at 20% -10%, rgba(201,162,39,.14), transparent 60%), linear-gradient(180deg, #0F3B4D 0%, #0A2530 130%)",
      }}
    >
      <Container className="py-16 sm:py-24 md:py-28">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
          <div>
            <Eyebrow tone="onDark">{t("hero.eyebrow")}</Eyebrow>
            <h1 className="max-w-[15ch] font-display text-[clamp(2.35rem,4.6vw,3.75rem)] font-extrabold leading-[1.08] tracking-[-0.01em] text-paper">
              {t("hero.heading")}
            </h1>
            <p className="mt-[1.35rem] max-w-[52ch] text-[1.14rem] leading-[1.65] text-text-navy-muted">
              {t("hero.body")}
            </p>
            <div className="mt-[2.1rem] flex flex-wrap items-center gap-[0.9rem]">
              <ButtonLink href="#access">{t("common.requestEarlyAccess")}</ButtonLink>
              <a
                href="#workspace"
                className="inline-flex items-center gap-[0.4rem] py-[0.85rem] font-semibold text-gold-soft transition-colors hover:text-gold"
              >
                {t("hero.seeHowItWorks")}
              </a>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-paper/15 pt-8">
              <Stat value={t("hero.stat1Value")} label={t("hero.stat1Label")} note={1} />
              <Stat value={t("hero.stat2Value")} label={t("hero.stat2Label")} note={2} />
            </div>
          </div>
          <ConvergeVisual />
        </div>
      </Container>
    </section>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note: number }) {
  return (
    <div>
      <div className="font-display text-[2rem] font-extrabold leading-none text-gold-soft">{value}</div>
      <div className="mt-[0.4rem] max-w-[24ch] text-[0.84rem] leading-[1.45] text-text-navy-muted">
        {label}
        <sup className="text-gold">{note}</sup>
      </div>
    </div>
  );
}
