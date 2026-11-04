import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "صيغة البيانات المرسلة غير صحيحة" },
        { status: 400 }
      );
    }

    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: "رقم الجوال ورمز التحقق مطلوبان" },
        { status: 400 }
      );
    }

    // 1. التحقق من كود الـ OTP
    const dbAny = prisma as any;
    if (dbAny.otp_codes) {
      const record = await dbAny.otp_codes.findFirst({
        where: { phone, code },
      });

      if (!record) {
        return NextResponse.json(
          { success: false, error: "رمز التحقق غير صحيح" },
          { status: 400 }
        );
      }

      if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
        return NextResponse.json(
          { success: false, error: "انتهت صلاحية رمز التحقق" },
          { status: 400 }
        );
      }

      await dbAny.otp_codes.delete({ where: { id: record.id } }).catch(() => {});
    }

    // 2. البحث عن العميل في جدول customers القائم
    const customer = await prisma.customers.findFirst({
      where: { phone },
    });

    const isNewUser = !customer;

    const response = NextResponse.json({
      success: true,
      isNewUser,
      user: customer || { phone },
      message: isNewUser
        ? "الرقم صحيح، يرجى إكمال تسجيل البيانات"
        : "تم التحقق وتسجيل الدخول بنجاح",
    });

    // 3. تعيين الكوكي للعميل
    response.cookies.set("user_phone", phone, {
      httpOnly: false, // متاح للواجهة وقراءة الجلسة
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 يوم
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Critical API Error in verify-otp:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
