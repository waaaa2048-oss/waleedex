/**
 * auth/login-form/route.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. Rate limiting (8/15min email + 30/15min IP) — كان غائباً.
 *   2. Dummy hash لمنع timing attack.
 *   3. ترقية تلقائية لـ hash القديم عند نجاح الدخول.
 *   4. rate limit قبل ensureSeeded (توفير استعلامات DB).
 *   5. باقي المنطق (redirect + cookie) بدون تغيير.
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSession,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/lib/auth";
import { checkCustomerAuthLimit } from "@/lib/customer-auth-limits";
import { publicUrl, sessionCookieOptions } from "@/lib/cookies";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

const DUMMY_HASH = `v2$${"00".repeat(16)}:${"00".repeat(64)}`;

/**
 * Native HTML form login (no JavaScript fetch).
 * The form uses target="_top", so the whole window navigates top-level and the
 * session cookie is always stored as a first-party cookie — even inside preview iframes.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const nextRaw = String(form.get("next") ?? "/dashboard");
    const requestedNext = new URL(nextRaw, request.url);
    const requestOrigin = new URL(request.url).origin;
    const next =
      requestedNext.origin === requestOrigin
        ? `${requestedNext.pathname}${requestedNext.search}${requestedNext.hash}`
        : "/dashboard";

    if (!email || !password) {
      return NextResponse.redirect(publicUrl(request, "/customer/login?role=staff&error=empty"));
    }

    // Rate limit BEFORE any DB work.
    const [emailAllowed, ipAllowed] = await Promise.all([
      checkCustomerAuthLimit(request, "staff-login-form", email, 8, 15 * 60_000),
      checkCustomerAuthLimit(request, "staff-login-form-ip", "*", 30, 15 * 60_000),
    ]);
    if (!emailAllowed || !ipAllowed) {
      return NextResponse.redirect(
        publicUrl(request, "/customer/login?role=staff&error=rate_limit"),
      );
    }

    await ensureSeeded();

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    // Always run scrypt — even if user doesn't exist — to keep timing consistent.
    const passwordMatches = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      return NextResponse.redirect(
        publicUrl(request, "/customer/login?role=staff&error=credentials"),
      );
    }

    // Silently upgrade legacy hashes on successful login.
    if (needsRehash(user.passwordHash)) {
      try {
        await db
          .update(users)
          .set({ passwordHash: await hashPassword(password) })
          .where(eq(users.id, user.id));
      } catch (error) {
        console.error("[login-form] password rehash failed:", error);
      }
    }

    const { token } = await createSession(user.id);
    await logActivity(
      "تسجيل دخول",
      "الحساب",
      user.id,
      `${user.name} — ${user.email} — ${user.role}`,
    );

    const response = NextResponse.redirect(publicUrl(request, next), 303);
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(request, SESSION_TTL_SECONDS),
    );
    return response;
  } catch (error) {
    console.error("[login-form]", error);
    return NextResponse.redirect(publicUrl(request, "/customer/login?role=staff&error=server"));
  }
}

export async function GET(request: Request) {
  return NextResponse.redirect(publicUrl(request, "/customer/login?role=staff"));
}