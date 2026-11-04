import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "استعادة كلمة المرور غير متاحة حالياً؛ يجب التحقق من رقم الجوال أولاً." },
    { status: 410 },
  );
}
