import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** تحديث بيانات حساب العميل الحالي (الاسم والبريد) — يتطلب جلسة عميل صالحة. */
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "سجّل الدخول أولاً" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || body.action !== "update") {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "الاسم يجب أن يكون بين 2 و80 حرفاً" }, { status: 400 });
  }
  if (email && (email.length > 120 || !EMAIL_PATTERN.test(email))) {
    return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
  }

  try {
    await db
      .update(customers)
      .set({ name, email: email || null })
      .where(eq(customers.id, customer.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account] update failed:", error);
    return NextResponse.json({ error: "تعذر تحديث البيانات" }, { status: 500 });
  }
}
