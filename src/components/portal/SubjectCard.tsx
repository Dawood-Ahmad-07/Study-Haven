import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
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
  return (
    <Link
      to="/subjects/$slug"
      params={{ slug: subject.slug }}
      preload="intent"
      className="glass shadow-glass group flex flex-col overflow-hidden rounded-3xl border border-glass-border transition-transform duration-300 hover:-translate-y-1"
    >
      {subject.cover_url ? (
        <img
          src={subject.cover_url}
          alt={`${subject.name} cover`}
          width={640}
          height={320}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="gradient-cool flex h-40 w-full items-center justify-center">
          <span className="font-display text-4xl font-bold text-primary-foreground/90">
            {subject.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold">{subject.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {subject.description || "No description yet."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="sky">{counts.notes} Notes</Badge>
          <Badge tone="violet">{counts.pdfs} PDFs</Badge>
          <Badge tone="cyan">{counts.images} Images</Badge>
          <Badge tone="emerald">{counts.links} Links</Badge>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-glass-border bg-secondary px-4 py-3">
          <span className="text-sm font-medium">
            {counts.total} material{counts.total === 1 ? "" : "s"}
          </span>
          <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
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
