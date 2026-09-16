import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenCheck,
  FileText,
  Images,
  KeyRound,
  Link2,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PortalShell, useAuthorStatus } from "@/components/portal/PortalShell";
import {
  formatBytes,
  formatDate,
  type Note,
  type Subject,
  type UsefulLink,
} from "@/lib/portal-data";
import { countsFor, portalQueryOptions } from "@/lib/author-data";
import { MAX_UPLOAD_BYTES, fileToBase64 } from "@/lib/file-input";
import { clearAuthorToken, setAuthorToken } from "@/lib/author-token";
import { useViewOnly } from "@/lib/view-mode";
import {
  changeAuthorPassword,
  checkStorageHealth,
  listAuditLog,
  logoutEverywhere,
  deleteLink,
  deleteMaterial,
  deleteNote,
  deleteSubject,
  saveLink,
  saveNote,
  saveSubject,
  updateMaterial,
  uploadCoverImage,
  uploadMaterial,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/author/dashboard")({
  head: () => ({
    meta: [
      { title: "Author dashboard — Syllable Study Portal" },
      { name: "description", content: "Manage subjects, notes, PDFs, images and links." },
      { property: "og:title", content: "Author dashboard — Syllable Study Portal" },
      { property: "og:description", content: "Manage the study portal content." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

/* ------------------------------------------------------------------ */

function Dashboard() {
  const navigate = useNavigate();
  const viewOnly = useViewOnly();
  const { data: status, isFetched: statusFetched } = useAuthorStatus();
  const authorised = !viewOnly && statusFetched && status?.isAuthor === true;
  const { data, isLoading } = useQuery({ ...portalQueryOptions, enabled: authorised });
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (viewOnly || (statusFetched && !status?.isAuthor)) navigate({ to: "/author" });
  }, [viewOnly, status, statusFetched, navigate]);

  useEffect(() => {
    if (data && data.subjects.length > 0 && !activeSubjectId) {
      setActiveSubjectId(data.subjects[0]!.id);
    }
  }, [data, activeSubjectId]);

  if (!statusFetched || (authorised && (isLoading || !data))) {
    return (
      <PortalShell>
        <div className="glass h-72 animate-pulse rounded-3xl border border-glass-border" />
      </PortalShell>
    );
  }

  if (!authorised || !data) {
    return (
      <PortalShell>
        <div className="glass rounded-3xl border border-glass-border p-8 text-center">
          <p className="font-display text-lg font-semibold">Author access required</p>
          <Link to="/author" className="mt-3 inline-block text-sm font-medium text-primary">
            Go to author sign-in
          </Link>
        </div>
      </PortalShell>
    );
  }

  const stats = [
    { label: "Subjects", value: data.subjects.length, icon: BookOpenCheck },
    { label: "Notes", value: data.notes.length, icon: NotebookPen },
    {
      label: "PDFs",
      value: data.files.filter((f) => f.kind === "pdf").length,
      icon: FileText,
    },
    {
      label: "Images",
      value: data.files.filter((f) => f.kind === "image").length,
      icon: Images,
    },
    { label: "Links", value: data.links.length, icon: Link2 },
  ];

  const activeSubject = data.subjects.find((s) => s.id === activeSubjectId) ?? null;

  return (
    <PortalShell>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Author dashboard
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything you publish here is instantly visible to visitors.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass shadow-glass rounded-2xl border border-glass-border p-4"
          >
            <stat.icon className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <SubjectsPanel
            subjects={data.subjects}
            activeSubjectId={activeSubjectId}
            onSelect={setActiveSubjectId}
            counts={(id) => countsFor(data, id).total}
          />
          <PasswordPanel />
          <StoragePanel />
          <ActivityPanel />
        </div>

        {activeSubject ? (
          <SubjectManager subject={activeSubject} />
        ) : (
          <div className="glass rounded-3xl border border-glass-border p-10 text-center">
            <p className="font-display text-lg font-semibold">No subject selected</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Create your first subject to start adding notes, files and links.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

/* ------------------------------------------------------------------ */

function usePortalMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
      toast.success(successMessage);
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong."),
  });
}

const fieldClass =
  "w-full rounded-xl border border-glass-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground";

const primaryButton =
  "gradient-brand rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60";

const ghostButton =
  "glass rounded-xl border border-glass-border px-4 py-2.5 text-sm font-medium transition-colors hover:text-primary";

/* ------------------------------------------------------------------ */

function SubjectsPanel({
  subjects,
  activeSubjectId,
  onSelect,
  counts,
}: {
  subjects: Subject[];
  activeSubjectId: string | null;
  onSelect: (id: string) => void;
  counts: (id: string) => number;
}) {
  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="glass shadow-glass rounded-3xl border border-glass-border p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Subjects</h2>
        <button
          onClick={() => {
            setEditing(null);
            setCreating((value) => !value);
          }}
          className="glass grid size-8 place-items-center rounded-lg border border-glass-border text-primary"
          aria-label="Add subject"
        >
          {creating ? <X className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>

      {creating ? (
        <SubjectForm
          onDone={() => setCreating(false)}
          key="create"
        />
      ) : null}

      <div className="mt-4 space-y-2">
        {subjects.length === 0 && !creating ? (
          <p className="text-sm text-muted-foreground">No subjects yet. Add your first one.</p>
        ) : null}

        {subjects.map((subject) =>
          editing?.id === subject.id ? (
            <SubjectForm key={subject.id} subject={subject} onDone={() => setEditing(null)} />
          ) : (
            <div
              key={subject.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                activeSubjectId === subject.id
                  ? "border-primary/40 bg-secondary"
                  : "border-glass-border"
              }`}
            >
              <button
                onClick={() => onSelect(subject.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-medium">{subject.name}</span>
                <span className="text-xs text-muted-foreground">
                  {counts(subject.id)} materials
                </span>
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setEditing(subject);
                }}
                aria-label={`Edit ${subject.name}`}
                className="text-muted-foreground hover:text-primary"
              >
                <Pencil className="size-4" />
              </button>
              <DeleteButton
                label={`Delete subject “${subject.name}” and everything inside it?`}
                onConfirm={() => deleteSubject({ data: { id: subject.id } })}
                successMessage="Subject deleted."
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function SubjectForm({ subject, onDone }: { subject?: Subject; onDone: () => void }) {
  const [name, setName] = useState(subject?.name ?? "");
  const [description, setDescription] = useState(subject?.description ?? "");
  const [coverUrl, setCoverUrl] = useState(subject?.cover_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = usePortalMutation(
    () =>
      saveSubject({
        data: {
          ...(subject ? { id: subject.id } : {}),
          name,
          description,
          coverUrl,
        },
      }),
    subject ? "Subject updated." : "Subject created.",
  );

  async function handleCover(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Cover image must be under 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadCoverImage({
        data: {
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          base64: await fileToBase64(file),
        },
      });
      setCoverUrl(result.url);
      toast.success("Cover uploaded.");
    } catch (error) {
      toast.error((error as Error).message || "Cover upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="mt-4 space-y-3 rounded-2xl border border-glass-border bg-secondary p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await save.mutateAsync(undefined as never);
        onDone();
      }}
    >
      <input
        className={fieldClass}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Subject name"
        required
      />
      <textarea
        className={`${fieldClass} min-h-20`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Short description"
      />

      {coverUrl ? (
        <div className="flex items-center gap-3">
          <img src={coverUrl} alt="Cover preview" className="h-12 w-20 rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => setCoverUrl(null)}
            className="text-xs font-medium text-destructive"
          >
            Remove cover
          </button>
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleCover(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={`${ghostButton} w-full`}
      >
        {uploading ? "Uploading cover…" : "Upload cover picture"}
      </button>

      <div className="flex gap-2">
        <button type="submit" disabled={save.isPending} className={`${primaryButton} flex-1`}>
          {save.isPending ? "Saving…" : subject ? "Save changes" : "Create subject"}
        </button>
        <button type="button" onClick={onDone} className={ghostButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function PasswordPanel() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [ownerKey, setOwnerKey] = useState("");

  const change = useMutation({
    mutationFn: () => changeAuthorPassword({ data: { current, next, ownerKey } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message);
        setCurrent("");
        setNext("");
        setOwnerKey("");
        if (result.token) setAuthorToken(result.token);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="glass shadow-glass rounded-3xl border border-glass-border p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Author password</h2>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Only the owner can change this: it needs the current password plus your private owner key.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          change.mutate();
        }}
      >
        <input
          className={fieldClass}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          placeholder="Current password"
        />
        <input
          className={fieldClass}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          placeholder="New password (min 8 characters)"
        />
        <input
          className={fieldClass}
          type="password"
          autoComplete="off"
          value={ownerKey}
          onChange={(event) => setOwnerKey(event.target.value)}
          placeholder="Owner key (only you have this)"
        />
        <button type="submit" disabled={change.isPending} className={`${primaryButton} w-full`}>
          {change.isPending ? "Updating…" : "Update password"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          if (!confirm("Sign out of every device that is currently in author mode?")) return;
          void logoutEverywhere()
            .then(() => {
              clearAuthorToken();
              window.location.href = "/author";
            })
            .catch((error: Error) => toast.error(error.message));
        }}
        className={`${ghostButton} mt-3 w-full`}
      >
        Log out everywhere
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StoragePanel() {
  const health = useQuery({
    queryKey: ["storage-health"],
    queryFn: () => checkStorageHealth(),
    staleTime: 60_000,
  });

  return (
    <div className="glass shadow-glass rounded-3xl border border-glass-border p-5">
      <div className="flex items-center gap-2">
        <Upload className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Storage</h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {health.isLoading
          ? "Checking your file storage…"
          : (health.data?.message ?? "Storage status is unavailable right now.")}
      </p>
      <button
        type="button"
        onClick={() => void health.refetch()}
        className={`${ghostButton} mt-3 w-full`}
      >
        Re-check storage
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ActivityPanel() {
  const log = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => listAuditLog(),
    staleTime: 30_000,
  });

  return (
    <div className="glass shadow-glass rounded-3xl border border-glass-border p-5">
      <h2 className="font-display text-lg font-semibold">Recent activity</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        A record of author sign-ins and content changes.
      </p>
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 text-xs">
        {(log.data ?? []).map((entry) => (
          <li key={entry.id} className="rounded-xl border border-glass-border/70 px-3 py-2">
            <p className="font-medium">{entry.action.replace(/_/g, " ")}</p>
            <p className="text-muted-foreground">
              {entry.target ? `${entry.target} — ` : ""}
              {formatDate(entry.created_at)}
            </p>
          </li>
        ))}
        {!log.isLoading && (log.data ?? []).length === 0 ? (
          <li className="text-muted-foreground">No activity recorded yet.</li>
        ) : null}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const MANAGER_TABS = [
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "pdfs", label: "PDFs", icon: FileText },
  { id: "images", label: "Images", icon: Images },
  { id: "links", label: "Links", icon: Link2 },
] as const;

type ManagerTab = (typeof MANAGER_TABS)[number]["id"];

function SubjectManager({ subject }: { subject: Subject }) {
  const { data } = useQuery(portalQueryOptions);
  const [tab, setTab] = useState<ManagerTab>("notes");

  const scoped = useMemo(() => {
    if (!data) return { notes: [], pdfs: [], images: [], links: [] };
    return {
      notes: data.notes.filter((n) => n.subject_id === subject.id),
      pdfs: data.files.filter((f) => f.subject_id === subject.id && f.kind === "pdf"),
      images: data.files.filter((f) => f.subject_id === subject.id && f.kind === "image"),
      links: data.links.filter((l) => l.subject_id === subject.id),
    };
  }, [data, subject.id]);

  return (
    <div className="glass shadow-glass rounded-3xl border border-glass-border p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold">{subject.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Organise the material inside this subject.</p>

      <div className="glass mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-glass-border p-1.5">
        {MANAGER_TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "gradient-brand text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "notes" ? <NotesManager subjectId={subject.id} notes={scoped.notes} /> : null}
        {tab === "pdfs" ? (
          <FilesManager subjectId={subject.id} kind="pdf" files={scoped.pdfs} />
        ) : null}
        {tab === "images" ? (
          <FilesManager subjectId={subject.id} kind="image" files={scoped.images} />
        ) : null}
        {tab === "links" ? <LinksManager subjectId={subject.id} links={scoped.links} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NotesManager({ subjectId, notes }: { subjectId: string; notes: Note[] }) {
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");

  function reset() {
    setEditing(null);
    setTitle("");
    setTopic("");
    setContent("");
  }

  const save = usePortalMutation(
    () =>
      saveNote({
        data: {
          ...(editing ? { id: editing.id } : {}),
          subjectId,
          title,
          content,
          topic: topic || null,
        },
      }),
    editing ? "Note updated." : "Note added.",
  );

  return (
    <div className="space-y-5">
      <form
        className="space-y-3 rounded-2xl border border-glass-border bg-secondary p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await save.mutateAsync(undefined as never);
          reset();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={fieldClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Note title"
            required
          />
          <input
            className={fieldClass}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Topic / category (optional)"
          />
        </div>
        <textarea
          className={`${fieldClass} min-h-40`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write the note content…"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={save.isPending} className={primaryButton}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Add note"}
          </button>
          {editing ? (
            <button type="button" onClick={reset} className={ghostButton}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes in this subject yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-start gap-3 rounded-2xl border border-glass-border p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{note.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.content}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {note.topic ? `${note.topic} · ` : ""}updated {formatDate(note.updated_at)}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditing(note);
                  setTitle(note.title);
                  setTopic(note.topic ?? "");
                  setContent(note.content);
                }}
                aria-label="Edit note"
                className="text-muted-foreground hover:text-primary"
              >
                <Pencil className="size-4" />
              </button>
              <DeleteButton
                label={`Delete the note “${note.title}”?`}
                onConfirm={() => deleteNote({ data: { id: note.id } })}
                successMessage="Note deleted."
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FilesManager({
  subjectId,
  kind,
  files,
}: {
  subjectId: string;
  kind: "pdf" | "image";
  files: import("@/lib/portal-data").MaterialFile[];
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Files must be under 8 MB.");
      return;
    }
    setBusy(true);
    try {
      await uploadMaterial({
        data: {
          subjectId,
          kind,
          title: title || file.name,
          description: description || null,
          fileName: file.name,
          mimeType: file.type || (kind === "pdf" ? "application/pdf" : "image/jpeg"),
          base64: await fileToBase64(file),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
      setTitle("");
      setDescription("");
      toast.success(kind === "pdf" ? "PDF uploaded." : "Image uploaded.");
    } catch (error) {
      toast.error((error as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-glass-border bg-secondary p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={fieldClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={`${kind === "pdf" ? "PDF" : "Image"} title (optional)`}
          />
          <input
            className={fieldClass}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description (optional)"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={kind === "pdf" ? "application/pdf" : "image/*"}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className={`${primaryButton} flex w-full items-center justify-center gap-2`}
        >
          <Upload className="size-4" />
          {busy ? "Uploading to Google Drive…" : `Upload ${kind === "pdf" ? "PDF" : "image"}`}
        </button>
        <p className="text-xs text-muted-foreground">
          Files are stored in your connected Google Drive and shared as view-only links, so
          visitors need no Google account.
        </p>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing uploaded here yet.</p>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <FileItem key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileItem({ file }: { file: import("@/lib/portal-data").MaterialFile }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(file.title);
  const [description, setDescription] = useState(file.description ?? "");

  const save = usePortalMutation(
    () => updateMaterial({ data: { id: file.id, title, description: description || null } }),
    "File details updated.",
  );

  if (editing) {
    return (
      <form
        className="space-y-3 rounded-2xl border border-glass-border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await save.mutateAsync(undefined as never);
          setEditing(false);
        }}
      >
        <input
          className={fieldClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          className={fieldClass}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
        />
        <div className="flex gap-2">
          <button type="submit" className={primaryButton} disabled={save.isPending}>
            Save
          </button>
          <button type="button" className={ghostButton} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-glass-border p-4">
      {file.kind === "image" && file.thumbnail_url ? (
        <img
          src={file.thumbnail_url}
          alt=""
          className="size-12 shrink-0 rounded-lg bg-secondary object-cover"
        />
      ) : (
        <span className="gradient-brand grid size-12 shrink-0 place-items-center rounded-lg text-primary-foreground">
          <FileText className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <a
          href={file.view_url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sm font-semibold hover:text-primary"
        >
          {file.title}
        </a>
        {file.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{file.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatBytes(file.size_bytes)} · added {formatDate(file.created_at)}
        </p>
      </div>
      <button
        onClick={() => setEditing(true)}
        aria-label="Edit file details"
        className="text-muted-foreground hover:text-primary"
      >
        <Pencil className="size-4" />
      </button>
      <DeleteButton
        label={`Delete “${file.title}” from the portal and your Drive?`}
        onConfirm={() => deleteMaterial({ data: { id: file.id } })}
        successMessage="File deleted."
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LinksManager({ subjectId, links }: { subjectId: string; links: UsefulLink[] }) {
  const [editing, setEditing] = useState<UsefulLink | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setEditing(null);
    setTitle("");
    setUrl("");
    setDescription("");
  }

  const save = usePortalMutation(
    () =>
      saveLink({
        data: {
          ...(editing ? { id: editing.id } : {}),
          subjectId,
          title,
          url,
          description: description || null,
        },
      }),
    editing ? "Link updated." : "Link added.",
  );

  return (
    <div className="space-y-5">
      <form
        className="space-y-3 rounded-2xl border border-glass-border bg-secondary p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await save.mutateAsync(undefined as never);
          reset();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={fieldClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Link title"
            required
          />
          <input
            className={fieldClass}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            required
          />
        </div>
        <input
          className={fieldClass}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Short description (optional)"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={save.isPending} className={primaryButton}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Add link"}
          </button>
          {editing ? (
            <button type="button" onClick={reset} className={ghostButton}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links in this subject yet.</p>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-start gap-3 rounded-2xl border border-glass-border p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{link.title}</p>
                <p className="mt-0.5 truncate text-xs text-primary">{link.url}</p>
                {link.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
                ) : null}
              </div>
              <button
                onClick={() => {
                  setEditing(link);
                  setTitle(link.title);
                  setUrl(link.url);
                  setDescription(link.description ?? "");
                }}
                aria-label="Edit link"
                className="text-muted-foreground hover:text-primary"
              >
                <Pencil className="size-4" />
              </button>
              <DeleteButton
                label={`Delete the link “${link.title}”?`}
                onConfirm={() => deleteLink({ data: { id: link.id } })}
                successMessage="Link deleted."
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DeleteButton({
  label,
  onConfirm,
  successMessage,
}: {
  label: string;
  onConfirm: () => Promise<unknown>;
  successMessage: string;
}) {
  const remove = usePortalMutation(() => onConfirm(), successMessage);

  return (
    <button
      onClick={() => {
        if (window.confirm(label)) remove.mutate(undefined as never);
      }}
      disabled={remove.isPending}
      aria-label="Delete"
      className="text-muted-foreground transition-colors hover:text-destructive"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
