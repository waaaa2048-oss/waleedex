import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hitLimit, normalizePhone, verifyOtp } from "@/lib/otp";
import { CUSTOMER_COOKIE, createCustomerSession } from "@/lib/customer-auth";
import { sessionCookieOptions } from "@/lib/cookies";
import {
  VERIFIED_PHONE_COOKIE,
  VERIFIED_PHONE_TTL_SECONDS,
  createVerifiedPhoneToken,
} from "@/lib/customer-verification";

export const dynamic = "force-dynamic";

/**
 * التحقق من رمز العميل.
 * - يفشل مغلقاً: لا يُسجَّل دخول إلا إذا طابق الرمز المخزَّن فعلاً.
 * - عميل موجود: جلسة خادم حقيقية في كوكي httpOnly.
 * - عميل جديد: كوكي موقّع قصير العمر يثبت ملكية الجوال لخطوة إكمال البيانات.
 * كوكي user_phone يبقى للعرض فقط في الواجهة، والخادم لا يثق به أبداً.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown; code?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!phone || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: "أدخل رقم الجوال ورمز التحقق المكوّن من 6 أرقام" },
      { status: 400 },
    );
  }

  if (!(await hitLimit(`customer:otp:verify:phone:${phone}`, 10, 15 * 60 * 1000))) {
    return NextResponse.json(
      { success: false, error: "محاولات كثيرة، حاول لاحقاً" },
      { status: 429 },
    );
  }

  try {
    const valid = await verifyOtp("customer", phone, code);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "رمز التحقق غير صحيح أو منتهي" },
        { status: 400 },
      );
    }

    const customer = await prisma.customers.findFirst({ where: { phone } });

    if (!customer) {
      const response = NextResponse.json({
        success: true,
        isNewUser: true,
        message: "الرقم صحيح، يرجى إكمال تسجيل البيانات",
      });
      response.cookies.set(
        VERIFIED_PHONE_COOKIE,
        createVerifiedPhoneToken(phone),
        sessionCookieOptions(request, VERIFIED_PHONE_TTL_SECONDS),
      );
      return response;
    }

    const { token, maxAge } = await createCustomerSession(customer.id);
    const response = NextResponse.json({
      success: true,
      isNewUser: false,
      message: "تم التحقق وتسجيل الدخول بنجاح",
    });
    response.cookies.set(CUSTOMER_COOKIE, token, sessionCookieOptions(request, maxAge));
    response.cookies.set(VERIFIED_PHONE_COOKIE, "", sessionCookieOptions(request, 0));
    // للعرض فقط في الواجهة (اسم الحساب في الهيدر). ليس دليل هوية.
    response.cookies.set("user_phone", phone, {
      ...sessionCookieOptions(request, maxAge),
      httpOnly: false,
      sameSite: "lax",
      partitioned: false,
    });
    return response;
  } catch (error) {
    console.error("[verify-otp] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "تعذر التحقق من الرمز" },
      { status: 500 },
    );
  }
}
