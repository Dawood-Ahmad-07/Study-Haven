import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/* Public, read-only reads. These use the publishable key (RLS as anon) and are
   cached briefly at the edge so a burst of visitors is served without hitting
   the database once per reader. */

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function cacheFor(seconds: number) {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader(
    "cache-control",
    `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=300`,
  );
}

export type SubjectOverview = {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover_url: string | null;
  position: number;
  created_at: string;
  notes_count: number;
  pdfs_count: number;
  images_count: number;
  links_count: number;
};

export const listSubjects = createServerFn({ method: "GET" }).handler(async () => {
  await cacheFor(60);
  const { data, error } = await publicClient()
    .from("subject_overview")
    .select(
      "id, name, slug, description, cover_url, position, created_at, notes_count, pdfs_count, images_count, links_count",
    )
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as SubjectOverview[];
});

export const getPortalStats = createServerFn({ method: "GET" }).handler(async () => {
  await cacheFor(60);
  const client = publicClient();
  const [subjects, notes, files, links] = await Promise.all([
    client.from("subjects").select("id", { count: "exact", head: true }),
    client.from("notes").select("id", { count: "exact", head: true }),
    client.from("files").select("id", { count: "exact", head: true }),
    client.from("links").select("id", { count: "exact", head: true }),
  ]);
  return {
    subjects: subjects.count ?? 0,
    notes: notes.count ?? 0,
    files: files.count ?? 0,
    links: links.count ?? 0,
  };
});

export const PAGE_SIZE = 24;

export const getSubjectDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data?.slug ?? "").slice(0, 120) }))
  .handler(async ({ data }) => {
    await cacheFor(30);
    const client = publicClient();
    const { data: subject, error } = await client
      .from("subject_overview")
      .select(
        "id, name, slug, description, cover_url, position, created_at, notes_count, pdfs_count, images_count, links_count",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!subject) return null;

    const id = subject.id as string;
    const [notes, pdfs, images, links] = await Promise.all([
      client
        .from("notes")
        .select("id, subject_id, title, content, topic, created_at, updated_at")
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1),
      client
        .from("files")
        .select(
          "id, subject_id, kind, title, description, mime_type, size_bytes, view_url, thumbnail_url, created_at",
        )
        .eq("subject_id", id)
        .eq("kind", "pdf")
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1),
      client
        .from("files")
        .select(
          "id, subject_id, kind, title, description, mime_type, size_bytes, view_url, thumbnail_url, created_at",
        )
        .eq("subject_id", id)
        .eq("kind", "image")
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1),
      client
        .from("links")
        .select("id, subject_id, title, url, description, created_at")
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1),
    ]);

    return {
      subject: subject as unknown as SubjectOverview,
      notes: notes.data ?? [],
      pdfs: pdfs.data ?? [],
      images: images.data ?? [],
      links: links.data ?? [],
    };
  });

/** Loads one more page of a single section inside a subject. */
export const getSubjectSection = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { subjectId: string; section: "notes" | "pdfs" | "images" | "links"; page: number }) => ({
      subjectId: String(data.subjectId),
      section: data.section,
      page: Math.max(0, Math.min(200, Number(data.page) || 0)),
    }),
  )
  .handler(async ({ data }) => {
    await cacheFor(30);
    const client = publicClient();
    const from = data.page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (data.section === "notes") {
      const { data: rows } = await client
        .from("notes")
        .select("id, subject_id, title, content, topic, created_at, updated_at")
        .eq("subject_id", data.subjectId)
        .order("created_at", { ascending: false })
        .range(from, to);
      return rows ?? [];
    }
    if (data.section === "links") {
      const { data: rows } = await client
        .from("links")
        .select("id, subject_id, title, url, description, created_at")
        .eq("subject_id", data.subjectId)
        .order("created_at", { ascending: false })
        .range(from, to);
      return rows ?? [];
    }
    const { data: rows } = await client
      .from("files")
      .select(
        "id, subject_id, kind, title, description, mime_type, size_bytes, view_url, thumbnail_url, created_at",
      )
      .eq("subject_id", data.subjectId)
      .eq("kind", data.section === "pdfs" ? "pdf" : "image")
      .order("created_at", { ascending: false })
      .range(from, to);
    return rows ?? [];
  });

export const searchPortal = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => ({ q: String(data?.q ?? "").trim().slice(0, 100) }))
  .handler(async ({ data }) => {
    await cacheFor(15);
    const term = data.q;
    if (!term) {
      return { subjects: [], notes: [], files: [], links: [], subjectIndex: {} as Record<string, { name: string; slug: string }> };
    }
    const pattern = `%${term.replace(/[%_]/g, "")}%`;
    const client = publicClient();
    const limit = 30;

    const [subjects, notes, files, links, allSubjects] = await Promise.all([
      client
        .from("subjects")
        .select("id, name, slug, description")
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .limit(limit),
      client
        .from("notes")
        .select("id, subject_id, title, content, topic, updated_at")
        .or(`title.ilike.${pattern},content.ilike.${pattern},topic.ilike.${pattern}`)
        .limit(limit),
      client
        .from("files")
        .select("id, subject_id, kind, title, description")
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .limit(limit),
      client
        .from("links")
        .select("id, subject_id, title, description, url")
        .or(`title.ilike.${pattern},description.ilike.${pattern},url.ilike.${pattern}`)
        .limit(limit),
      client.from("subjects").select("id, name, slug").limit(500),
    ]);

    const subjectIndex: Record<string, { name: string; slug: string }> = {};
    for (const s of allSubjects.data ?? []) {
      subjectIndex[s.id] = { name: s.name, slug: s.slug };
    }

    return {
      subjects: subjects.data ?? [],
      notes: notes.data ?? [],
      files: files.data ?? [],
      links: links.data ?? [],
      subjectIndex,
    };
  });
