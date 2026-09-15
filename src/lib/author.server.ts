import { useSession } from "@tanstack/react-start/server";

type AuthorSession = { author?: boolean };

const SESSION_NAME = "study-portal-author";

function sessionConfig() {
  const password = process.env["AUTHOR_SESSION_SECRET"];
  if (!password) throw new Error("AUTHOR_SESSION_SECRET is not configured");
  return {
    password,
    name: SESSION_NAME,
    maxAge: 60 * 60 * 24 * 14,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function getAuthorSession() {
  return useSession<AuthorSession>(sessionConfig());
}

export async function isAuthor(): Promise<boolean> {
  const session = await getAuthorSession();
  return session.data.author === true;
}

/** Throws unless the caller holds a valid author session. Every mutation uses this. */
export async function requireAuthor(): Promise<void> {
  if (!(await isAuthor())) {
    throw new Error("Not authorized. Author access required.");
  }
}

const ITERATIONS = 150_000;

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${ITERATIONS}$${toHex(salt.buffer)}$${hash}`;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const salt = fromHex(parts[2]!);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: Number(parts[1]),
      hash: "SHA-256",
    },
    key,
    256,
  );
  return timingSafeEqualHex(toHex(bits), parts[3]!);
}

/** Reads the stored password hash, seeding it from the AUTHOR_PASSWORD secret on first use. */
export async function getStoredPasswordHash(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("portal_settings")
    .select("password_hash")
    .eq("id", 1)
    .maybeSingle();

  if (data?.password_hash) return data.password_hash;

  const seed = process.env["AUTHOR_PASSWORD"];
  if (!seed) return null;
  const hash = await hashPassword(seed);
  await supabaseAdmin.from("portal_settings").upsert({ id: 1, password_hash: hash });
  return hash;
}

export async function setStoredPasswordHash(hash: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("portal_settings").upsert({ id: 1, password_hash: hash });
  if (error) throw new Error(error.message);
}
