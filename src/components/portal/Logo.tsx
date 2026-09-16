import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  markClassName?: string;
};

export function LogoMark({ className, markClassName }: LogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "group/logo relative grid size-9 shrink-0 place-items-center rounded-xl border border-glass-border bg-card shadow-soft backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5",
        className,
      )}
    >
      <span className="absolute inset-1 rounded-lg bg-primary/10 blur-md" />
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className={cn("relative size-[62%] text-foreground", markClassName)}
      >
        <circle cx="20" cy="20" r="18" className="stroke-primary/25" strokeWidth="1" />
        <path
          d="M28 12c0 0-2-3-8-3s-8 4-8 7c0 5 16 3 16 8c0 3-2 7-8 7s-8-3-8-3"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 10.8c1.35-1.15 3.16-1.8 5.5-1.8"
          className="stroke-primary"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ className, markClassName }: LogoMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark {...(markClassName ? { markClassName } : {})} />
      <span className="font-display text-[17px] font-semibold">Syllable</span>
    </span>
  );
}