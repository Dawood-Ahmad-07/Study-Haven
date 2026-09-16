import { useSession } from "@tanstack/react-start/server";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

type AuthorSession = { author?: boolean; v?: number };

const SESSION_NAME = "study-portal-author";

function sessionConfig() {
  const password = process.env["AUTHOR_SESSION_SECRET"];
  if (!password) throw new Error("AUTHOR_SESSION_SECRET is not configured");
  return {
    password,
    name: SESSION_NAME,
    maxAge: 60 * 60 * 24 * 3,
    cookie: {
      httpOnly: true,
      secure: true,
      // The app is viewed inside the Lovable preview iframe (cross-site),
      // so the session cookie must be SameSite=None to be sent back.
      sameSite: "none" as const,
      path: "/",
    },
  };
}

export async function getAuthorSession() {
  return useSession<AuthorSession>(sessionConfig());
}

/** 3 days — short enough that a leaked token expires quickly, renewed silently while active. */
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 3;

function secret(): string {
  const value = process.env["AUTHOR_SESSION_SECRET"];
  if (!value) throw new Error("AUTHOR_SESSION_SECRET is not configured");
  return value;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig);
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------------------------------------------ */
/* Session version — lets one click invalidate every issued token      */
/* ------------------------------------------------------------------ */

export async function getSessionVersion(): Promise<number> {
  const { data } = await (await db())
    .from("portal_settings")
    .select("session_version")
    .eq("id", 1)
    .maybeSingle();
  return data?.session_version ?? 1;
}

export async function bumpSessionVersion(): Promise<void> {
  const current = await getSessionVersion();
  await (await db())
    .from("portal_settings")
    .upsert({ id: 1, session_version: current + 1 });
}

/* ------------------------------------------------------------------ */
/* Author token                                                        */
/* ------------------------------------------------------------------ */

/** Bearer-style author token — works where third-party cookies are blocked (preview iframe). */
export async function issueAuthorToken(): Promise<string> {
  const exp = Date.now() + TOKEN_TTL_MS;
  const version = await getSessionVersion();
  return `${exp}.${version}.${await sign(`author:${exp}:${version}`)}`;
}

async function verifyAuthorToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expRaw, versionRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  const version = Number(versionRaw);
  if (!expRaw || !versionRaw || !sig) return false;
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (!Number.isInteger(version)) return false;
  if (!timingSafeEqualHex(await sign(`author:${exp}:${version}`), sig)) return false;
  return version === (await getSessionVersion());
}

/** True when the token is valid but close to expiry, so the client can be handed a fresh one. */
export function tokenNeedsRenewal(token: string | undefined): boolean {
  if (!token) return false;
  const exp = Number(token.split(".")[0]);
  if (!Number.isFinite(exp)) return false;
  return exp - Date.now() < TOKEN_TTL_MS / 3;
}

export async function currentAuthorToken(): Promise<string | undefined> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  return getRequestHeader("x-author-token" as never) as string | undefined;
}

export async function isAuthor(): Promise<boolean> {
  const header = await currentAuthorToken();
  if (await verifyAuthorToken(header)) return true;
  const session = await getAuthorSession();
  if (session.data.author !== true) return false;
  return (session.data.v ?? 0) === (await getSessionVersion());
}

/** Throws unless the caller holds a valid author session. Every mutation uses this. */
export async function requireAuthor(): Promise<void> {
  if (!(await isAuthor())) {
    throw new Error("Not authorized. Author access required.");
  }
}

/* ------------------------------------------------------------------ */
/* Owner key — only the portal owner may change the password           */
/* ------------------------------------------------------------------ */

export function ownerKeyConfigured(): boolean {
  return Boolean(process.env["AUTHOR_OWNER_KEY"]);
}

export function verifyOwnerKey(provided: string): boolean {
  const expected = process.env["AUTHOR_OWNER_KEY"];
  if (!expected) return false;
  const a = toHex(sha256(new TextEncoder().encode(provided)).buffer);
  const b = toHex(sha256(new TextEncoder().encode(expected)).buffer);
  return timingSafeEqualHex(a, b);
}

