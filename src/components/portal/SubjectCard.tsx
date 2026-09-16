import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { SubjectOverview } from "@/lib/portal-data";

export function SubjectCard({
  subject,
  counts,
  priority = false,
}: {
  subject: Pick<SubjectOverview, "name" | "slug" | "description" | "cover_url">;
  counts: { notes: number; pdfs: number; images: number; links: number; total: number };
  priority?: boolean;
}) {
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <Link
      to="/subjects/$slug"
      params={{ slug: subject.slug }}
      preload="intent"
      className="glass shadow-soft group flex flex-col overflow-hidden rounded-2xl border border-glass-border transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glass"
    >
      {subject.cover_url && !coverFailed ? (
        <img
          src={subject.cover_url}
          onError={() => setCoverFailed(true)}
          alt={`${subject.name} cover`}
          width={640}
          height={320}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div className="gradient-cool flex aspect-[16/9] w-full items-center justify-center">
          <span className="font-display text-4xl font-bold text-primary-foreground/90">
            {subject.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-lg font-semibold tracking-tight">{subject.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {subject.description || "No description yet."}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip>{counts.notes} Notes</Chip>
          <Chip>{counts.pdfs} PDFs</Chip>
          <Chip>{counts.images} Images</Chip>
          <Chip>{counts.links} Links</Chip>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-glass-border pt-4">
          <span className="text-sm font-medium text-muted-foreground">
            {counts.total} material{counts.total === 1 ? "" : "s"}
          </span>
          <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-glass-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

const toneClass = {
  sky: "bg-sky/10 text-sky",
  violet: "bg-violet/10 text-violet",
  cyan: "bg-cyan/15 text-foreground",
  emerald: "bg-emerald/15 text-emerald",
} as const;

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof toneClass;
  children: React.ReactNode;
}) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}>
      {children}
    </span>
  );
}
