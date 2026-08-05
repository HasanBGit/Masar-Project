import { useTranslation } from "react-i18next";
import { Section } from "../components/Section";
import { Eyebrow } from "../components/Eyebrow";
import { SectionHeading } from "../components/SectionHeading";
import { Waypoint } from "../components/Waypoint";

const traits = ["attribution", "prayer", "softCommitment"] as const;

export function Culture() {
  const { t } = useTranslation();

  return (
    <Section tone="light" id="culture">
      <Waypoint />
      <Eyebrow tone="onLight">{t("culture.eyebrow")}</Eyebrow>
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
        <div>
          {/* Intentionally always Arabic — this is the term itself, not UI chrome that translates with the page. */}
          <div dir="rtl" className="font-arabic text-[3.2rem] font-bold leading-none text-gold">
            الواسطة
          </div>
          <div className="mt-[0.85rem] font-mono text-[0.78rem] tracking-[0.03em] text-navy/70">
            {t("culture.wastaCaption")}
          </div>
        </div>
        <div>
          <SectionHeading tone="onLight" className="max-w-[26ch]">
            {t("culture.heading")}
          </SectionHeading>
          <p className="mt-4 max-w-[52ch] text-[1.05rem] leading-[1.65] opacity-90">
            {t("culture.body")}
          </p>
          <div className="mt-8 flex flex-col gap-5">
            {traits.map((trait) => (
              <div key={trait} className="border-t border-sand pt-4">
                <h3 className="font-display text-[0.98rem] font-bold text-navy">
                  {t(`culture.traits.${trait}.title`)}
                </h3>
                <p className="mt-1.5 text-[0.88rem] leading-relaxed opacity-85">
                  {t(`culture.traits.${trait}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
