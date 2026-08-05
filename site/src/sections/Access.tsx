import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Section } from "../components/Section";
import { Eyebrow } from "../components/Eyebrow";
import { SectionHeading } from "../components/SectionHeading";
import { Waypoint } from "../components/Waypoint";
import { Button } from "../components/Button";

const fieldClasses =
  "rounded-[10px] border border-paper/20 bg-paper/[0.06] px-[0.9rem] py-[0.8rem] font-body text-[0.95rem] text-paper placeholder:text-paper/35 focus:border-transparent focus:outline focus:outline-2 focus:outline-gold focus:outline-offset-1";
const labelClasses = "text-[0.78rem] font-semibold tracking-[0.02em] text-text-navy-muted";

export function Access() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <Section tone="dark" id="access">
      <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <Waypoint />
          <Eyebrow tone="onDark">{t("access.eyebrow")}</Eyebrow>
          <SectionHeading tone="onDark" className="max-w-[19ch]">
            {t("access.heading")}
          </SectionHeading>
          <p className="mt-4 max-w-[52ch] text-[1.14rem] leading-[1.65] text-text-navy-muted">
            {t("access.body")}
          </p>
        </div>
        <div>
          {submitted ? (
            <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5 text-[0.92rem]">
              <strong className="text-gold-soft">{t("access.submittedStrong")}</strong>{" "}
              {t("access.submittedRest")}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="mb-[1.05rem] flex flex-col gap-[0.4rem]">
                  <label htmlFor="f-name" className={labelClasses}>
                    {t("access.form.fullName")}
                  </label>
                  <input
                    id="f-name"
                    type="text"
                    required
                    placeholder={t("access.form.fullNamePlaceholder")}
                    className={fieldClasses}
                  />
                </div>
                <div className="mb-[1.05rem] flex flex-col gap-[0.4rem]">
                  <label htmlFor="f-company" className={labelClasses}>
                    {t("access.form.company")}
                  </label>
                  <input
                    id="f-company"
                    type="text"
                    placeholder={t("access.form.companyPlaceholder")}
                    className={fieldClasses}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="mb-[1.05rem] flex flex-col gap-[0.4rem]">
                  <label htmlFor="f-role" className={labelClasses}>
                    {t("access.form.role")}
                  </label>
                  <select id="f-role" className={fieldClasses}>
                    <option>{t("access.form.roleOwnerInvestor")}</option>
                    <option>{t("access.form.roleDeveloper")}</option>
                    <option>{t("access.form.roleConsultant")}</option>
                    <option>{t("access.form.roleContractor")}</option>
                    <option>{t("access.form.roleOther")}</option>
                  </select>
                </div>
                <div className="mb-[1.05rem] flex flex-col gap-[0.4rem]">
                  <label htmlFor="f-email" className={labelClasses}>
                    {t("access.form.email")}
                  </label>
                  <input
                    id="f-email"
                    type="email"
                    required
                    placeholder={t("access.form.emailPlaceholder")}
                    className={fieldClasses}
                  />
                </div>
              </div>
              <Button type="submit" className="mt-[0.4rem] w-full justify-center">
                {t("common.requestEarlyAccess")}
              </Button>
              <p className="mt-4 text-[0.78rem] text-text-navy-muted">
                {t("access.form.disclaimer")}
              </p>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}
