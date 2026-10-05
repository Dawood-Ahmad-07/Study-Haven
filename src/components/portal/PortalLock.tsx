import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, LockOpen } from "lucide-react";
import { getPortalLock, setPortalLock } from "@/lib/portal.functions";

export const portalLockQuery = {
  queryKey: ["portal-lock"],
  queryFn: () => getPortalLock(),
  staleTime: 15_000,
  refetchInterval: 30_000,
};

export function usePortalLock() {
  return useQuery(portalLockQuery);
}

const field =
  "w-full rounded-xl border border-glass-border bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30";

export function LockForm({
  target,
  onDone,
}: {
  target: boolean;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [ownerKey, setOwnerKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => setPortalLock({ data: { password, ownerKey, locked: target } }),
    onSuccess: async (result) => {
      setMessage(result.message);
      if (!result.ok) return;
      setPassword("");
      setOwnerKey("");
      queryClient.removeQueries({ queryKey: ["author-status"] });
      await queryClient.invalidateQueries({ queryKey: ["portal-lock"] });
      onDone?.();
    },
    onError: () => setMessage("Something went wrong. Please try again."),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (target && !confirm("Lock the portal? Everyone, including all authors, will be logged out until you unlock it.")) return;
        mutation.mutate();
      }}
    >
      <input
        className={field}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Author password"
        aria-label="Author password"
      />
      <input
        className={field}
        type="password"
        autoComplete="off"
        value={ownerKey}
        onChange={(e) => setOwnerKey(e.target.value)}
        placeholder="Owner key (only you have this)"
        aria-label="Owner key"
      />
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <button
        type="submit"
        disabled={mutation.isPending || !password || !ownerKey}
        className={
          target
            ? "flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
            : "gradient-brand flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        }
      >
        {target ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
        {mutation.isPending ? "Checking…" : target ? "Lock portal for everyone" : "Unlock portal"}
      </button>
    </form>
  );
}

export function LockedScreen() {
  return (
    <div className="mx-auto max-w-md py-10">
      <div className="glass shadow-soft rounded-2xl border border-glass-border p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <Lock className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
          Learnova is temporarily closed
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The owner has paused access for everyone. Please check back a little later.
        </p>
        <Link
          to="/author"
          className="mt-6 inline-block text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Owner access
        </Link>
      </div>
    </div>
  );
}
