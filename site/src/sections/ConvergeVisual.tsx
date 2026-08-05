import { useTranslation } from "react-i18next";
import { useInView } from "../hooks/useInView";
import { ChatIcon, MailIcon, PdfIcon } from "../components/icons";

type ScrapDef = {
  key: "wa" | "mail" | "pdf";
  icon: typeof ChatIcon;
  /** Second line is fixed for "wa" — a real captured Arabic voice-note
   * transcript demonstrating the product's capture, not UI chrome, so it
   * doesn't translate with the rest of the page. */
  fixedSecondLine?: string;
  base: { top?: string; left?: string; right?: string; rotate: number };
  settled: { x: string; y: string };
};

const scraps: ScrapDef[] = [
  {
    key: "wa",
    icon: ChatIcon,
    fixedSecondLine: '"تم تركيب المواسير في الطابق الثاني"',
    base: { top: "6%", left: "2%", rotate: -9 },
    settled: { x: "6%", y: "150px" },
  },
  {
    key: "mail",
    icon: MailIcon,
    base: { top: "0%", right: "4%", rotate: 6 },
    settled: { x: "-10%", y: "158px" },
  },
  {
    key: "pdf",
    icon: PdfIcon,
    base: { top: "34%", left: "20%", rotate: -3 },
    settled: { x: "-2%", y: "150px" },
  },
];

export function ConvergeVisual() {
  const { t } = useTranslation();
  const { ref, inView } = useInView<HTMLDivElement>(0.4);

  return (
    <div ref={ref} className="relative h-[300px] md:h-[340px]">
      {scraps.map((scrap) => {
        const Icon = scrap.icon;
        const transform = inView
          ? `translate(${scrap.settled.x}, ${scrap.settled.y}) rotate(0deg)`
          : `rotate(${scrap.base.rotate}deg)`;
        const secondLine = scrap.fixedSecondLine ?? t(`convergeVisual.${scrap.key}.line2`);
        return (
          <div
            key={scrap.key}
            className="absolute flex w-[44vw] max-w-[190px] flex-col gap-[0.4rem] rounded-[10px] border border-paper/15 bg-paper/[0.06] p-[0.85rem_0.95rem] font-mono text-[0.72rem] text-text-navy-muted md:w-[198px]"
            style={{
              top: scrap.base.top,
              left: scrap.base.left,
              right: scrap.base.right,
              transform,
              opacity: inView ? 0 : 1,
              transition: "transform 1.1s cubic-bezier(.16,1,.3,1), opacity 1.1s ease",
            }}
          >
            <div className="flex items-center gap-[0.4rem] font-semibold tracking-[0.03em] text-gold-soft">
              <Icon className="h-[14px] w-[14px] shrink-0" />
              {t(`convergeVisual.${scrap.key}.head`)}
            </div>
            <div>{t(`convergeVisual.${scrap.key}.line1`)}</div>
            <div>{secondLine}</div>
          </div>
        );
      })}

      <div
        className="absolute inset-x-[2%] bottom-[6%] flex items-center gap-[0.85rem] rounded-2xl border border-gold/40 bg-navy-deep p-[1.1rem_1.25rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 1s ease .5s, transform 1s ease .5s",
        }}
      >
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-[22px] w-[22px] shrink-0">
          <circle cx="24" cy="16" r="9" fill="#C9A227" />
          <path d="M10 29c4.5 9 23.5 9 28 0" stroke="#C9A227" strokeWidth={5} strokeLinecap="round" fill="none" />
        </svg>
        <div className="min-w-0 flex-1">
          {/* Fixed — a real captured Arabic site message, not UI chrome. */}
          <div dir="rtl" className="font-arabic text-[0.98rem] font-medium text-paper">
            أحمد: تم صب الخرسانة — الطابق الثالث
          </div>
          <div className="mt-[0.3rem] font-mono text-[0.7rem] tracking-[0.02em] text-text-navy-muted">
            {t("convergeVisual.ahmedCaption")}
          </div>
        </div>
        <div className="whitespace-nowrap rounded-full border border-gold/50 px-[0.6rem] py-[0.3rem] font-mono text-[0.68rem] text-gold">
          {t("convergeVisual.verifiedBadge")}
        </div>
      </div>
    </div>
  );
}
