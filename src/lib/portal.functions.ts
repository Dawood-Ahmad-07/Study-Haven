import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Author session                                                      */
/* ------------------------------------------------------------------ */

export const getAuthorStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isAuthor, currentAuthorToken, tokenNeedsRenewal, issueAuthorToken, ownerKeyConfigured } =
    await import("./author.server");
  const ok = await isAuthor();
  if (!ok) return { isAuthor: false as const, renewedToken: null, ownerKeyConfigured: false };

  const token = await currentAuthorToken();
  const renewedToken = tokenNeedsRenewal(token) ? await issueAuthorToken() : null;
  return { isAuthor: true as const, renewedToken, ownerKeyConfigured: ownerKeyConfigured() };
});

export const authorLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) =>
    z.object({ password: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const {
      getStoredPasswordHash,
      verifyPassword,
      getAuthorSession,
      issueAuthorToken,
      getSessionVersion,
      requestIpHash,
      checkLoginAllowed,
      registerFailedLogin,
      clearLoginAttempts,
      audit,
    } = await import("./author.server");

    const ipHash = await requestIpHash();
    const gate = await checkLoginAllowed(ipHash);
    if (!gate.allowed) {
      return {
        ok: false as const,
        reason: "rate-limited" as const,
        retryInSeconds: gate.retryInSeconds,
      };
    }

    const stored = await getStoredPasswordHash();
    if (!stored) {
      return { ok: false as const, reason: "not-configured" as const, retryInSeconds: 0 };
    }

    const valid = await verifyPassword(data.password, stored);
    if (!valid) {
      await registerFailedLogin(ipHash);
      await audit("login_failed");
      return { ok: false as const, reason: "invalid" as const, retryInSeconds: 0 };
    }

    await clearLoginAttempts(ipHash);
    const session = await getAuthorSession();
    await session.update({ author: true, v: await getSessionVersion() });
    await audit("login_success");
    return { ok: true as const, token: await issueAuthorToken() };
  });

export const authorLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAuthorSession } = await import("./author.server");
  const session = await getAuthorSession();
  await session.clear();
  return { ok: true as const };
});

/** Invalidates every author token and cookie session issued so far. */
export const logoutEverywhere = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAuthor, bumpSessionVersion, getAuthorSession, audit } = await import(
    "./author.server"
  );
  await requireAuthor();
  await bumpSessionVersion();
  const session = await getAuthorSession();
  await session.clear();
  await audit("logout_everywhere");
  return { ok: true as const };
});

export const changeAuthorPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { current: string; next: string; ownerKey: string }) =>
    z
      .object({
        current: z.string().max(200),
        next: z.string().max(200),
        ownerKey: z.string().max(400),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const {
      requireAuthor,
      getStoredPasswordHash,
      verifyPassword,
      hashPassword,
      setStoredPasswordHash,
      ownerKeyConfigured,
      verifyOwnerKey,
      bumpSessionVersion,
      issueAuthorToken,
      audit,
    } = await import("./author.server");
    await requireAuthor();

    if (!ownerKeyConfigured()) {
      return {
        ok: false as const,
        message: "The owner key is not set up yet, so the password cannot be changed.",
      };
    }
    if (!verifyOwnerKey(data.ownerKey)) {
      await audit("password_change_denied");
      return { ok: false as const, message: "Owner key is not correct." };
    }
    if (!data.next || data.next.length < 8) {
      return { ok: false as const, message: "New password must be at least 8 characters." };
    }
    const stored = await getStoredPasswordHash();
    if (stored && !(await verifyPassword(data.current, stored))) {
      return { ok: false as const, message: "Current password is incorrect." };
    }

    await setStoredPasswordHash(await hashPassword(data.next));
    // Every previously issued token stops working the moment the password changes.
    await bumpSessionVersion();
    await audit("password_changed");
    return {
      ok: true as const,
      message: "Password updated.",
      token: await issueAuthorToken(),
    };
  });

/** Recent author activity, for the dashboard. */
export const listAuditLog = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAuthor } = await import("./author.server");
  await requireAuthor();
  const db = await admin();
  const { data } = await db
    .from("author_audit_log")
    .select("id, action, target, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  return data ?? [];
});

/** Confirms the Google Drive connection still works, before an upload fails. */
export const checkStorageHealth = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAuthor } = await import("./author.server");
  await requireAuthor();
  const { driveHealth } = await import("./drive.server");
  return driveHealth();
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

const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
];
const MAX_BYTES = 8 * 1024 * 1024;

