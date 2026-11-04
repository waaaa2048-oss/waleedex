import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

type ProductUpdates = {
  animalType?: string;
  category?: string;
  isActive?: boolean;
  pricePerKg?: number;
  fixedPrice?: number | null;
};

function parseIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5000) return null;
  const ids = [...new Set(value.map(Number))];
  return ids.length === value.length && ids.every((id) => Number.isSafeInteger(id) && id > 0) ? ids : null;
}

export async function PATCH(request: Request) {
  const denied = await permissionGuard("products.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown; updates?: ProductUpdates } | null;
    const ids = parseIds(body?.ids);
    const updates = body?.updates;
    if (!ids || !updates || typeof updates !== "object") {
      return NextResponse.json({ error: "حدد منتجات صالحة والتعديلات المطلوبة" }, { status: 400 });
    }
    const allowedKeys = ["animalType", "category", "isActive", "pricePerKg", "fixedPrice"];
    if (Object.keys(updates).length === 0 || Object.keys(updates).some((key) => !allowedKeys.includes(key))) {
      return NextResponse.json({ error: "التعديلات المرسلة غير صالحة" }, { status: 400 });
    }
    if (updates.animalType !== undefined &&
      (typeof updates.animalType !== "string" || !updates.animalType.trim() || updates.animalType.length > 32)) {
      return NextResponse.json({ error: "نوع المنتج غير صالح" }, { status: 400 });
    }
    if (updates.category !== undefined &&
      (typeof updates.category !== "string" || !updates.category.trim() || updates.category.length > 100)) {
      return NextResponse.json({ error: "تصنيف المنتج غير صالح" }, { status: 400 });
    }
    if (updates.isActive !== undefined && typeof updates.isActive !== "boolean") {
      return NextResponse.json({ error: "حالة العرض غير صالحة" }, { status: 400 });
    }
    if (updates.pricePerKg !== undefined &&
      (typeof updates.pricePerKg !== "number" || !Number.isFinite(updates.pricePerKg) || updates.pricePerKg <= 0)) {
      return NextResponse.json({ error: "سعر الكيلو يجب أن يكون أكبر من صفر" }, { status: 400 });
    }
    if (updates.fixedPrice !== undefined && updates.fixedPrice !== null &&
      (typeof updates.fixedPrice !== "number" || !Number.isFinite(updates.fixedPrice) || updates.fixedPrice <= 0)) {
      return NextResponse.json({ error: "السعر الثابت يجب أن يكون أكبر من صفر أو يُترك فارغاً" }, { status: 400 });
    }

    const existing = await db.select().from(products).where(inArray(products.id, ids));
    if (existing.length !== ids.length) {
      return NextResponse.json({ error: "تعذر العثور على جميع المنتجات المحددة" }, { status: 404 });
    }
    const user = await getCurrentUser();
    for (const product of existing) {
      if (user?.role === "category_manager" && !user.allowedCategories.includes(product.category)) {
        return NextResponse.json({ error: "صلاحيتك تقتصر على تصنيفاتك المحددة" }, { status: 403 });
      }
      if (user?.role === "category_manager" && updates.category !== undefined &&
        !user.allowedCategories.includes(updates.category.trim())) {
        return NextResponse.json({ error: "لا يمكنك نقل المنتج إلى تصنيف خارج صلاحيتك" }, { status: 403 });
      }
      const pricePerKg = updates.pricePerKg ?? Number(product.pricePerKg);
      const fixedPrice = updates.fixedPrice === undefined ? Number(product.fixedPrice ?? 0) : Number(updates.fixedPrice ?? 0);
      if (fixedPrice <= 0 && (pricePerKg <= 0 || Number(product.weightKg) <= 0)) {
        return NextResponse.json({ error: `لا يمكن تطبيق السعر على "${product.name}" لأنه لن ينتج عنه سعر صالح` }, { status: 400 });
      }
    }

    const set: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
    if (updates.animalType !== undefined) set.animalType = updates.animalType.trim();
    if (updates.category !== undefined) set.category = updates.category.trim();
    if (updates.isActive !== undefined) set.isActive = updates.isActive;
    if (updates.pricePerKg !== undefined) set.pricePerKg = String(updates.pricePerKg);
    if (updates.fixedPrice !== undefined) set.fixedPrice = updates.fixedPrice === null ? null : String(updates.fixedPrice);

    const updated = await db.transaction(async (tx) =>
      tx.update(products).set(set).where(inArray(products.id, ids)).returning({ id: products.id }),
    );
    await logActivity("تعديل جماعي للمنتجات", "المنتجات", null, `${updated.length} منتج`);
    return NextResponse.json({ updatedCount: updated.length });
  } catch (error) {
    return serverError(error, "تعذر تطبيق التعديلات على المنتجات");
  }
}

export async function DELETE(request: Request) {
  const denied = await permissionGuard("products.delete");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = parseIds(body?.ids);
    if (!ids) return NextResponse.json({ error: "حدد منتجات صالحة للحذف" }, { status: 400 });

    const existing = await db.select({ id: products.id, category: products.category }).from(products).where(inArray(products.id, ids));
    if (existing.length !== ids.length) {
      return NextResponse.json({ error: "تعذر العثور على جميع المنتجات المحددة" }, { status: 404 });
    }
    const user = await getCurrentUser();
    for (const product of existing) {
      if (user?.role === "category_manager" && !user.allowedCategories.includes(product.category)) {
        return NextResponse.json({ error: "صلاحيتك تقتصر على تصنيفاتك المحددة" }, { status: 403 });
      }
    }

    const deleted = await db.transaction(async (tx) =>
      tx.delete(products).where(inArray(products.id, ids)).returning({ id: products.id }),
    );
    await logActivity("حذف جماعي للمنتجات", "المنتجات", null, `${deleted.length} منتج`);
    return NextResponse.json({ deletedCount: deleted.length });
  } catch (error) {
    return serverError(error, "تعذر حذف المنتجات المحددة");
  }
}
