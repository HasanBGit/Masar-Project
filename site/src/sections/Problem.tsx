import { useTranslation } from "react-i18next";
import { Section } from "../components/Section";
import { Eyebrow } from "../components/Eyebrow";
import { SectionHeading } from "../components/SectionHeading";
import { Waypoint } from "../components/Waypoint";
import { ChatIcon, MailIcon, PdfIcon, PhoneIcon } from "../components/icons";

const silos = [
  { key: "whatsapp", icon: ChatIcon },
  { key: "email", icon: MailIcon },
  { key: "pdf", icon: PdfIcon },
  { key: "phone", icon: PhoneIcon },
] as const;

export function Problem() {
  const { t } = useTranslation();

  return (
    <Section id="problem" tone="paper">
      <Waypoint />
      <Eyebrow tone="onLight">{t("problem.eyebrow")}</Eyebrow>
      <SectionHeading tone="onLight" className="max-w-[19ch]">
        {t("problem.heading")}
      </SectionHeading>
      <p className="mt-[1.1rem] max-w-[52ch] text-[1.14rem] leading-[1.65] opacity-90">
        {t("problem.body")}
        <sup className="text-gold-ink">3</sup>
      </p>
      <div className="mt-11 grid grid-cols-1 gap-[1.1rem] sm:grid-cols-2 lg:grid-cols-4">
        {silos.map((silo) => (
          <div key={silo.key} className="rounded-2xl border border-sand bg-paper p-6">
            <silo.icon className="mb-4 h-[26px] w-[26px] text-navy" />
            <h3 className="font-display text-[1.02rem] font-bold text-navy">
              {t(`problem.silos.${silo.key}.title`)}
            </h3>
            <p className="mt-2 text-[0.9rem] leading-relaxed opacity-85">
              {t(`problem.silos.${silo.key}.body`)}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
