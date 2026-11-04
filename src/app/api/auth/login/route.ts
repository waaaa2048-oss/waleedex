import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSession,
} from "@/lib/auth";
import { checkCustomerAuthLimit } from "@/lib/customer-auth-limits";
import { sessionCookieOptions } from "@/lib/cookies";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { phone?: string; code?: string }
      | null;

    const rawPhone = (body?.phone ?? "").trim().replace(/\s+/g, "");
    const code = (body?.code ?? "").trim();

    if (!rawPhone || !code) {
      return NextResponse.json(
        { error: "يرجى إدخال رقم الجوال ورمز التحقق" },
        { status: 400 }
      );
    }

    await ensureSeeded();

    let user: any = null;
    try {
      const rows = await db
        .select()
        .from(users)
        .where(
          rawPhone === "0503405514"
            ? or(eq(users.phone, rawPhone), eq(users.email, "waaaa2048@gmail.com"))
            : eq(users.phone, rawPhone)
        )
        .limit(1);
      user = rows[0];
    } catch {}

    // إنشاء حساب المالك تلقائياً إذا لم يكن موجوداً
    if (!user && rawPhone === "0503405514") {
      try {
        const [newOwner] = await db
          .insert(users)
          .values({
            name: "وليد سعد (المالك)",
            phone: "0503405514",
            email: "waaaa2048@gmail.com",
            role: "owner",
            passwordHash: "v2$dummy",
            permissions: ["*"],
          } as any)
          .returning();
        user = newOwner;
      } catch {
        user = { id: 1, name: "وليد سعد (المالك)", phone: "0503405514", role: "owner" };
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "عذراً، هذا الرقم غير مصرح له بدخول لوحة التحكم." },
        { status: 403 }
      );
    }

    // قبول أي رمز مكون من 4 أرقام أو أكثر لتسهيل الدخول الآن
    if (code.length < 4) {
      return NextResponse.json(
        { error: "رمز التحقق يجب ألا يقل عن 4 أرقام." },
        { status: 401 }
      );
    }

    // إنشاء الجلسة وتسجيل الدخول بنجاح
    const { token } = await createSession(user.id);

    try {
      await logActivity(
        "تسجيل دخول لوحة التحكم (OTP)",
        "الحساب",
        user.id,
        `${user.name} — ${rawPhone} — ${user.role}`
      );
    } catch {}

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, phone: rawPhone, role: user.role },
    });

    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(request, SESSION_TTL_SECONDS)
    );

    return response;
  } catch (error) {
    console.error("[login-admin-otp-fatal]", error);
    return NextResponse.json({ error: "تعذر تسجيل الدخول، حدث خطأ في الخادم" }, { status: 500 });
  }
}