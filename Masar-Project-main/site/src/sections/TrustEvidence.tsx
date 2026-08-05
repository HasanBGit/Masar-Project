import { useTranslation } from "react-i18next";
import { Section } from "../components/Section";
import { Eyebrow } from "../components/Eyebrow";
import { SectionHeading } from "../components/SectionHeading";
import { Waypoint } from "../components/Waypoint";

const points = ["verified", "silence", "decennial"] as const;

export function TrustEvidence() {
  const { t } = useTranslation();

  return (
    <Section tone="darker" id="trust">
      <Waypoint />
      <Eyebrow tone="onDark">{t("trustEvidence.eyebrow")}</Eyebrow>
      <SectionHeading tone="onDark" className="max-w-[19ch]">
        {t("trustEvidence.heading")}
      </SectionHeading>
      <div className="mt-12 grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-[1.6rem]">
          {points.map((point) => (
            <div key={point} className="border-t border-paper/15 pt-[1.3rem]">
              <h3 className="font-display text-[1.02rem] font-bold text-paper">
                {t(`trustEvidence.points.${point}.title`)}
              </h3>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-text-navy-muted">
                {t(`trustEvidence.points.${point}.body`)}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-[28px] border border-gold/30 bg-paper/5 p-8">
          <div className="font-display text-5xl font-extrabold leading-none text-gold-soft">
            {t("trustEvidence.statValue")}
          </div>
          <p className="mt-4 text-[0.92rem] leading-relaxed text-text-navy-muted">
            {t("trustEvidence.statBody")}
            <sup className="text-gold">4</sup>
          </p>
          <cite className="mt-4 block font-mono text-[0.72rem] not-italic text-gold">
            {t("trustEvidence.citation")}
          </cite>
        </div>
      </div>
    </Section>
  );
}
