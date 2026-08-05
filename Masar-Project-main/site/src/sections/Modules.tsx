import { useTranslation } from "react-i18next";
import { Section } from "../components/Section";
import { Eyebrow } from "../components/Eyebrow";
import { SectionHeading } from "../components/SectionHeading";
import { Waypoint } from "../components/Waypoint";
import { modules, phaseOrder } from "../content/modules";

export function Modules() {
  const { t } = useTranslation();

  return (
    <Section tone="paper">
      <Waypoint />
      <Eyebrow tone="onLight">{t("modules.eyebrow")}</Eyebrow>
      <SectionHeading tone="onLight" className="max-w-[30ch]">
        {t("modules.heading")}
      </SectionHeading>
      <p className="mt-[1.1rem] max-w-[58ch] text-[1.05rem] leading-[1.65] opacity-90">
        {t("modules.body")}
      </p>

      <div className="mt-14 flex flex-col gap-14">
        {phaseOrder.map((phase) => {
          const items = modules.filter((m) => m.phase === phase);
          return (
            <div key={phase}>
              <h3 className="mb-5 font-mono text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-gold-ink">
                {t(`modules.phases.${phase}`)}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((mod) => (
                  <div
                    key={mod.number}
                    className="rounded-2xl border border-sand bg-paper p-5"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-[0.72rem] text-gold-ink">
                        {String(mod.number).padStart(2, "0")}
                      </span>
                      <span className="font-mono text-[0.62rem] text-text-cream/50">
                        {mod.skill}
                      </span>
                    </div>
                    <h4 className="font-display text-[0.96rem] font-bold leading-snug text-navy">
                      {t(`modules.items.${mod.number}.title`)}
                    </h4>
                    <p className="mt-2 text-[0.82rem] leading-[1.55] opacity-85">
                      {t(`modules.items.${mod.number}.summary`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
