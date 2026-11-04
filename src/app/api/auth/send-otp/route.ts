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

    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "رقم الجوال مطلوب" },
        { status: 400 }
      );
    }

    // توليد رمز تحقق من 4 أرقام
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // صلاحية 5 دقائق

    // محاولة تخزين الرمز في قاعدة البيانات (إذا وجد الجدول) مع منع إيقاف التنفيذ لو حدث خطأ بالجدول
    try {
      const dbAny = prisma as any;
      if (dbAny.otp_codes) {
        await dbAny.otp_codes.deleteMany({ where: { phone } });
        await dbAny.otp_codes.create({
          data: { phone, code, expiresAt },
        });
      }
    } catch (dbErr) {
      console.log("Database skip or notice:", dbErr);
    }

    // تنسيق رقم الجوال للواتساب
    let formattedPhone = phone.trim().replace("+", "").replace(/^0/, "966");
    const chatId = `${formattedPhone}@c.us`;

    const idInstance = process.env.GREEN_API_ID_INSTANCE;
    const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;

    if (!idInstance || !apiTokenInstance) {
      return NextResponse.json(
        { success: false, error: "بيانات Green API غير مكتملة في ملف .env" },
        { status: 500 }
      );
    }

    // إرسال الرمز عبر Green API
    const waResponse = await fetch(
      `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId,
          message: `رمز التحقق الخاص بك هو: ${code}`,
        }),
      }
    );

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      return NextResponse.json(
        { success: false, error: "فشل إرسال الواتساب من المزود", details: waData },
        { status: 500 }
      );
    }

    // رد ناجح 100% بصيغة JSON
    return NextResponse.json({
      success: true,
      message: "تم إرسال رمز التحقق عبر الواتساب بنجاح",
    });

  } catch (error: any) {
    console.error("Critical API Error in send-otp:", error);
    // إرجاع استجابة JSON حصراً حتى لو حدث خطأ فادح لمنع ظهور خطأ الـ <!DOCTYPE>
    return NextResponse.json(
      { success: false, error: error?.message || "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}