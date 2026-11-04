import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { getCoupons } from "@/lib/admin-data";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await permissionGuard("coupons.write");
  if (denied) return denied;
  try {
    return NextResponse.json({ coupons: await getCoupons() });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const denied = await permissionGuard("coupons.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    if (code.length < 3) return NextResponse.json({ error: "أدخل كود الكوبون (٣ أحرف على الأقل)" }, { status: 400 });
    const typeRaw = typeof body?.type === "string" ? body.type : "percent";
    const type = ["percent", "fixed", "freeShipping"].includes(typeRaw) ? typeRaw : "percent";

    const [created] = await db
      .insert(coupons)
      .values({
        code,
        type,
        value: String(Math.max(0, Number(body?.value) || 0)),
        minOrder: String(Math.max(0, Number(body?.minOrder) || 0)),
        usageLimit: Math.max(0, Math.round(Number(body?.usageLimit) || 0)),
        description: typeof body?.description === "string" ? body.description.trim() : "",
        expiresAt: typeof body?.expiresAt === "string" && body.expiresAt ? body.expiresAt : null,
        isActive: typeof body?.isActive === "boolean" ? body.isActive : true,
      })
      .returning();

    await logActivity("إنشاء كوبون", "التسويق", created.id, `${created.code}`);
    return NextResponse.json({ coupon: { ...created, createdAt: created.createdAt.toISOString() } }, { status: 201 });
  } catch (error) {
    console.error("[coupons]", error);
    return NextResponse.json({ error: "تعذر إنشاء الكوبون — تأكد أن الكود غير مستخدم" }, { status: 409 });
  }
}
