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
  countsOf,
  formatBytes,
  formatDate,
  subjectDetailQueryOptions,
  type MaterialFile,
} from "@/lib/portal-data";
import { getSubjectSection, PAGE_SIZE } from "@/lib/public.functions";

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
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(subjectDetailQueryOptions(params.slug)),
  component: SubjectPage,
});

const TABS = [
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "pdfs", label: "PDFs", icon: FileText },
  { id: "images", label: "Images", icon: Images },
  { id: "links", label: "Useful Links", icon: Link2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

type SectionRow = Record<string, unknown>;

function SubjectPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError } = useQuery(subjectDetailQueryOptions(slug));
  const [tab, setTab] = useState<TabId>("notes");
  const [extra, setExtra] = useState<Record<TabId, SectionRow[]>>({
    notes: [],
    pdfs: [],
    images: [],
    links: [],
  });
  const [pages, setPages] = useState<Record<TabId, number>>({
    notes: 0,
    pdfs: 0,
    images: 0,
    links: 0,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  if (isLoading) {
    return (
      <PortalShell>
        <div className="glass h-72 animate-pulse rounded-2xl border border-glass-border" />
      </PortalShell>
    );
  }

  if (isError || !data) {
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

  const subject = data.subject;
  const counts = countsOf(subject);

  const notes = [...data.notes, ...extra.notes] as unknown as Array<{
    id: string;
    title: string;
    content: string;
    topic: string | null;
    updated_at: string;
  }>;
  const pdfs = [...data.pdfs, ...extra.pdfs] as unknown as MaterialFile[];
  const images = [...data.images, ...extra.images] as unknown as MaterialFile[];
  const links = [...data.links, ...extra.links] as unknown as Array<{
    id: string;
    title: string;
    url: string;
    description: string | null;
  }>;

  const tabCount: Record<TabId, number> = {
    notes: counts.notes,
    pdfs: counts.pdfs,
    images: counts.images,
    links: counts.links,
  };
  const shown: Record<TabId, number> = {
    notes: notes.length,
    pdfs: pdfs.length,
    images: images.length,
    links: links.length,
  };

  async function loadMore(section: TabId) {
    setLoadingMore(true);
    try {
      const nextPage = pages[section] + 1;
      const rows = (await getSubjectSection({
        data: { subjectId: subject.id, section, page: nextPage },
      })) as SectionRow[];
      setExtra((prev) => ({ ...prev, [section]: [...prev[section], ...rows] }));
      setPages((prev) => ({ ...prev, [section]: nextPage }));
    } finally {
      setLoadingMore(false);
    }
  }

  function LoadMore({ section }: { section: TabId }) {
    if (shown[section] >= tabCount[section] || tabCount[section] <= PAGE_SIZE) return null;
    return (
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => void loadMore(section)}
          disabled={loadingMore}
          className="glass rounded-xl border border-glass-border px-6 py-3 text-sm font-semibold transition-colors hover:text-primary disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : `Load more (${tabCount[section] - shown[section]} left)`}
        </button>
      </div>
    );
  }

  return (
    <PortalShell>
      <Link
        to="/library"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>

      <div className="glass shadow-soft overflow-hidden rounded-2xl border border-glass-border">
        {subject.cover_url ? (
          <img
            src={subject.cover_url}
            alt={`${subject.name} cover`}
            width={1200}
            height={480}
            decoding="async"
            fetchPriority="high"
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
            <>
              <div className="grid gap-5">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    className="glass shadow-soft rounded-2xl border border-glass-border p-6 sm:p-8"
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
              <LoadMore section="notes" />
            </>
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
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {pdfs.map((file) => (
                  <FileRow key={file.id} file={file} />
                ))}
              </div>
              <LoadMore section="pdfs" />
            </>
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
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((file) => (
                  <a
                    key={file.id}
                    href={file.view_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass shadow-soft group overflow-hidden rounded-2xl border border-glass-border transition-transform hover:-translate-y-1"
                  >
                    <img
                      src={file.thumbnail_url ?? file.view_url}
                      alt={file.title}
                      width={600}
                      height={352}
                      loading="lazy"
                      decoding="async"
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
              <LoadMore section="images" />
            </>
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
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass shadow-soft flex items-start gap-3 rounded-2xl border border-glass-border p-5 transition-transform hover:-translate-y-1"
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
              <LoadMore section="links" />
            </>
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
      rel="noopener noreferrer"
      className="glass shadow-soft flex items-start gap-3 rounded-2xl border border-glass-border p-5 transition-transform hover:-translate-y-1"
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