/* ------------------------------------------------------------------ */
/* Request identity, rate limiting and audit log                       */
/* ------------------------------------------------------------------ */

export async function requestIpHash(): Promise<string> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const raw =
    (getRequestHeader("cf-connecting-ip" as never) as string | undefined) ??
    (getRequestHeader("x-forwarded-for" as never) as string | undefined) ??
    "unknown";
  const ip = raw.split(",")[0]!.trim();
  return toHex(sha256(new TextEncoder().encode(`${secret()}:${ip}`)).buffer).slice(0, 32);
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 1000 * 60 * 10;
const LOCK_MS = 1000 * 60 * 10;

export type LoginGate = { allowed: boolean; retryInSeconds: number };

export async function checkLoginAllowed(ipHash: string): Promise<LoginGate> {
  const { data } = await (await db())
    .from("author_login_attempts")
    .select("attempts, window_start, locked_until")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (!data?.locked_until) return { allowed: true, retryInSeconds: 0 };
  const until = new Date(data.locked_until).getTime();
  if (until <= Date.now()) return { allowed: true, retryInSeconds: 0 };
  return { allowed: false, retryInSeconds: Math.ceil((until - Date.now()) / 1000) };
}

export async function registerFailedLogin(ipHash: string): Promise<void> {
  const client = await db();
  const { data } = await client
    .from("author_login_attempts")
    .select("id, attempts, window_start")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  const now = Date.now();
  const withinWindow =
    data?.window_start && now - new Date(data.window_start).getTime() < WINDOW_MS;
  const attempts = withinWindow ? (data?.attempts ?? 0) + 1 : 1;

  const row = {
    ip_hash: ipHash,
    attempts,
    window_start: withinWindow ? data!.window_start : new Date(now).toISOString(),
    locked_until:
      attempts >= MAX_ATTEMPTS ? new Date(now + LOCK_MS).toISOString() : null,
  };

  if (data?.id) {
    await client.from("author_login_attempts").update(row).eq("id", data.id);
  } else {
    await client.from("author_login_attempts").insert(row);
  }
}

export async function clearLoginAttempts(ipHash: string): Promise<void> {
  await (await db()).from("author_login_attempts").delete().eq("ip_hash", ipHash);
}

export async function audit(action: string, target?: string | null): Promise<void> {
  try {
    await (await db()).from("author_audit_log").insert({
      action,
      target: target ?? null,
      ip_hash: await requestIpHash(),
    });
  } catch (error) {
    console.error("audit log failed", error);
  }
}

/* ------------------------------------------------------------------ */
/* Password hashing                                                    */
/* ------------------------------------------------------------------ */

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
  return toHex(pbkdf2(sha256, new TextEncoder().encode(password), salt, { c: ITERATIONS, dkLen: 32 }).buffer);
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
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) return false;
  const salt = fromHex(parts[2]!);
  const bits = pbkdf2(sha256, new TextEncoder().encode(password), salt, {
    c: iterations,
    dkLen: 32,
  });
  return timingSafeEqualHex(toHex(bits.buffer), parts[3]!);
}

/** Reads the stored password hash, seeding it from the AUTHOR_PASSWORD secret on first use. */
export async function getStoredPasswordHash(): Promise<string | null> {
  const client = await db();
  const { data } = await client
    .from("portal_settings")
    .select("password_hash")
    .eq("id", 1)
    .maybeSingle();

  if (data?.password_hash) return data.password_hash;

  const seed = process.env["AUTHOR_PASSWORD"];
  if (!seed) return null;
  const hash = await hashPassword(seed);
  await client.from("portal_settings").upsert({ id: 1, password_hash: hash });
  return hash;
}

export async function setStoredPasswordHash(hash: string): Promise<void> {
  const client = await db();
  const { error } = await client.from("portal_settings").upsert({ id: 1, password_hash: hash });
  if (error) throw new Error(error.message);
}
