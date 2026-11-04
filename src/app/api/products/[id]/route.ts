import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productInventoryMovements, productModifiers, products, stores } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { toProductDTO } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { parseProductPayload } from "@/lib/payloads";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const denied = await permissionGuard("products.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const productId = Number(id);
    if (!Number.isInteger(productId)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
    const [existingProduct] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!existingProduct) return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    const currentScopeDenied = await permissionGuard("products.write", existingProduct.category);
    if (currentScopeDenied) return currentScopeDenied;

    const parsed = parseProductPayload(await request.json().catch(() => null));
    if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const value = parsed.value;
    const scopeDenied = await permissionGuard("products.write", value.category);
    if (scopeDenied) return scopeDenied;
    const [targetStore] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, value.storeId)).limit(1);
    if (!targetStore) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 400 });

    const actor = await getCurrentUser();
    const updated = await db.transaction(async (tx) => {
      const [product] = await tx
        .update(products)
        .set({
          storeId: value.storeId,
          sku: value.sku,
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
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();
      if (product && product.stock !== existingProduct.stock) {
        await tx.insert(productInventoryMovements).values({
          productId: product.id,
          productName: product.name,
          previousStock: existingProduct.stock,
          newStock: product.stock,
          reason: "تعديل الكمية من إدارة المنتج",
          actorName: actor?.name ?? "النظام",
        });
      }
      await tx.delete(productModifiers).where(eq(productModifiers.productId, productId));
      if (product && value.modifiers?.length) {
        await tx.insert(productModifiers).values(
          value.modifiers.map((modifier) => ({
            productId,
            name: modifier.name,
            type: modifier.type,
            required: modifier.required,
            options: modifier.options,
          })),
        );
      }
      return product;
    });

    if (!updated) return NextResponse.json({ error: "الذبيحة غير موجودة" }, { status: 404 });
    await logActivity("تعديل منتج", "المنتجات", updated.id, updated.name);
    return NextResponse.json({ product: { ...toProductDTO(updated), modifiers: value.modifiers ?? [] } });
  } catch (error) {
    return serverError(error, "تعذر تحديث الذبيحة");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const productId = Number(id);
    if (!Number.isInteger(productId)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    const [existing] = await db.select({ category: products.category }).from(products).where(eq(products.id, productId)).limit(1);
    if (!existing) return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    const denied = await permissionGuard("products.delete", existing.category);
    if (denied) return denied;

    const [deleted] = await db.delete(products).where(eq(products.id, productId)).returning({ id: products.id });
    if (!deleted) return NextResponse.json({ error: "الذبيحة غير موجودة" }, { status: 404 });
    await logActivity("حذف منتج", "المنتجات", deleted.id);
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    return serverError(error, "تعذر حذف الذبيحة");
  }
}
