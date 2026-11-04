import { NextResponse } from 'next/server';

// قائمة الأرقام المعتمدة (المالك + الـ 3 أرقام التجريبية)
const AUTHORIZED_NUMBERS = [
  "966574045310", // رقم المالك (وليد)
  "966503405514", // الرقم التجريبي الأول
  "966553638586", // الرقم التجريبي الثاني
  "966538155727"  // الرقم التجريبي الثالث
];

// ذاكرة مؤقتة لتخزين الرموز
global.otpCache = global.otpCache || {};

export async function POST(request) {
  try {
    const { phone } = await request.json();

    // تنظيف رقم الجوال من أي رموز أو مسافات
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';

    if (!cleanPhone || !AUTHORIZED_NUMBERS.includes(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: "عذراً، هذا الرقم غير مسجل ضمن الفترة التجريبية الحالية." },
        { status: 403 }
      );
    }

    // توليد رمز OTP عشوائي من 4 أرقام
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // حفظ الرمز مؤقتاً في الذاكرة
    global.otpCache[cleanPhone] = otpCode;

    // رابط إرسال الرسالة عبر Green API
    const greenApiUrl = "https://7107.api.greenapi.com/waInstance710722783298/sendMessage/d458e9cb1c884ec8aae31e8f9e699fd69f01cb4c0452440ca7";

    const payload = {
      chatId: `${cleanPhone}@c.us`,
      message: `رمز التحقق الخاص بك لمتجر أهل الكرم هو: ${otpCode}`,
      typingTime: 1000
    };

    const response = await fetch(greenApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.idMessage) {
      return NextResponse.json({ 
        success: true, 
        message: "تم إرسال رمز التحقق إلى الواتساب بنجاح!" 
      });
    } else {
      return NextResponse.json(
        { success: false, error: "حدث خطأ أثناء إرسال الرسالة عبر Green API." },
        { status: 500 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الاتصال بالسيرفر." },
      { status: 500 }
    );
  }
}