function assertUpload(mimeType: string, base64: string, kind: "pdf" | "image") {
  if (!ALLOWED_MIME.includes(mimeType)) {
    throw new Error("Only PDF and image files can be uploaded.");
  }
  if (kind === "pdf" && mimeType !== "application/pdf") {
    throw new Error("This slot only accepts PDF files.");
  }
  if (kind === "image" && !mimeType.startsWith("image/")) {
    throw new Error("This slot only accepts image files.");
  }
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_BYTES) throw new Error("File is larger than the 8 MB limit.");
}

/* ------------------------------------------------------------------ */
/* Subjects                                                            */
/* ------------------------------------------------------------------ */

const subjectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Subject name is required.").max(120),
  description: z.string().max(2000).default(""),
  coverUrl: z.string().url().max(1000).nullable(),
  position: z.number().int().min(0).max(10_000).optional(),
});

export const saveSubject = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subjectSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
    await requireAuthor();
    const db = await admin();

    const name = data.name.trim();

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
      await audit("subject_updated", name);
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
    await audit("subject_created", name);
    return { ok: true as const, id: inserted.id };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
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
    await audit("subject_deleted", data.id);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

const noteSchema = z.object({
  id: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  title: z.string().trim().min(1, "Note title is required.").max(200),
  content: z.string().max(200_000).default(""),
  topic: z.string().max(80).nullable(),
});

export const saveNote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => noteSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
    await requireAuthor();
    const db = await admin();

    const payload = {
      subject_id: data.subjectId,
      title: data.title.trim(),
      content: data.content,
      topic: data.topic?.trim() || null,
    };

    if (data.id) {
      const { error } = await db.from("notes").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await audit("note_updated", payload.title);
      return { ok: true as const };
    }
    const { error } = await db.from("notes").insert(payload);
    if (error) throw new Error(error.message);
    await audit("note_created", payload.title);
    return { ok: true as const };
  });

export const deleteNote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
    await requireAuthor();
    const db = await admin();
    const { error } = await db.from("notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit("note_deleted", data.id);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

const linkSchema = z.object({
  id: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  title: z.string().trim().min(1, "Link title is required.").max(200),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => /^https?:\/\//i.test(value), "Link must start with http:// or https://"),
  description: z.string().max(1000).nullable(),
});

export const saveLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => linkSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
    await requireAuthor();
    const db = await admin();

    const payload = {
      subject_id: data.subjectId,
      title: data.title.trim(),
      url: data.url.trim(),
      description: data.description?.trim() || null,
    };

    if (data.id) {
      const { error } = await db.from("links").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await audit("link_updated", payload.title);
      return { ok: true as const };
    }
    const { error } = await db.from("links").insert(payload);
    if (error) throw new Error(error.message);
    await audit("link_created", payload.title);
    return { ok: true as const };
  });

export const deleteLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
    await requireAuthor();
    const db = await admin();
    const { error } = await db.from("links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit("link_deleted", data.id);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Files (Google Drive)                                                */
/* ------------------------------------------------------------------ */

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  base64: z.string().min(1),
});

export const uploadCoverImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => uploadSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
    await requireAuthor();
    assertUpload(data.mimeType, data.base64, "image");
    const { uploadToDrive } = await import("./drive.server");
    const uploaded = await uploadToDrive({
      name: data.fileName,
      mimeType: data.mimeType,
      base64: data.base64,
    });
    await audit("cover_uploaded", data.fileName);
    return { ok: true as const, url: uploaded.thumbnailUrl };
  });

export const uploadMaterial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    uploadSchema
      .extend({
        subjectId: z.string().uuid(),
        kind: z.enum(["pdf", "image"]),
        title: z.string().max(200),
        description: z.string().max(1000).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
    await requireAuthor();
    assertUpload(data.mimeType, data.base64, data.kind);

    const { uploadToDrive, deleteFromDrive } = await import("./drive.server");
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
    if (error) {
      // Roll the Drive upload back so no orphan file is left behind.
      await deleteFromDrive(uploaded.driveFileId);
      throw new Error(error.message);
    }
    await audit("material_uploaded", data.fileName);
    return { ok: true as const };
  });

export const updateMaterial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(1000).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
    await requireAuthor();
    const db = await admin();
    const { error } = await db
      .from("files")
      .update({ title: data.title.trim(), description: data.description?.trim() || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit("material_updated", data.title);
    return { ok: true as const };
  });

export const deleteMaterial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { requireAuthor, audit } = await import("./author.server");
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
    await audit("material_deleted", data.id);
    return { ok: true as const };
  });
