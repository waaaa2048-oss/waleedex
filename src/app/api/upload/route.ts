import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم العثور على أي ملف للرفع" }, { status: 400 });
    }

    const fileName = `receipts/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    const blob = await put(fileName, file, { access: "private" });

    return NextResponse.json({
      ok: true,
      url: blob.url,
    });
  } catch (error) {
    console.error("[Upload Error]", error);
    return NextResponse.json({ error: "فشل رفع الملف، حاول مرة أخرى" }, { status: 500 });
  }
}
