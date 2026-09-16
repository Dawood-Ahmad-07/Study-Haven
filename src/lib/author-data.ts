import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MaterialFile, Note, Subject, UsefulLink } from "@/lib/portal-data";

/** Full library snapshot — used only inside the author dashboard, never on public pages. */
export type PortalData = {
  subjects: Subject[];
  notes: Note[];
  files: MaterialFile[];
  links: UsefulLink[];
};

async function fetchPortal(): Promise<PortalData> {
  const [subjects, notes, files, links] = await Promise.all([
    supabase.from("subjects").select("*").order("position").order("created_at"),
    supabase.from("notes").select("*").order("created_at", { ascending: false }),
    supabase.from("files").select("*").order("created_at", { ascending: false }),
    supabase.from("links").select("*").order("created_at", { ascending: false }),
  ]);

  const firstError = subjects.error || notes.error || files.error || links.error;
  if (firstError) throw new Error(firstError.message);

  return {
    subjects: (subjects.data ?? []) as Subject[],
    notes: (notes.data ?? []) as Note[],
    files: (files.data ?? []) as unknown as MaterialFile[],
    links: (links.data ?? []) as UsefulLink[],
  };
}

export const portalQueryOptions = queryOptions({
  queryKey: ["portal"],
  queryFn: fetchPortal,
  staleTime: 15_000,
});

export function countsFor(data: PortalData, subjectId: string) {
  const notes = data.notes.filter((n) => n.subject_id === subjectId).length;
  const pdfs = data.files.filter((f) => f.subject_id === subjectId && f.kind === "pdf").length;
  const images = data.files.filter((f) => f.subject_id === subjectId && f.kind === "image").length;
  const links = data.links.filter((l) => l.subject_id === subjectId).length;
  return { notes, pdfs, images, links, total: notes + pdfs + images + links };
}
