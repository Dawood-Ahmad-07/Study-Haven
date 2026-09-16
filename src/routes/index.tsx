import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Eye, FileText, Images, Link2, ShieldCheck } from "lucide-react";
import { AmbientBackdrop } from "@/components/portal/PortalShell";
import { statsQueryOptions } from "@/lib/portal-data";
import { authorLogout } from "@/lib/portal.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syllable — Study Material Portal" },
      {
        name: "description",
        content:
          "Browse study notes, PDFs, images and useful links by subject. Open to everyone, managed by the author.",
      },
      { property: "og:title", content: "Syllable — Study Material Portal" },
      {
        property: "og:description",
        content: "Browse study notes, PDFs, images and useful links by subject.",
      },
    ],
  }),
  component: Entry,
});

function Entry() {
  const { data } = useQuery(statsQueryOptions);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // "Only View" always enters as a plain visitor: any leftover author session
  // from an earlier sign-in on this device is ended first.
  async function enterViewOnly() {
    const { clearAuthorToken } = await import("@/lib/author-token");
    clearAuthorToken();
    setViewOnly();
    queryClient.removeQueries({ queryKey: ["author-status"] });
    try {
      await authorLogout();
    } catch {
      /* viewing must work even if the sign-out call fails */
    }
    queryClient.removeQueries({ queryKey: ["author-status"] });
    navigate({ to: "/library" });
  }


  const stats = [
    { label: "Subjects", value: data?.subjects ?? 0, icon: BookOpenCheck },
    { label: "Notes", value: data?.notes ?? 0, icon: FileText },
    { label: "Files", value: data?.files ?? 0, icon: Images },
    { label: "Links", value: data?.links ?? 0, icon: Link2 },
  ];

  return (
    <div className="relative min-h-screen font-body">
      <AmbientBackdrop />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="glass shadow-glass rounded-3xl border border-glass-border p-8 sm:p-10">
            <div className="flex items-center gap-2.5">
              <span className="gradient-brand grid size-9 place-items-center rounded-xl font-display font-bold text-primary-foreground">
                S
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">Syllable</span>
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Welcome
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              How do you want
              <br />
              to enter today?
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              Browse the full study library with no sign-up at all, or unlock author mode with your
              password to manage every subject, note and file.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void enterViewOnly()}
                className="gradient-brand shadow-soft flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-primary-foreground"
              >
                <Eye className="size-4" />
                Only View
              </button>

              <Link
                to="/author"
                className="glass flex items-center gap-2 rounded-xl border border-glass-border px-6 py-3.5 text-sm font-semibold transition-colors hover:text-primary"
              >
                <ShieldCheck className="size-4" />
                Author
              </Link>
            </div>
          </div>

          <div className="glass shadow-glass rounded-3xl border border-glass-border p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Inside the library</h2>
              <span className="text-xs font-medium text-muted-foreground">Live</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-glass-border bg-secondary p-4"
                >
                  <stat.icon className="size-4 text-primary" />
                  <p className="mt-3 font-display text-2xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-glass-border bg-secondary p-4">
              <p className="text-sm font-semibold">Viewing is completely open</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                No account, no sign-up. Only the author can add, edit or remove material.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
