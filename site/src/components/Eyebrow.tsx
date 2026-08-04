import type { ReactNode } from "react";

type EyebrowProps = {
  tone: "onDark" | "onLight";
  children: ReactNode;
};

export function Eyebrow({ tone, children }: EyebrowProps) {
  const color = tone === "onDark" ? "text-gold" : "text-gold-ink";
  return (
    <p
      className={`mb-[1.1rem] inline-flex items-center gap-2 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.14em] ${color}`}
    >
      {children}
    </p>
  );
}
