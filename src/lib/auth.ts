/**
 * auth.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. scrypt بمعاملات OWASP 2025 (N=131072 بدل 16384).
 *   2. صيغة v2$salt:hash جديدة — تدعم التحقق من كلمات المرور القديمة والجديدة.
 *   3. needsRehash() للترقية التلقائية عند الدخول.
 *   4. deleteExpiredSessions() تُستدعى تلقائياً في createSession.
 *   5. helpers جديدة: setSessionCookie / clearSessionCookie.
 *   6. تسجيل أخطاء DB في getCurrentUser.
 */

import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { sessionCookieOptions } from "@/lib/cookies";

/* ───────────── scrypt with explicit params ───────────── */

type ScryptOptions = { N: number; r: number; p: number; maxmem: number };

const scrypt = promisify(scryptCallback) as unknown as (
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

// OWASP 2025 recommendation. ~128 MB per hash. Reduce to 1 << 16 if OOM.
const STRONG_PARAMS: ScryptOptions = { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
// Node.js default — only used to verify hashes created before the upgrade.
const LEGACY_PARAMS: ScryptOptions = { N: 1 << 14, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

/* ───────────── Constants ───────────── */

export const SESSION_COOKIE = "dhibhati_session_v2";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  permissions: string[];
  allowedCategories: string[];
};

/* ───────────── Password hashing ───────────── */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, STRONG_PARAMS);
  return `v2$${salt}:${derived.toString("hex")}`;
}

/** Returns true if the stored hash uses the old format and should be upgraded on next login. */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith("v2$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const isV2 = stored.startsWith("v2$");
  const raw = isV2 ? stored.slice(3) : stored;
  const [salt, key] = raw.split(":");
  if (!salt || !key) return false;
  const params = isV2 ? STRONG_PARAMS : LEGACY_PARAMS;
  try {
    const derived = await scrypt(password, salt, 64, params);
    const expected = Buffer.from(key, "hex");
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

/* ───────────── Sessions ───────────── */

export async function createSession(userId: number) {
  // Cleanup expired rows on every new session (fast with the expires_at index).
  await deleteExpiredSessions();

  const token = `v2_${randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ token, userId, expiresAt });
  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function deleteExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/* ───────────── Cookie helpers ───────────── */

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  store.set(SESSION_COOKIE, token, sessionCookieOptions(undefined, maxAge));
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", sessionCookieOptions(undefined, 0));
}

/* ───────────── Current user ───────────── */

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token?.startsWith("v2_")) return null;

  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        permissions: users.permissions,
        allowedCategories: users.allowedCategories,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      permissions: row.permissions ?? [],
      allowedCategories: row.allowedCategories ?? [],
    };
  } catch (error) {
    console.error("[auth] getCurrentUser failed:", error);
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=staff");
  return user;
}

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;