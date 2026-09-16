import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Library, LogOut, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authorLogout, getAuthorStatus } from "@/lib/portal.functions";
import { cn } from "@/lib/utils";
import { useViewOnly } from "@/lib/view-mode";

export function useAuthorStatus() {
  const viewOnly = useViewOnly();
  return useQuery({
    queryKey: ["author-status"],
    queryFn: () => getAuthorStatus(),
    staleTime: 10_000,
    enabled: !viewOnly,
  });
}

export function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="animate-float-slow absolute -left-24 -top-32 size-[420px] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--sky) 35%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute right-0 top-10 size-[460px] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--violet) 28%, transparent), transparent 70%)",
        }}
      />
      <div
        className="animate-float-slow absolute bottom-0 left-1/3 size-[380px] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--cyan) 28%, transparent), transparent 70%)",
        }}
      />
    </div>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const viewOnly = useViewOnly();
  const { data: status, isFetched } = useAuthorStatus();
  const showAuthorNav = !viewOnly && isFetched && status?.isAuthor === true;
  const search = useRouterState({ select: (s) => s.location.search }) as { q?: string };
  const [term, setTerm] = useState(search.q ?? "");

  useEffect(() => {
    setTerm(search.q ?? "");
  }, [search.q]);

  const logout = useMutation({
    mutationFn: async () => {
      const { clearAuthorToken } = await import("@/lib/author-token");
      clearAuthorToken();
      return authorLogout();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["author-status"] });
      navigate({ to: "/" });
    },
  });

  return (
    <div className="relative min-h-screen font-body text-foreground">
      <AmbientBackdrop />

      <header className="relative z-20 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="glass-strong shadow-soft mx-auto flex max-w-7xl flex-wrap items-center gap-3 rounded-2xl border border-glass-border px-3 py-3 sm:px-5">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="gradient-brand grid size-9 place-items-center rounded-xl font-display font-bold text-primary-foreground">
              S
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Syllable</span>
          </Link>

          <form
            className="order-3 w-full sm:order-2 sm:mx-auto sm:max-w-xl sm:flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              navigate({ to: "/search", search: { q: term } });
            }}
          >
            <label className="glass flex items-center gap-3 rounded-xl border border-glass-border px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring/40">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search notes, PDFs, subjects…"
                aria-label="Search the study portal"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          </form>

          <nav className="order-2 ml-auto flex items-center gap-2 sm:order-3">
            <Link
              to="/library"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <Library className="size-4" />
              Library
            </Link>
            {status?.isAuthor ? (
              <>
                <Link
                  to="/author/dashboard"
                  className="gradient-brand rounded-lg px-3.5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => logout.mutate()}
                  aria-label="Leave author mode"
                  className="glass grid size-9 place-items-center rounded-lg border border-glass-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            ) : (
              <Link
                to="/author"
                className="glass flex items-center gap-1.5 rounded-lg border border-glass-border px-3.5 py-2 text-sm font-semibold transition-colors hover:text-primary"
              >
                <ShieldCheck className="size-4" />
                Author
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        {children}
      </main>

      <footer className="relative z-10 px-4 pb-8 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4">
          <div className="glass shadow-soft flex items-center gap-2.5 rounded-full border border-glass-border px-5 py-2.5">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            <span className="text-xs text-muted-foreground sm:text-[13px]">
              Crafted with care — developed by{" "}
              <span className="font-display font-semibold tracking-tight">
                <span className="text-gradient-brand">Dawood Ahmad</span>
              </span>
            </span>
          </div>
          <p className="text-center text-xs text-muted-foreground/70">
            Syllable — a study material portal. Viewing is open to everyone.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "glass shadow-glass rounded-3xl border border-glass-border p-6 sm:p-7",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof Search;
}) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl border border-glass-border px-6 py-14 text-center">
      <span className="gradient-cool grid size-12 place-items-center rounded-2xl text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="glass h-60 animate-pulse rounded-3xl border border-glass-border"
        />
      ))}
    </div>
  );
}
