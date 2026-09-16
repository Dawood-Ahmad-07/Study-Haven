import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, TriangleAlert } from "lucide-react";
import { EmptyState, LoadingGrid, PortalShell } from "@/components/portal/PortalShell";
import { SubjectCard } from "@/components/portal/SubjectCard";
import { countsOf, subjectsQueryOptions } from "@/lib/portal-data";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Learnova" },
      {
        name: "description",
        content: "Every subject in the study library, with its notes, PDFs, images and links.",
      },
      { property: "og:title", content: "Library — Learnova" },
      {
        property: "og:description",
        content: "Every subject in the study library, with its notes, PDFs, images and links.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(subjectsQueryOptions),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, isLoading, isError, error } = useQuery(subjectsQueryOptions);
  const subjects = data ?? [];

  return (
    <PortalShell>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Explore subjects
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pick a subject to open its notes, PDFs, images and links.
          </p>
        </div>
        {data ? (
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {subjects.length} subject{subjects.length === 1 ? "" : "s"}
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

      {data && subjects.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No subjects yet"
          description="The author hasn't published any study material yet. Check back soon."
        />
      ) : null}

      {subjects.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject, index) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              counts={countsOf(subject)}
              priority={index < 3}
            />
          ))}
        </div>
      ) : null}
    </PortalShell>
  );
}
