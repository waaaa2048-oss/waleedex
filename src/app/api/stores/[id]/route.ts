import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, stores } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

const STORE_TYPES = new Set(["SLAUGHTERHOUSE", "CLOTHING", "GROCERY", "FROZEN"]);
const STORE_STATUSES = new Set(["PRIVATE", "DRAFT", "PUBLISHED"]);

function slugify(value: string) {
  const trimmed = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");

  return trimmed || `store-${Date.now()}`;
}

export async function PATCH(request: Request, { params }: Context) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;

  try {
    const { id } = await params;
    const storeId = Number(id);
    if (!Number.isFinite(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 2) {
      return NextResponse.json({ error: "أدخل اسم المتجر" }, { status: 400 });
    }

    const rawSlug = typeof body?.slug === "string" ? body.slug.trim() : name;
    const nextSlug = slugify(rawSlug || name);
    const requestedType = typeof body?.storeType === "string" ? body.storeType : "SLAUGHTERHOUSE";
    const requestedStatus = typeof body?.status === "string" ? body.status : "DRAFT";
    const storeType = STORE_TYPES.has(requestedType) ? requestedType : "SLAUGHTERHOUSE";
    const status = STORE_STATUSES.has(requestedStatus) ? requestedStatus : "DRAFT";
    const logoUrl = typeof body?.logoUrl === "string" && body.logoUrl.trim() ? body.logoUrl.trim() : null;

    const [existing] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const [slugConflict] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, nextSlug))
      .limit(1);

    if (slugConflict && slugConflict.id !== storeId) {
      return NextResponse.json({ error: "هذا الرابط مستخدم بالفعل من متجر آخر" }, { status: 409 });
    }

    const [updated] = await db
      .update(stores)
      .set({
        name,
        slug: nextSlug,
        storeType,
        status,
        logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId))
      .returning();

    await logActivity("تعديل متجر", "المتاجر", updated.id, updated.name);
    return NextResponse.json({
      store: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return serverError(error, "تعذر تعديل المتجر", "stores");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;

  try {
    const { id } = await params;
    const storeId = Number(id);
    if (!Number.isFinite(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    }

    const allStores = await db.select({ id: stores.id }).from(stores);
    if (allStores.length <= 1) {
      return NextResponse.json({ error: "لا يمكن حذف آخر متجر في المنصة" }, { status: 400 });
    }

    const [existingOrder] = await db.select({ id: orders.id }).from(orders).where(eq(orders.storeId, storeId)).limit(1);
    if (existingOrder) {
      return NextResponse.json(
        { error: "لا يمكن حذف متجر لديه طلبات سابقة. غيّر حالته إلى خاص للاحتفاظ بسجل الطلبات." },
        { status: 409 },
      );
    }

    const [deleted] = await db.delete(stores).where(eq(stores.id, storeId)).returning({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
    });

    if (!deleted) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    await logActivity("حذف متجر", "المتاجر", deleted.id, deleted.name);
    return NextResponse.json({ ok: true, id: deleted.id, slug: deleted.slug });
  } catch (error) {
    return serverError(error, "تعذر حذف المتجر", "stores");
  }
}
