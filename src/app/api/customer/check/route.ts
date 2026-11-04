/**
 * customer/check/route.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. await لكل استدعاء checkCustomerAuthLimit (الدالة صارت async).
 *   2. Promise.all لتشغيل الفحصين بالتوازي.
 *   3. باقي المنطق بدون تغيير.
 */

import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { normalizePhone } from "@/lib/customer-auth";
import { checkCustomerAuthLimit } from "@/lib/customer-auth-limits";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { identifier?: unknown } | null;
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
    const isEmail = identifier.includes("@");
    const lookup = isEmail ? identifier : normalizePhone(identifier);

    if (!lookup || (isEmail ? !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lookup) : !/^05\d{8}$/.test(lookup))) {
      return NextResponse.json({ error: "أدخل بريدًا أو رقم جوال صحيحًا" }, { status: 400 });
    }

    const [lookupAllowed, ipAllowed] = await Promise.all([
      checkCustomerAuthLimit(request, "check", lookup, 8, 10 * 60_000),
      checkCustomerAuthLimit(request, "check-ip", "*", 30, 10 * 60_000),
    ]);
    if (!lookupAllowed || !ipAllowed) {
      return NextResponse.json(
        { error: "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا." },
        { status: 429 },
      );
    }

    const exists = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          isNotNull(customers.passwordHash),
          isEmail ? eq(customers.email, lookup) : eq(customers.phone, lookup),
        ),
      )
      .limit(1);

    return NextResponse.json({ exists: exists.length > 0 });
  } catch (error) {
    console.error("[customer-check]", error);
    return NextResponse.json({ error: "تعذر التحقق من الحساب" }, { status: 500 });
  }
}