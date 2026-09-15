import { createServerFn } from "@tanstack/react-start";

/* ------------------------------------------------------------------ */
/* Author session                                                      */
/* ------------------------------------------------------------------ */

export const getAuthorStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isAuthor } = await import("./author.server");
  return { isAuthor: await isAuthor() };
});

export const authorLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    if (typeof data?.password !== "string") throw new Error("Password is required");
    return { password: data.password };
  })
  .handler(async ({ data }) => {
    const { getStoredPasswordHash, verifyPassword, getAuthorSession, issueAuthorToken } =
      await import("./author.server");
    const stored = await getStoredPasswordHash();
    if (!stored) {
      return { ok: false as const, reason: "not-configured" as const };
    }
    const valid = await verifyPassword(data.password, stored);
    if (!valid) return { ok: false as const, reason: "invalid" as const };

    const session = await getAuthorSession();
    await session.update({ author: true });
    return { ok: true as const, token: await issueAuthorToken() };
  });

export const authorLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAuthorSession } = await import("./author.server");
  const session = await getAuthorSession();
  await session.clear();
  return { ok: true as const };
});

export const changeAuthorPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { current: string; next: string }) => data)
  .handler(async ({ data }) => {
    const {
      requireAuthor,
      getStoredPasswordHash,
      verifyPassword,
      hashPassword,
      setStoredPasswordHash,
    } = await import("./author.server");
    await requireAuthor();

    if (!data.next || data.next.length < 8) {
      return { ok: false as const, message: "New password must be at least 8 characters." };
    }
    const stored = await getStoredPasswordHash();
    if (stored && !(await verifyPassword(data.current, stored))) {
      return { ok: false as const, message: "Current password is incorrect." };
    }
    await setStoredPasswordHash(await hashPassword(data.next));
    return { ok: true as const, message: "Password updated." };
  });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "subject"
  );
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------------------------------------------ */
/* Subjects                                                            */
/* ------------------------------------------------------------------ */

export const saveSubject = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      description: string;
      coverUrl: string | null;
      position?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const db = await admin();

    const name = data.name.trim();
    if (!name) throw new Error("Subject name is required.");

    if (data.id) {
      const { error } = await db
        .from("subjects")
        .update({
          name,
          description: data.description.trim(),
          cover_url: data.coverUrl,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }

    let slug = slugify(name);
    const { data: existing } = await db.from("subjects").select("slug").like("slug", `${slug}%`);
    if (existing?.some((row) => row.slug === slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: inserted, error } = await db
      .from("subjects")
      .insert({
        name,
        slug,
        description: data.description.trim(),
        cover_url: data.coverUrl,
        position: data.position ?? 0,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: inserted.id };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const db = await admin();
    const { deleteFromDrive } = await import("./drive.server");

    const { data: files } = await db
      .from("files")
      .select("drive_file_id")
      .eq("subject_id", data.id);
    for (const file of files ?? []) {
      await deleteFromDrive(file.drive_file_id);
    }

    const { error } = await db.from("subjects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

export const saveNote = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      subjectId: string;
      title: string;
      content: string;
      topic: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const db = await admin();

    const payload = {
      subject_id: data.subjectId,
      title: data.title.trim(),
      content: data.content,
      topic: data.topic?.trim() || null,
    };
    if (!payload.title) throw new Error("Note title is required.");

    if (data.id) {
      const { error } = await db.from("notes").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    const { error } = await db.from("notes").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteNote = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const db = await admin();
    const { error } = await db.from("notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

export const saveLink = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      subjectId: string;
      title: string;
      url: string;
      description: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const db = await admin();

    const url = data.url.trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("Link must start with http:// or https://");

    const payload = {
      subject_id: data.subjectId,
      title: data.title.trim(),
      url,
      description: data.description?.trim() || null,
    };
    if (!payload.title) throw new Error("Link title is required.");

    if (data.id) {
      const { error } = await db.from("links").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    const { error } = await db.from("links").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteLink = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const db = await admin();
    const { error } = await db.from("links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Files (Google Drive)                                                */
/* ------------------------------------------------------------------ */

export const uploadCoverImage = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; mimeType: string; base64: string }) => data)
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const { uploadToDrive } = await import("./drive.server");
    const uploaded = await uploadToDrive({
      name: data.fileName,
      mimeType: data.mimeType,
      base64: data.base64,
    });
    return { ok: true as const, url: uploaded.thumbnailUrl };
  });

export const uploadMaterial = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      subjectId: string;
      kind: "pdf" | "image";
      title: string;
      description: string | null;
      fileName: string;
      mimeType: string;
      base64: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const { uploadToDrive } = await import("./drive.server");
    const db = await admin();

    const uploaded = await uploadToDrive({
      name: data.fileName,
      mimeType: data.mimeType,
      base64: data.base64,
    });

    const { error } = await db.from("files").insert({
      subject_id: data.subjectId,
      kind: data.kind,
      title: data.title.trim() || data.fileName,
      description: data.description?.trim() || null,
      drive_file_id: uploaded.driveFileId,
      mime_type: uploaded.mimeType,
      size_bytes: uploaded.sizeBytes,
      view_url: uploaded.viewUrl,
      thumbnail_url: uploaded.thumbnailUrl,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateMaterial = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; title: string; description: string | null }) => data)
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const db = await admin();
    const { error } = await db
      .from("files")
      .update({ title: data.title.trim(), description: data.description?.trim() || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteMaterial = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireAuthor } = await import("./author.server");
    await requireAuthor();
    const db = await admin();
    const { deleteFromDrive } = await import("./drive.server");

    const { data: file } = await db
      .from("files")
      .select("drive_file_id")
      .eq("id", data.id)
      .maybeSingle();
    if (file?.drive_file_id) await deleteFromDrive(file.drive_file_id);

    const { error } = await db.from("files").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
