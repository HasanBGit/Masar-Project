import type { ReactNode } from "react";

export type SectionTone = "dark" | "darker" | "light" | "paper";

const toneClasses: Record<SectionTone, string> = {
  dark: "bg-navy text-cream",
  darker: "bg-navy-deep text-cream",
  light: "bg-cream text-text-cream",
  paper: "bg-paper text-text-cream",
};

type SectionProps = {
  id?: string;
  tone: SectionTone;
  children: ReactNode;
};

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-[1180px] px-5 sm:px-8 md:px-10 ${className}`}>{children}</div>
  );
}

export function Section({ id, tone, children }: SectionProps) {
  return (
    <section id={id} className={`py-16 sm:py-24 md:py-28 ${toneClasses[tone]}`}>
      <Container>{children}</Container>
    </section>
  );
}
