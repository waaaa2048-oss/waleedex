import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const denied = await permissionGuard("categories.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 2) return NextResponse.json({ error: "أدخل اسم القسم" }, { status: 400 });

    const [previous] = await db.select().from(categories).where(eq(categories.id, Number(id))).limit(1);
    if (!previous) return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 });

    const [updated] = await db
      .update(categories)
      .set({
        name,
        slug: typeof body?.slug === "string" && body.slug.trim() ? body.slug.trim() : name,
        blurb: typeof body?.blurb === "string" ? body.blurb.trim() : "",
        imageUrl: typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
        sortOrder: Math.round(Number(body?.sortOrder) || 0),
        isActive: typeof body?.isActive === "boolean" ? body.isActive : true,
        isHighlight: typeof body?.isHighlight === "boolean" ? body.isHighlight : false,
      })
      .where(eq(categories.id, Number(id)))
      .returning();

    if (previous.name !== updated.name) {
      await db
        .update(products)
        .set({ category: updated.name })
        .where(and(eq(products.category, previous.name), eq(products.storeId, previous.storeId)));
    }
    await logActivity("تعديل قسم", "التصنيفات", updated.id, updated.name);
    return NextResponse.json({ category: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (error) {
    return serverError(error, "تعذر تحديث القسم");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await permissionGuard("categories.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, Number(id)))
      .returning({ id: categories.id, name: categories.name });
    if (!deleted) return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 });
    await logActivity("حذف قسم", "التصنيفات", deleted.id, deleted.name);
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    return serverError(error, "تعذر حذف القسم");
  }
}
