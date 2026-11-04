import { NextResponse } from "next/server";
import { findStaffByIdentifier, hitLimit, issueOtp, sendOtpEmail } from "@/lib/otp";

export const dynamic = "force-dynamic";

const GENERIC = {
  ok: true,
  message: "إذا كان الحساب موجوداً أرسلنا رمز التحقق إلى بريده المسجّل.",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  if (!identifier) {
    return NextResponse.json({ error: "أدخل البريد أو رقم الجوال" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const allowed =
    (await hitLimit(`otp:req:ip:${ip}`, 10, 15 * 60 * 1000)) &&
    (await hitLimit(`otp:req:id:${identifier.toLowerCase()}`, 3, 10 * 60 * 1000));
  if (!allowed) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول لاحقاً" }, { status: 429 });
  }

  try {
    const user = await findStaffByIdentifier(identifier);
    if (user) {
      // نستخدم رقم المستخدم كمعرّف ثابت ليتطابق مع مسار التحقق
      const code = await issueOtp("staff", String(user.id), user.id); // تعديل
      await sendOtpEmail(user.email, code);
    }
    return NextResponse.json(GENERIC);
  } catch (error) {
    console.error("[otp] request failed:", error);
    return NextResponse.json({ error: "تعذر إرسال الرمز" }, { status: 500 });
  }
}