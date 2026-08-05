import { useTranslation } from "react-i18next";
import { Section } from "../components/Section";
import { Eyebrow } from "../components/Eyebrow";
import { SectionHeading } from "../components/SectionHeading";
import { Waypoint } from "../components/Waypoint";

const edges = [
  { number: 1, key: "hearing" },
  { number: 2, key: "understanding" },
  { number: 3, key: "agreeing" },
] as const;

export function Edges() {
  const { t } = useTranslation();

  return (
    <Section tone="dark">
      <Waypoint />
      <Eyebrow tone="onDark">{t("edges.eyebrow")}</Eyebrow>
      <SectionHeading tone="onDark" className="max-w-[24ch]">
        {t("edges.heading")}
      </SectionHeading>
      <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-3">
        {edges.map((edge) => (
          <div key={edge.number}>
            <div className="mb-[1.1rem] flex h-8 w-8 items-center justify-center rounded-full border border-gold/45 font-mono text-[0.78rem] text-gold">
              {edge.number}
            </div>
            <h3 className="font-display text-[1.15rem] font-bold text-paper">
              {t(`edges.items.${edge.key}.title`)}
            </h3>
            <p className="mt-[0.6rem] text-[0.92rem] leading-relaxed text-text-navy-muted">
              {t(`edges.items.${edge.key}.body`)}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
