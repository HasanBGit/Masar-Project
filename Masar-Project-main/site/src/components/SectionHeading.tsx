import type { ReactNode } from "react";

type SectionHeadingProps = {
  tone: "onDark" | "onLight";
  children: ReactNode;
  /** Always pass a max-w-[Nch] utility here — there's no built-in default,
   * so two competing arbitrary-value classes never fight for the cascade. */
  className: string;
};

export function SectionHeading({ tone, children, className }: SectionHeadingProps) {
  const color = tone === "onDark" ? "text-paper" : "text-navy";
  return (
    <h2
      className={`font-display text-[clamp(1.7rem,3.1vw,2.55rem)] font-bold leading-[1.16] tracking-[-0.01em] ${color} ${className}`}
    >
      {children}
    </h2>
  );
}
