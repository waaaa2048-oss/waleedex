import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { name, email, phone } = await request.json();

    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: "جميع الحقول مطلوبة" },
        { status: 400 }
      );
    }

    // إنشاء العميل الجديد في جدول customers
    const newCustomer = await prisma.customers.create({
      data: {
        name,
        email,
        phone,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "تم إنشاء الحساب وتسجيل الدخول بنجاح",
      user: newCustomer,
    });

    response.cookies.set("user_phone", phone, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Error in register-details:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء حفظ بيانات العميل" },
      { status: 500 }
    );
  }
}
