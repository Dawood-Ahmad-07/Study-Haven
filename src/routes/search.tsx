import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Images, Link2, NotebookPen, Search as SearchIcon } from "lucide-react";
import { EmptyState, PortalShell } from "@/components/portal/PortalShell";
import { formatDate, searchQueryOptions } from "@/lib/portal-data";

type SearchParams = { q: string };

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search["q"] === "string" ? (search["q"] as string).slice(0, 100) : "",
  }),
  head: () => ({
    meta: [
      { title: "Search — Syllable Study Portal" },
      {
        name: "description",
        content: "Search across every subject, note, PDF, image and useful link in the portal.",
      },
      { property: "og:title", content: "Search — Syllable Study Portal" },
      {
        property: "og:description",
        content: "Search across every subject, note, PDF, image and useful link in the portal.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const term = q.trim();
  const { data, isLoading } = useQuery(searchQueryOptions(term));

  if (!term) {
    return (
      <PortalShell>
        <EmptyState
          icon={SearchIcon}
          title="Search the portal"
          description="Type a word in the search bar above to find subjects, notes, PDFs, images and links."
        />
      </PortalShell>
    );
  }

  if (isLoading || !data) {
    return (
      <PortalShell>
        <div className="glass h-56 animate-pulse rounded-3xl border border-glass-border" />
      </PortalShell>
    );
  }

  const index = data.subjectIndex;
  const subjectName = (id: string) => index[id]?.name ?? "Unknown subject";
  const subjectSlug = (id: string) => index[id]?.slug ?? "";

  const total =
    data.subjects.length + data.notes.length + data.files.length + data.links.length;

  return (
    <PortalShell>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Results for “{q}”
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {total} match{total === 1 ? "" : "es"} across the library
      </p>

      {total === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={SearchIcon}
            title="Nothing found"
            description="Try a different word, or browse the library to see everything available."
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {data.subjects.map((subject) => (
          <ResultRow
            key={`subject-${subject.id}`}
            icon={<NotebookPen className="size-4" />}
            kind="Subject"
            title={subject.name}
            detail={subject.description ?? ""}
            subject={subject.name}
            to={subject.slug}
          />
        ))}
        {data.notes.map((note) => (
          <ResultRow
            key={`note-${note.id}`}
            icon={<NotebookPen className="size-4" />}
            kind={note.topic ? `Note · ${note.topic}` : "Note"}
            title={note.title}
            detail={`${note.content.slice(0, 160)}${note.content.length > 160 ? "…" : ""}`}
            subject={subjectName(note.subject_id)}
            to={subjectSlug(note.subject_id)}
            meta={`Updated ${formatDate(note.updated_at)}`}
          />
        ))}
        {data.files.map((file) => (
          <ResultRow
            key={`file-${file.id}`}
            icon={file.kind === "pdf" ? <FileText className="size-4" /> : <Images className="size-4" />}
            kind={file.kind === "pdf" ? "PDF" : "Image"}
            title={file.title}
            detail={file.description ?? ""}
            subject={subjectName(file.subject_id)}
            to={subjectSlug(file.subject_id)}
          />
        ))}
        {data.links.map((link) => (
          <ResultRow
            key={`link-${link.id}`}
            icon={<Link2 className="size-4" />}
            kind="Link"
            title={link.title}
            detail={link.description ?? link.url}
            subject={subjectName(link.subject_id)}
            to={subjectSlug(link.subject_id)}
          />
        ))}
      </div>
    </PortalShell>
  );
}

function ResultRow({
  icon,
  kind,
  title,
  detail,
  subject,
  to,
  meta,
}: {
  icon: React.ReactNode;
  kind: string;
  title: string;
  detail: string;
  subject: string;
  to: string;
  meta?: string;
}) {
  return (
    <Link
      to="/subjects/$slug"
      params={{ slug: to }}
      preload="intent"
      className="glass shadow-glass flex items-start gap-4 rounded-3xl border border-glass-border p-5 transition-transform hover:-translate-y-1"
    >
      <span className="gradient-cool grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky/10 px-2.5 py-0.5 text-xs font-medium text-sky">
            {kind}
          </span>
          <span className="text-xs text-muted-foreground">in {subject}</span>
          {meta ? <span className="text-xs text-muted-foreground">· {meta}</span> : null}
        </span>
        <span className="mt-2 block font-display text-base font-semibold">{title}</span>
        {detail ? (
          <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </Link>
  );
}
