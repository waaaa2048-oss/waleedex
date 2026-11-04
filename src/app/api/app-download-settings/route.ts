import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings, stores } from "@/db/schema";
import { getDefaultStoreId } from "@/lib/admin-data";
import { permissionGuard, serverError } from "@/lib/api";
import { normalizeAppDownloadSettings } from "@/lib/store-defaults";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const rawStoreId = new URL(request.url).searchParams.get("storeId");
    const storeId = rawStoreId === null ? await getDefaultStoreId() : Number(rawStoreId);
    if (!Number.isInteger(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "المتجر المحدد غير صالح" }, { status: 400 });
    }
    const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 404 });

    const body = (await request.json().catch(() => null)) as { settings?: unknown } | null;
    if (!body || !body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ error: "إعدادات صفحة التطبيق غير صالحة" }, { status: 400 });
    }

    const settings = normalizeAppDownloadSettings(body.settings);
    await db.insert(storeSettings).values({ storeId, appDownloadSettings: settings }).onConflictDoUpdate({
      target: storeSettings.storeId,
      set: { appDownloadSettings: settings, updatedAt: new Date() },
    });
    const [row] = await db.select({ settings: storeSettings.appDownloadSettings })
      .from(storeSettings)
      .where(eq(storeSettings.storeId, storeId))
      .limit(1);
    await logActivity("تحديث صفحة تنزيل التطبيق", "التطبيقات", storeId, "تم حفظ محتوى صفحة تنزيل التطبيق");
    return NextResponse.json({ settings: normalizeAppDownloadSettings(row?.settings) });
  } catch (error) {
    return serverError(error, "تعذر حفظ إعدادات صفحة التطبيق");
  }
}
