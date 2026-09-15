import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { PortalShell, useAuthorStatus } from "@/components/portal/PortalShell";
import { authorLogin } from "@/lib/portal.functions";

export const Route = createFileRoute("/author/")({
  head: () => ({
    meta: [
      { title: "Author access — Syllable Study Portal" },
      {
        name: "description",
        content: "Enter the author password to manage subjects, notes, files and links.",
      },
      { property: "og:title", content: "Author access — Syllable Study Portal" },
      {
        property: "og:description",
        content: "Enter the author password to manage the study portal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthorLogin,
});

function AuthorLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: status } = useAuthorStatus();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status?.isAuthor) navigate({ to: "/author/dashboard" });
  }, [status?.isAuthor, navigate]);

  const login = useMutation({
    mutationFn: (value: string) => authorLogin({ data: { password: value } }),
    onSuccess: async (result) => {
      if (result.ok) {
        setMessage(null);
        const { setAuthorToken } = await import("@/lib/author-token");
        if (result.token) setAuthorToken(result.token);
        await queryClient.invalidateQueries({ queryKey: ["author-status"] });
        navigate({ to: "/author/dashboard" });
        return;
      }
      setMessage(
        result.reason === "not-configured"
          ? "No author password has been set for this portal yet."
          : "That password is not correct.",
      );
    },
    onError: () => setMessage("Something went wrong. Please try again."),
  });

  return (
    <PortalShell>
      <div className="mx-auto max-w-md">
        <div className="glass shadow-glass rounded-3xl border border-glass-border p-8">
          <span className="gradient-brand grid size-12 place-items-center rounded-2xl text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">Author access</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Enter your author password to manage the portal. Visitors never need this — browsing
            stays open to everyone.
          </p>

          <form
            className="mt-6 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              login.mutate(password);
            }}
          >
            <label className="glass flex items-center gap-3 rounded-xl border border-glass-border px-4 py-3 focus-within:ring-2 focus-within:ring-ring/40">
              <KeyRound className="size-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Author password"
                aria-label="Author password"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>

            {message ? <p className="text-sm text-destructive">{message}</p> : null}

            <button
              type="submit"
              disabled={login.isPending || password.length === 0}
              className="gradient-brand w-full rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {login.isPending ? "Checking…" : "Unlock author mode"}
            </button>
          </form>
        </div>
      </div>
    </PortalShell>
  );
}
