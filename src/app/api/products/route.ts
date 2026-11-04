/**
 * api/products/route.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. حذف استيراد guard غير المستخدم.
 *   2. serverError في GET يحمل رسالة مخصصة + context للسجلات.
 *   3. transaction يُرجع ProductRow مباشرة (أنظف من [product]).
 *
 * ✅ المنطق الأمني والوظيفي بدون تغيير:
 *   - permissionGuard للتحقق من الصلاحية.
 *   - category scope check لـ category_manager.
 *   - معاملة ذرّية (منتج + حركة مخزون).
 *   - logActivity بعد commit.
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productInventoryMovements, productModifiers, products, stores } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getProducts, getProductsByStore, toProductDTO } from "@/lib/data";
import { parseProductPayload } from "@/lib/payloads";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

/* ───────────── List ───────────── */

export async function GET(request: Request) {
  const denied = await permissionGuard("products.read");
  if (denied) return denied;

  try {
    const user = await getCurrentUser();
    const requestedStoreId = new URL(request.url).searchParams.get("storeId");
    const storeId = requestedStoreId ? Number(requestedStoreId) : null;
    if (requestedStoreId && (!Number.isInteger(storeId) || Number(storeId) <= 0)) {
      return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    }

    const rows = storeId ? await getProductsByStore(storeId) : await getProducts();
    // Category managers only see products in their allowed categories.
    const visible =
      user?.role === "category_manager"
        ? rows.filter((product) => user.allowedCategories.includes(product.category))
        : rows;
    return NextResponse.json({ products: visible });
  } catch (error) {
    return serverError(error, "تعذر تحميل المنتجات", "products");
  }
}

/* ───────────── Create ───────────── */

export async function POST(request: Request) {
  const denied = await permissionGuard("products.write");
  if (denied) return denied;

  try {
    const parsed = parseProductPayload(await request.json().catch(() => null));
    if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const value = parsed.value;
    const [targetStore] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, value.storeId)).limit(1);
    if (!targetStore) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 400 });

    // Category managers may only create products in their allowed categories.
    const scopeDenied = await permissionGuard("products.write", value.category);
    if (scopeDenied) return scopeDenied;

    const actor = await getCurrentUser();

    const created = await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          storeId: value.storeId,
          sku: value.sku?.trim() || `SKU-${Date.now().toString().slice(-8)}`,
          name: value.name,
          animalType: value.animalType,
          category: value.category,
          kind: value.kind,
          description: value.description,
          weightKg: String(value.weightKg),
          pricePerKg: String(value.pricePerKg),
          fixedPrice: value.fixedPrice === null ? null : String(value.fixedPrice),
          stock: value.stock,
          imageUrl: value.imageUrl ?? null,
          origin: value.origin,
          isActive: value.isActive,
          isFeatured: value.isFeatured,
        })
        .returning();

      await tx.insert(productInventoryMovements).values({
        productId: product.id,
        productName: product.name,
        previousStock: 0,
        newStock: product.stock,
        reason: "إنشاء منتج",
        actorName: actor?.name ?? "النظام",
      });

      if (value.modifiers?.length) {
        await tx.insert(productModifiers).values(
          value.modifiers.map((modifier) => ({
            productId: product.id,
            name: modifier.name,
            type: modifier.type,
            required: modifier.required,
            options: modifier.options,
          })),
        );
      }

      return product;
    });

    await logActivity(
      "إضافة منتج",
      "المنتجات",
      created.id,
      `${created.name} — ${created.category}`,
    );

    return NextResponse.json({ product: { ...toProductDTO(created), modifiers: value.modifiers ?? [] } }, { status: 201 });
  } catch (error) {
    return serverError(error, "تعذر إضافة المنتج", "products");
  }
}