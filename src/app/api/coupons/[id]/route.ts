import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const denied = await permissionGuard("coupons.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    if (code.length < 3) return NextResponse.json({ error: "أدخل كود الكوبون" }, { status: 400 });
    const typeRaw = typeof body?.type === "string" ? body.type : "percent";

    const [updated] = await db
      .update(coupons)
      .set({
        code,
        type: ["percent", "fixed", "freeShipping"].includes(typeRaw) ? typeRaw : "percent",
        value: String(Math.max(0, Number(body?.value) || 0)),
        minOrder: String(Math.max(0, Number(body?.minOrder) || 0)),
        usageLimit: Math.max(0, Math.round(Number(body?.usageLimit) || 0)),
        description: typeof body?.description === "string" ? body.description.trim() : "",
        expiresAt: typeof body?.expiresAt === "string" && body.expiresAt ? body.expiresAt : null,
        isActive: typeof body?.isActive === "boolean" ? body.isActive : true,
      })
      .where(eq(coupons.id, Number(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "الكوبون غير موجود" }, { status: 404 });
    await logActivity("تعديل كوبون", "التسويق", updated.id, updated.code);
    return NextResponse.json({ coupon: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (error) {
    return serverError(error, "تعذر تحديث الكوبون");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await permissionGuard("coupons.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const [deleted] = await db.delete(coupons).where(eq(coupons.id, Number(id))).returning({ id: coupons.id, code: coupons.code });
    if (!deleted) return NextResponse.json({ error: "الكوبون غير موجود" }, { status: 404 });
    await logActivity("حذف كوبون", "التسويق", deleted.id, deleted.code);
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    return serverError(error, "تعذر حذف الكوبون");
  }
}
