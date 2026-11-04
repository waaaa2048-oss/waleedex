import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { phone, code } = await request.json();

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const storedCode = global.otpCache ? global.otpCache[cleanPhone] : null;

    if (storedCode && storedCode === code) {
      // إزالة الرمز بعد الاستخدام لزيادة الأمان
      delete global.otpCache[cleanPhone];

      // تحديد الدور (مالك أو تجريبي)
      const role = (cleanPhone === "966574045310") ? "owner" : "tester";

      return NextResponse.json({
        success: true,
        message: "تم التحقق بنجاح!",
        role: role
      });
    } else {
      return NextResponse.json(
        { success: false, error: "رمز التحقق غير صحيح أو انتهت صلاحيته." },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم." },
      { status: 500 }
    );
  }
}