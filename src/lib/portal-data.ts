import { queryOptions } from "@tanstack/react-query";
import {
  getPortalStats,
  getSubjectDetail,
  listSubjects,
  searchPortal,
  type SubjectOverview,
} from "@/lib/public.functions";

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

export type { SubjectOverview };

export const subjectsQueryOptions = queryOptions({
  queryKey: ["subjects"],
  queryFn: () => listSubjects(),
  staleTime: 60_000,
});

export const statsQueryOptions = queryOptions({
  queryKey: ["portal-stats"],
  queryFn: () => getPortalStats(),
  staleTime: 60_000,
});

export const subjectDetailQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["subject", slug],
    queryFn: () => getSubjectDetail({ data: { slug } }),
    staleTime: 30_000,
  });

export const searchQueryOptions = (q: string) =>
  queryOptions({
    queryKey: ["search", q],
    queryFn: () => searchPortal({ data: { q } }),
    staleTime: 15_000,
    enabled: q.trim().length > 0,
  });

export function countsOf(subject: SubjectOverview) {
  const notes = Number(subject.notes_count ?? 0);
  const pdfs = Number(subject.pdfs_count ?? 0);
  const images = Number(subject.images_count ?? 0);
  const links = Number(subject.links_count ?? 0);
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
