import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/otp";
import { CUSTOMER_COOKIE, createCustomerSession } from "@/lib/customer-auth";
import { sessionCookieOptions } from "@/lib/cookies";
import { VERIFIED_PHONE_COOKIE, readVerifiedPhone } from "@/lib/customer-verification";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * إكمال بيانات عميل جديد.
 * لا يُنشأ حساب إلا إذا كان الجوال المطلوب هو نفسه الذي أثبت صاحبه ملكيته
 * برمز OTP في الخطوة السابقة (كوكي موقّع httpOnly).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; email?: unknown; phone?: unknown }
    | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;

  if (!name || !email || !phone) {
    return NextResponse.json({ success: false, error: "جميع الحقول مطلوبة" }, { status: 400 });
  }
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json(
      { success: false, error: "الاسم يجب أن يكون بين 2 و80 حرفاً" },
      { status: 400 },
    );
  }
  if (email.length > 120 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { success: false, error: "البريد الإلكتروني غير صالح" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const verifiedPhone = readVerifiedPhone(cookieStore.get(VERIFIED_PHONE_COOKIE)?.value);
  if (!verifiedPhone || verifiedPhone !== phone) {
    return NextResponse.json(
      { success: false, error: "يلزم التحقق من رقم الجوال أولاً" },
      { status: 403 },
    );
  }

  try {
    const existing = await prisma.customers.findFirst({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "هذا الرقم مسجّل مسبقاً، سجّل الدخول" },
        { status: 409 },
      );
    }

    const customer = await prisma.customers.create({ data: { name, email, phone } });

    const { token, maxAge } = await createCustomerSession(customer.id);
    const response = NextResponse.json({
      success: true,
      message: "تم إنشاء الحساب وتسجيل الدخول بنجاح",
      user: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
    });
    response.cookies.set(CUSTOMER_COOKIE, token, sessionCookieOptions(request, maxAge));
    response.cookies.set(VERIFIED_PHONE_COOKIE, "", sessionCookieOptions(request, 0));
    // للعرض فقط في الواجهة. ليس دليل هوية.
    response.cookies.set("user_phone", phone, {
      ...sessionCookieOptions(request, maxAge),
      httpOnly: false,
      sameSite: "lax",
      partitioned: false,
    });
    return response;
  } catch (error) {
    console.error("[register-details] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء حفظ بيانات العميل" },
      { status: 500 },
    );
  }
}
