import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { integrations, stores, storeSettings } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { getDefaultStoreId, getIntegrations, getStoreSettings } from "@/lib/admin-data";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

function readStoreId(value: unknown): number | null {
  const storeId = Number(value);
  return Number.isInteger(storeId) && storeId > 0 ? storeId : null;
}

async function ensureStore(storeId: number) {
  const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId)).limit(1);
  return store;
}

export async function GET(request: Request) {
  const denied = await permissionGuard("integrations.write");
  if (denied) return denied;
  try {
    const rawStoreId = new URL(request.url).searchParams.get("storeId");
    const storeId = rawStoreId === null ? await getDefaultStoreId() : readStoreId(rawStoreId);
    if (storeId === null) return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    if (!(await ensureStore(storeId))) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 404 });
    return NextResponse.json({ integrations: await getIntegrations(storeId) });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const denied = await permissionGuard("integrations.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const storeId = readStoreId(body?.storeId);
    if (storeId === null) return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    if (!(await ensureStore(storeId))) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 404 });
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (body?.category === "الدفع") {
      return NextResponse.json({ error: "تُدار طرق الدفع من صفحة الدفع والبوابات المركزية" }, { status: 400 });
    }
    if (name.length < 2) return NextResponse.json({ error: "أدخل اسم الموقع أو الأداة" }, { status: 400 });
    if (url && !/^https?:\/\//i.test(url)) return NextResponse.json({ error: "الرابط يجب أن يبدأ بـ https://" }, { status: 400 });

    const [created] = await db
      .insert(integrations)
      .values({
        storeId,
        key: `custom-${Date.now()}`,
        name,
        category: typeof body?.category === "string" && body.category.trim() ? body.category.trim() : "أدوات أخرى",
        url: url || "https://",
        accountId: typeof body?.accountId === "string" && body.accountId.trim() ? body.accountId.trim() : null,
        isEnabled: typeof body?.isEnabled === "boolean" ? body.isEnabled : true,
        notes: typeof body?.notes === "string" ? body.notes.trim() : "",
      })
      .returning();

    await logActivity("إضافة تكامل", "التكاملات", created.id, created.name);
    return NextResponse.json({ integration: created }, { status: 201 });
  } catch (error) {
    return serverError(error, "تعذر إضافة التكامل");
  }
}

export async function PATCH(request: Request) {
  const denied = await permissionGuard("integrations.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
    const storeId = readStoreId(body?.storeId);
    if (storeId === null) return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    if (!(await ensureStore(storeId))) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 404 });

    const [existing] = await db
      .select({ key: integrations.key, category: integrations.category })
      .from(integrations)
      .where(and(eq(integrations.id, id), eq(integrations.storeId, storeId)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "التكامل غير موجود" }, { status: 404 });
    if (existing.category === "الدفع") {
      return NextResponse.json({ error: "تُدار طرق الدفع من صفحة الدفع والبوابات المركزية" }, { status: 409 });
    }

    let accountId = typeof body?.accountId === "string" && body.accountId.trim() ? body.accountId.trim() : null;
    if (existing.key === "whatsapp") {
      const rawPhone = accountId ?? "";
      accountId = rawPhone.replace(/\D/g, "") || null;
      if (rawPhone && accountId && (accountId.length < 8 || accountId.length > 15)) {
        return NextResponse.json({ error: "أدخل رقم واتساب دولياً من 8 إلى 15 رقماً" }, { status: 400 });
      }
    }

    if (existing.key === "whatsapp") {
      await getStoreSettings(storeId);
    }
    const updated = await db.transaction(async (tx) => {
      const [integration] = await tx
        .update(integrations)
        .set({
          url: typeof body?.url === "string" && body.url.trim() ? body.url.trim() : "https://",
          accountId,
          isEnabled: typeof body?.isEnabled === "boolean" ? body.isEnabled : false,
          notes: typeof body?.notes === "string" ? body.notes.trim() : "",
          updatedAt: new Date(),
        })
        .where(and(eq(integrations.id, id), eq(integrations.storeId, storeId)))
        .returning();

      if (integration?.key === "whatsapp") {
        await tx
          .update(storeSettings)
          .set({ whatsapp: accountId ?? "", updatedAt: new Date() })
          .where(eq(storeSettings.storeId, storeId));
      }
      return integration;
    });

    if (!updated) return NextResponse.json({ error: "التكامل غير موجود" }, { status: 404 });
    await logActivity("تحديث تكامل", "التكاملات", updated.id, `${updated.name} — ${updated.isEnabled ? "مفعّل" : "موقوف"}`);
    return NextResponse.json({ integration: updated });
  } catch (error) {
    return serverError(error, "تعذر حفظ التكامل");
  }
}

export async function DELETE(request: Request) {
  const denied = await permissionGuard("integrations.write");
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
    const rawStoreId = url.searchParams.get("storeId");
    const storeId = rawStoreId === null ? null : readStoreId(rawStoreId);
    if (storeId === null) return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    const [deleted] = await db
      .delete(integrations)
      .where(and(eq(integrations.id, id), eq(integrations.storeId, storeId), sql`${integrations.category} <> 'الدفع'`))
      .returning({ id: integrations.id, name: integrations.name });
    if (!deleted) return NextResponse.json({ error: "التكامل غير موجود" }, { status: 404 });
    await logActivity("حذف تكامل", "التكاملات", deleted.id, deleted.name);
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    return serverError(error, "تعذر حذف التكامل");
  }
}
