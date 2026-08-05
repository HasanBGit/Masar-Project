import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

const baseClasses =
  "inline-flex items-center gap-2 rounded-full font-display font-bold text-[0.8rem] px-4 py-[0.6rem] sm:text-[0.95rem] sm:px-6 sm:py-[0.85rem] transition-transform duration-150 ease-out hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-[3px] bg-gold text-navy-deep hover:bg-gold-soft";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  className?: string;
};

export function ButtonLink({ children, className = "", ...rest }: ButtonLinkProps) {
  return (
    <a className={`${baseClasses} ${className}`} {...rest}>
      {children}
    </a>
  );
}

type ButtonSubmitProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
};

export function Button({ children, className = "", ...rest }: ButtonSubmitProps) {
  return (
    <button className={`${baseClasses} cursor-pointer ${className}`} {...rest}>
      {children}
    </button>
  );
}
