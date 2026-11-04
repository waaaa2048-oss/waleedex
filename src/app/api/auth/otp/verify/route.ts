import { NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { findStaffByIdentifier, hitLimit, verifyOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!identifier || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "أدخل الرمز المكوّن من 6 أرقام" }, { status: 400 });
  }

  if (!(await hitLimit(`otp:verify:id:${identifier.toLowerCase()}`, 10, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول لاحقاً" }, { status: 429 });
  }

  try {
    const user = await findStaffByIdentifier(identifier);
    const valid = user ? await verifyOtp("staff", String(user.id), code) : false;
    if (!user || !valid) {
      return NextResponse.json({ error: "الرمز غير صحيح أو منتهي" }, { status: 400 });
    }
    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[otp] verify failed:", error);
    return NextResponse.json({ error: "تعذر التحقق من الرمز" }, { status: 500 });
  }
}