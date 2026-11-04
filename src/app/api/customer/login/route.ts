/**
 * customer/login/route.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. await لكل استدعاء checkCustomerAuthLimit (الدالة صارت async).
 *   2. Promise.all لتشغيل الفحصين بالتوازي (أسرع).
 *   3. باقي المنطق بدون تغيير.
 */

import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { CUSTOMER_COOKIE, createCustomerSession, normalizePhone } from "@/lib/customer-auth";
import { checkCustomerAuthLimit } from "@/lib/customer-auth-limits";
import { sessionCookieOptions } from "@/lib/cookies";
import { verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
const DUMMY_PASSWORD_HASH = `${"00".repeat(16)}:${"00".repeat(64)}`;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { identifier?: unknown; password?: unknown } | null;
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const isEmail = identifier.includes("@");
    const lookup = isEmail ? identifier : normalizePhone(identifier);

    if (!lookup || !password) {
      return NextResponse.json(
        { error: "أدخل رقم الجوال أو البريد وكلمة المرور" },
        { status: 400 },
      );
    }

    const [loginAllowed, ipAllowed] = await Promise.all([
      checkCustomerAuthLimit(request, "login", lookup, 8, 10 * 60_000),
      checkCustomerAuthLimit(request, "login-ip", "*", 30, 10 * 60_000),
    ]);
    if (!loginAllowed || !ipAllowed) {
      return NextResponse.json(
        { error: "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا." },
        { status: 429 },
      );
    }

    const rows = await db
      .select()
      .from(customers)
      .where(
        isEmail
          ? and(eq(customers.email, lookup), isNotNull(customers.passwordHash))
          : and(eq(customers.phone, lookup), isNotNull(customers.passwordHash)),
      )
      .limit(2);
    const customer = rows.length === 1 && rows[0].passwordHash ? rows[0] : null;
    const passwordMatches = await verifyPassword(
      password,
      customer?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!customer || !passwordMatches) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة أو لا يوجد حساب بهذه البيانات" },
        { status: 401 },
      );
    }

    const { token, maxAge } = await createCustomerSession(customer.id);
    const response = NextResponse.json({
      ok: true,
      customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
    });
    response.cookies.set(CUSTOMER_COOKIE, token, sessionCookieOptions(request, maxAge));
    return response;
  } catch (error) {
    console.error("[customer-login]", error);
    return NextResponse.json({ error: "تعذر تسجيل الدخول، حاول لاحقًا" }, { status: 500 });
  }
}