/**
 * me/route.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. حد أدنى لكلمة المرور: 12 حرفاً (كان 8).
 *   2. إبطال الجلسات الأخرى عند تغيير كلمة المرور.
 *   3. Rate limiting (5/15min) على تغيير كلمة المرور.
 *   4. تحقق صريح من currentPassword.
 *   5. تحقق من صيغة الجوال السعودي.
 *   6. تسجيل التغييرات في activityLogs.
 */

import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  SESSION_COOKIE,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { checkCustomerAuthLimit } from "@/lib/customer-auth-limits";
import { logActivity } from "@/lib/log";
import { serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

const PHONE_RE = /^05\d{8}$/;
const MAX_NAME = 120;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : current.name;
    const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const phone = phoneRaw === undefined ? current.phone : phoneRaw || null;

    if (name.length < 3) return NextResponse.json({ error: "أدخل الاسم الكامل" }, { status: 400 });
    if (name.length > MAX_NAME) {
      return NextResponse.json({ error: "الاسم طويل جداً" }, { status: 400 });
    }
    if (phone && !PHONE_RE.test(phone)) {
      return NextResponse.json(
        { error: "رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05" },
        { status: 400 },
      );
    }

    const values: Partial<typeof users.$inferInsert> = { name, phone };
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (newPassword) {
      // Rate-limit password-change attempts (protects against stolen-session brute-force).
      const allowed = await checkCustomerAuthLimit(
        request,
        "me-password-change",
        `user:${current.id}`,
        5,
        15 * 60_000,
      );
      if (!allowed) {
        return NextResponse.json(
          { error: "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا." },
          { status: 429 },
        );
      }

      const currentPassword =
        typeof body.currentPassword === "string" ? body.currentPassword : "";
      if (!currentPassword) {
        return NextResponse.json({ error: "أدخل كلمة المرور الحالية" }, { status: 400 });
      }

      const [row] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, current.id))
        .limit(1);
      if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
        return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
      }

      // Match the staff register policy: ≥ 12 chars, must contain a letter and a digit.
      if (
        newPassword.length < 12 ||
        newPassword.length > 128 ||
        !/[A-Za-z]/.test(newPassword) ||
        !/\d/.test(newPassword)
      ) {
        return NextResponse.json(
          { error: "كلمة المرور يجب أن تكون ١٢ حرفاً على الأقل وتشمل حرفاً ورقماً" },
          { status: 400 },
        );
      }

      values.passwordHash = await hashPassword(newPassword);
    }

    const [updated] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, current.id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
      });

    // On password change, revoke all OTHER sessions for this user (keep current).
    if (newPassword) {
      try {
        const store = await cookies();
        const currentToken = store.get(SESSION_COOKIE)?.value;
        if (currentToken) {
          await db
            .delete(sessions)
            .where(
              and(
                eq(sessions.userId, current.id),
                ne(sessions.token, currentToken),
              ),
            );
        }
      } catch (error) {
        console.error("[me] failed to revoke other sessions:", error);
      }
    }

    await logActivity(
      newPassword ? "تحديث الملف الشخصي وكلمة المرور" : "تحديث الملف الشخصي",
      "الحساب",
      current.id,
      `${updated?.name ?? name} — ${updated?.email ?? current.email}`,
    );

    return NextResponse.json({ user: updated });
  } catch (error) {
    return serverError(error, "تعذر تحديث الملف الشخصي");
  }
}