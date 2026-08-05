type LogoProps = {
  withWordmark?: boolean;
  className?: string;
};

export function Logo({ withWordmark = true, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-[0.55rem] ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="h-[26px] w-[26px] shrink-0"
      >
        <circle cx="24" cy="16" r="9" fill="#C9A227" />
        <path
          d="M10 29c4.5 9 23.5 9 28 0"
          stroke="#C9A227"
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {withWordmark && (
        <span className="font-display text-[1.15rem] font-extrabold text-paper">
          Truepoint
        </span>
      )}
    </span>
  );
}
