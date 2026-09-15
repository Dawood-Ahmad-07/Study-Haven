import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Subject = {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover_url: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  subject_id: string;
  title: string;
  content: string;
  topic: string | null;
  created_at: string;
  updated_at: string;
};

export type MaterialFile = {
  id: string;
  subject_id: string;
  kind: "pdf" | "image";
  title: string;
  description: string | null;
  drive_file_id: string;
  mime_type: string;
  size_bytes: number | null;
  view_url: string;
  thumbnail_url: string | null;
  created_at: string;
};

export type UsefulLink = {
  id: string;
  subject_id: string;
  title: string;
  url: string;
  description: string | null;
  created_at: string;
};

export type PortalData = {
  subjects: Subject[];
  notes: Note[];
  files: MaterialFile[];
  links: UsefulLink[];
};

async function fetchPortal(): Promise<PortalData> {
  const [subjects, notes, files, links] = await Promise.all([
    supabase.from("subjects").select("*").order("created_at", { ascending: true }),
    supabase.from("notes").select("*").order("created_at", { ascending: false }),
    supabase.from("files").select("*").order("created_at", { ascending: false }),
    supabase.from("links").select("*").order("created_at", { ascending: false }),
  ]);

  const firstError = subjects.error || notes.error || files.error || links.error;
  if (firstError) throw new Error(firstError.message);

  return {
    subjects: (subjects.data ?? []) as Subject[],
    notes: (notes.data ?? []) as Note[],
    files: (files.data ?? []) as MaterialFile[],
    links: (links.data ?? []) as UsefulLink[],
  };
}

export const portalQueryOptions = queryOptions({
  queryKey: ["portal"],
  queryFn: fetchPortal,
  staleTime: 30_000,
});

export function countsFor(data: PortalData, subjectId: string) {
  const notes = data.notes.filter((n) => n.subject_id === subjectId).length;
  const pdfs = data.files.filter((f) => f.subject_id === subjectId && f.kind === "pdf").length;
  const images = data.files.filter((f) => f.subject_id === subjectId && f.kind === "image").length;
  const links = data.links.filter((l) => l.subject_id === subjectId).length;
  return { notes, pdfs, images, links, total: notes + pdfs + images + links };
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
