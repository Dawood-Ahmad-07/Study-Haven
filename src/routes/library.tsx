import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, TriangleAlert } from "lucide-react";
import { EmptyState, LoadingGrid, PortalShell } from "@/components/portal/PortalShell";
import { SubjectCard } from "@/components/portal/SubjectCard";
import { countsFor, portalQueryOptions } from "@/lib/portal-data";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Syllable Study Portal" },
      {
        name: "description",
        content: "Every subject in the study library, with its notes, PDFs, images and links.",
      },
      { property: "og:title", content: "Library — Syllable Study Portal" },
      {
        property: "og:description",
        content: "Every subject in the study library, with its notes, PDFs, images and links.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, isLoading, isError, error } = useQuery(portalQueryOptions);

  return (
    <PortalShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Explore subjects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a subject to open its study hub.
          </p>
        </div>
        {data ? (
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {data.subjects.length} subject{data.subjects.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {isLoading ? <LoadingGrid /> : null}

      {isError ? (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load the library"
          description={(error as Error)?.message ?? "Please refresh the page and try again."}
        />
      ) : null}

      {data && data.subjects.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No subjects yet"
          description="The author hasn't published any study material yet. Check back soon."
        />
      ) : null}

      {data && data.subjects.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              counts={countsFor(data, subject.id)}
            />
          ))}
        </div>
      ) : null}
    </PortalShell>
  );
}
