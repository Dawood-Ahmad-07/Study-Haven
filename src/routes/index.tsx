import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  FileText,
  Images,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AmbientBackdrop } from "@/components/portal/PortalShell";
import { Logo } from "@/components/portal/Logo";
import { statsQueryOptions } from "@/lib/portal-data";
import { authorLogout } from "@/lib/portal.functions";
import { clearViewOnly, setViewOnly } from "@/lib/view-mode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learnova — A calm home for your study material" },
      {
        name: "description",
        content:
          "Browse study notes, PDFs, images and useful links by subject on Learnova. Open to everyone, managed by the author.",
      },
      { property: "og:title", content: "Learnova — A calm home for your study material" },
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

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-14 text-center sm:px-6">
        <Logo
          markClassName="size-12"
          wordClassName="text-2xl"
          className="gap-3"
        />

        <h1 className="mt-8 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          A calm home for your
          <br />
          <span className="text-gradient-brand">study material</span>
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Notes, PDFs, images and useful links — organised subject by subject. Viewing is open to
          everyone, with no account needed.
        </p>

        <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void enterViewOnly()}
            className="glass shadow-soft group flex flex-col items-start gap-3 rounded-2xl border border-glass-border p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glass"
          >
            <span className="gradient-brand grid size-11 place-items-center rounded-xl text-primary-foreground">
              <Eye className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Only View</span>
            <span className="text-sm leading-relaxed text-muted-foreground">
              Enter straight away and browse everything. No sign-up, nothing to fill in.
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
              Open the library
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>

          <Link
            to="/author"
            onClick={() => clearViewOnly()}
            className="glass shadow-soft group flex flex-col items-start gap-3 rounded-2xl border border-glass-border p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-glass"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-glass-border bg-secondary text-accent">
              <ShieldCheck className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Author</span>
            <span className="text-sm leading-relaxed text-muted-foreground">
              Password protected. Add, edit and remove subjects, notes, files and links.
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-accent">
              Enter password
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <div className="glass shadow-soft mt-10 grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl border border-glass-border sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="px-4 py-5">
              <stat.icon className="mx-auto size-4 text-primary" aria-hidden />
              <p className="mt-2.5 font-display text-2xl font-bold tabular-nums">{stat.value}</p>
              <p className="eyebrow mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Crafted with care — developed by{" "}
          <span className="font-display font-semibold tracking-tight text-gradient-brand">
            Dawood Ahmad
          </span>
        </p>
      </div>
    </div>
  );
}
