import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Images,
  Link2,
  NotebookPen,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { EmptyState, PortalShell } from "@/components/portal/PortalShell";
import {
  countsFor,
  formatBytes,
  formatDate,
  portalQueryOptions,
  type MaterialFile,
} from "@/lib/portal-data";

export const Route = createFileRoute("/subjects/$slug")({
  head: ({ params }) => {
    const title = `${params.slug.replace(/-/g, " ")} — Syllable Study Portal`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "Notes, PDFs, study images and useful links for this subject.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "Notes, PDFs, study images and useful links for this subject.",
        },
      ],
    };
  },
  component: SubjectPage,
});

const TABS = [
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "pdfs", label: "PDFs", icon: FileText },
  { id: "images", label: "Images", icon: Images },
  { id: "links", label: "Useful Links", icon: Link2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function SubjectPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError } = useQuery(portalQueryOptions);
  const [tab, setTab] = useState<TabId>("notes");

  if (isLoading) {
    return (
      <PortalShell>
        <div className="glass h-72 animate-pulse rounded-3xl border border-glass-border" />
      </PortalShell>
    );
  }

  const subject = data?.subjects.find((item) => item.slug === slug);

  if (isError || !subject) {
    return (
      <PortalShell>
        <EmptyState
          icon={TriangleAlert}
          title="Subject not found"
          description="This subject may have been removed. Head back to the library to browse everything else."
        />
      </PortalShell>
    );
  }

  const counts = countsFor(data!, subject.id);
  const notes = data!.notes.filter((n) => n.subject_id === subject.id);
  const pdfs = data!.files.filter((f) => f.subject_id === subject.id && f.kind === "pdf");
  const images = data!.files.filter((f) => f.subject_id === subject.id && f.kind === "image");
  const links = data!.links.filter((l) => l.subject_id === subject.id);

  const tabCount: Record<TabId, number> = {
    notes: counts.notes,
    pdfs: counts.pdfs,
    images: counts.images,
    links: counts.links,
  };

  return (
    <PortalShell>
      <Link
        to="/library"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>

      <div className="glass shadow-glass overflow-hidden rounded-3xl border border-glass-border">
        {subject.cover_url ? (
          <img
            src={subject.cover_url}
            alt={`${subject.name} cover`}
            className="h-48 w-full object-cover sm:h-60"
          />
        ) : (
          <div className="gradient-cool h-32 w-full sm:h-40" />
        )}
        <div className="p-6 sm:p-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">{subject.name}</h1>
          {subject.description ? (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {subject.description}
            </p>
          ) : null}
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            {counts.total} material{counts.total === 1 ? "" : "s"} available
          </p>
        </div>
      </div>

      <div className="glass mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-glass-border p-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === item.id
                ? "gradient-brand text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
            <span className="text-xs opacity-70">{tabCount[item.id]}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "notes" ? (
          notes.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No notes yet"
              description="Notes for this subject will appear here once the author publishes them."
            />
          ) : (
            <div className="grid gap-5">
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="glass shadow-glass rounded-3xl border border-glass-border p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {note.topic ? (
                      <span className="rounded-full bg-sky/10 px-2.5 py-1 text-xs font-medium text-sky">
                        {note.topic}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDate(note.updated_at)}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-semibold">{note.title}</h2>
                  <div className="prose-note mt-3 whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
                    {note.content}
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}

        {tab === "pdfs" ? (
          pdfs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No PDFs yet"
              description="Uploaded PDF material for this subject will show up here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {pdfs.map((file) => (
                <FileRow key={file.id} file={file} />
              ))}
            </div>
          )
        ) : null}

        {tab === "images" ? (
          images.length === 0 ? (
            <EmptyState
              icon={Images}
              title="No study images yet"
              description="Diagrams and figures for this subject will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((file) => (
                <a
                  key={file.id}
                  href={file.view_url}
                  target="_blank"
                  rel="noreferrer"
                  className="glass shadow-glass group overflow-hidden rounded-3xl border border-glass-border transition-transform hover:-translate-y-1"
                >
                  <img
                    src={file.thumbnail_url ?? file.view_url}
                    alt={file.title}
                    loading="lazy"
                    className="h-44 w-full bg-secondary object-cover"
                  />
                  <div className="p-4">
                    <p className="text-sm font-semibold">{file.title}</p>
                    {file.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {file.description}
                      </p>
                    ) : null}
                  </div>
                </a>
              ))}
            </div>
          )
        ) : null}

        {tab === "links" ? (
          links.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No links yet"
              description="Useful external resources for this subject will be listed here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="glass shadow-glass flex items-start gap-3 rounded-3xl border border-glass-border p-5 transition-transform hover:-translate-y-1"
                >
                  <span className="gradient-cool grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground">
                    <Link2 className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{link.title}</span>
                    {link.description ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {link.description}
                      </span>
                    ) : null}
                    <span className="mt-1.5 block truncate text-xs text-primary">{link.url}</span>
                  </span>
                  <ExternalLink className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )
        ) : null}
      </div>
    </PortalShell>
  );
}

function FileRow({ file }: { file: MaterialFile }) {
  return (
    <a
      href={file.view_url}
      target="_blank"
      rel="noreferrer"
      className="glass shadow-glass flex items-start gap-3 rounded-3xl border border-glass-border p-5 transition-transform hover:-translate-y-1"
    >
      <span className="gradient-brand grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground">
        <FileText className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{file.title}</span>
        {file.description ? (
          <span className="mt-1 block text-xs text-muted-foreground">{file.description}</span>
        ) : null}
        <span className="mt-1.5 block text-xs text-muted-foreground">
          {formatBytes(file.size_bytes)} · added {formatDate(file.created_at)}
        </span>
      </span>
      <ExternalLink className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
