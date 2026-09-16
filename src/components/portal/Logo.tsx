import { cn } from "@/lib/utils";

/**
 * Learnova brand mark: a rounded gradient badge holding a stylised "L"
 * built from a page with a folded bookmark corner.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Learnova"
      className={cn("size-9", className)}
    >
      <defs>
        <linearGradient id="learnova-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--sky)" />
          <stop offset="100%" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="48" rx="13" fill="url(#learnova-brand)" />
      <path
        d="M17 13.5h9.2c.5 0 .9.2 1.2.5l6.1 6.1c.3.3.5.8.5 1.2V32"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeOpacity="0.55"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 13.5V34.5h14"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31.4" cy="25.6" r="2.3" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  wordClassName,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-8", markClassName)} />
      <span
        className={cn(
          "font-display text-[17px] font-semibold tracking-tight text-foreground",
          wordClassName,
        )}
      >
        Learnova
      </span>
    </span>
  );
}
