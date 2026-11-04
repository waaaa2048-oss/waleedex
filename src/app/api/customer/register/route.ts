/**
 * customer/register/route.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. await لكل استدعاء checkCustomerAuthLimit (الدالة صارت async).
 *   2. Promise.all لتشغيل الفحصين بالتوازي.
 *   3. باقي المنطق (transaction + pg_advisory_xact_lock) بدون تغيير.
 */

import { NextResponse } from "next/server";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { CUSTOMER_COOKIE, createCustomerSession, normalizePhone } from "@/lib/customer-auth";
import { checkCustomerAuthLimit } from "@/lib/customer-auth-limits";
import { sessionCookieOptions } from "@/lib/cookies";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      phone?: unknown;
      email?: unknown;
      password?: unknown;
    } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "");
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "أدخل اسمًا من حرفين إلى ١٢٠ حرفًا" }, { status: 400 });
    }
    if (!/^05\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "أدخل رقم جوال سعودي صحيحًا" }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "أدخل بريدًا إلكترونيًا صحيحًا" }, { status: 400 });
    }
    if (password.length < 12 || password.length > 128) {
      return NextResponse.json({ error: "اجعل كلمة المرور ١٢ حرفًا على الأقل" }, { status: 400 });
    }

    const [phoneAllowed, ipAllowed] = await Promise.all([
      checkCustomerAuthLimit(request, "register", phone, 5, 60 * 60_000),
      checkCustomerAuthLimit(request, "register-ip", "*", 15, 60 * 60_000),
    ]);
    if (!phoneAllowed || !ipAllowed) {
      return NextResponse.json(
        { error: "طلبات كثيرة. انتظر قليلًا ثم حاول مجددًا." },
        { status: 429 },
      );
    }

    const passwordHash = await hashPassword(password);
    const created = await db.transaction(async (tx) => {
      const lockKeys = [`email:${email}`, `phone:${phone}`].sort();
      for (const key of lockKeys) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`);
      }
      const existing = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            isNotNull(customers.passwordHash),
            or(eq(customers.phone, phone), eq(customers.email, email)),
          ),
        )
        .limit(1);
      if (existing.length) return null;

      const [customer] = await tx
        .insert(customers)
        .values({ name, phone, email, passwordHash, city: "الرياض" })
        .returning({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
        });
      return customer;
    });

    if (!created) {
      return NextResponse.json(
        { error: "يوجد حساب مسجل بهذا الجوال أو البريد. سجّل الدخول بدل إنشاء حساب جديد." },
        { status: 409 },
      );
    }

    const { token, maxAge } = await createCustomerSession(created.id);
    const response = NextResponse.json({ ok: true, customer: created }, { status: 201 });
    response.cookies.set(CUSTOMER_COOKIE, token, sessionCookieOptions(request, maxAge));
    return response;
  } catch (error) {
    console.error("[customer-register]", error);
    return NextResponse.json({ error: "تعذر إنشاء الحساب، حاول لاحقًا" }, { status: 500 });
  }
}