import { NextResponse } from "next/server";
import { hitLimit, issueOtp, normalizePhone } from "@/lib/otp";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * إرسال رمز تحقق للعميل عبر الواتساب.
 * - الرمز 6 أرقام عشوائي آمن (randomInt) ويُخزَّن مجزّأ (HMAC) لا نصاً صريحاً.
 * - حد للإرسال لكل جوال ولكل IP لمنع إغراق الواتساب أو تخمين الرموز.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
  if (!phone) {
    return NextResponse.json(
      { success: false, error: "أدخل رقم جوال سعودي صحيح (05XXXXXXXX)" },
      { status: 400 },
    );
  }

  const phoneAllowed = await hitLimit(`customer:otp:send:phone:${phone}`, 3, 15 * 60 * 1000);
  const ipAllowed = await hitLimit(`customer:otp:send:ip:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!phoneAllowed || !ipAllowed) {
    return NextResponse.json(
      { success: false, error: "محاولات كثيرة، حاول بعد قليل" },
      { status: 429 },
    );
  }

  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;
  if (!idInstance || !apiTokenInstance) {
    console.error("[send-otp] GREEN_API_* غير مضبوطة");
    return NextResponse.json(
      { success: false, error: "خدمة إرسال الرمز غير متاحة حالياً" },
      { status: 503 },
    );
  }

  try {
    const code = await issueOtp("customer", phone);
    const chatId = `966${phone.slice(1)}@c.us`;

    const response = await fetch(
      `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: `رمز التحقق الخاص بك هو: ${code}` }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      console.error("[send-otp] Green API failed with status", response.status);
      return NextResponse.json(
        { success: false, error: "تعذر إرسال الرمز، حاول مرة أخرى" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, message: "تم إرسال رمز التحقق عبر الواتساب" });
  } catch (error) {
    console.error("[send-otp] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "تعذر إرسال الرمز، حاول مرة أخرى" },
      { status: 500 },
    );
  }
}
