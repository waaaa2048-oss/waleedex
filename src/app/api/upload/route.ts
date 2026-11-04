import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم العثور على أي ملف للرفع" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${fileName}`,
    });
  } catch (error) {
    console.error("[Upload Error]", error);
    return NextResponse.json({ error: "فشل رفع الملف، حاول مرة أخرى" }, { status: 500 });
  }
}
