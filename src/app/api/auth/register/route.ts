import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "إنشاء حسابات الموظفين متاح للمالك فقط من لوحة التحكم ← الموظفون." },
    { status: 403 },
  );
}
