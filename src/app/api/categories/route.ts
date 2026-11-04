import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, stores } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getDefaultStoreId, getStoreCategories } from "@/lib/admin-data";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await permissionGuard("products.read");
  if (denied) return denied;
  try {
    const user = await getCurrentUser();
    const rawStoreId = new URL(request.url).searchParams.get("storeId");
    const storeId = rawStoreId === null ? undefined : Number(rawStoreId);
    if (rawStoreId !== null && (!Number.isInteger(storeId) || Number(storeId) <= 0)) {
      return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    }
    if (typeof storeId === "number") {
      const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId)).limit(1);
      if (!store) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 404 });
    }
    const rows = await getStoreCategories(storeId);
    const visible = user?.role === "category_manager"
      ? rows.filter((category) => user.allowedCategories.includes(category.name))
      : rows;
    return NextResponse.json({ categories: visible });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const denied = await permissionGuard("categories.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 2) return NextResponse.json({ error: "أدخل اسم القسم" }, { status: 400 });
    const storeId = body?.storeId === undefined ? await getDefaultStoreId() : Number(body.storeId);
    if (!Number.isInteger(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "المتجر المحدد غير صالح" }, { status: 400 });
    }
    const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 404 });

    const [created] = await db
      .insert(categories)
      .values({
        storeId,
        name,
        slug: typeof body?.slug === "string" && body.slug.trim() ? body.slug.trim() : name,
        blurb: typeof body?.blurb === "string" ? body.blurb.trim() : "",
        imageUrl: typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
        sortOrder: Math.round(Number(body?.sortOrder) || 0),
        isActive: typeof body?.isActive === "boolean" ? body.isActive : true,
        isHighlight: typeof body?.isHighlight === "boolean" ? body.isHighlight : false,
      })
      .returning();

    await logActivity("إضافة قسم", "التصنيفات", created.id, created.name);
    return NextResponse.json(
      { category: { ...created, createdAt: created.createdAt.toISOString(), productCount: 0 } },
      { status: 201 },
    );
  } catch (error) {
    return serverError(error, "تعذر إضافة القسم");
  }
}
