import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings, stores } from "@/db/schema";
import { getDefaultStoreId } from "@/lib/admin-data";
import { permissionGuard, serverError } from "@/lib/api";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

const DEFAULT_TYPES = ["عام", "خروف", "تيس", "لحم مفروم", "حاشي"];

function readStoreId(request: Request): number | null | undefined {
  const raw = new URL(request.url).searchParams.get("storeId");
  if (raw === null) return undefined;
  const storeId = Number(raw);
  return Number.isInteger(storeId) && storeId > 0 ? storeId : null;
}

export async function GET(request: Request) {
  const denied = await permissionGuard("products.read");
  if (denied) return denied;
  try {
    const requestedId = readStoreId(request);
    if (requestedId === null) return NextResponse.json({ error: "المتجر المحدد غير صالح" }, { status: 400 });
    const storeId = requestedId ?? await getDefaultStoreId();
    const [row] = await db
      .select({ types: storeSettings.productAnimalTypes })
      .from(storeSettings)
      .where(eq(storeSettings.storeId, storeId))
      .limit(1);
    return NextResponse.json({ types: row?.types?.length ? row.types : DEFAULT_TYPES });
  } catch (error) {
    return serverError(error, "تعذر تحميل أنواع المنتجات");
  }
}

export async function PUT(request: Request) {
  const denied = await permissionGuard("products.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as { types?: unknown } | null;
    const requestedId = readStoreId(request);
    if (requestedId === null) return NextResponse.json({ error: "المتجر المحدد غير صالح" }, { status: 400 });
    const storeId = requestedId ?? await getDefaultStoreId();
    if (!Array.isArray(body?.types) || body.types.length < 1 || body.types.length > 30) {
      return NextResponse.json({ error: "أضف نوعاً واحداً على الأقل، وبحد أقصى 30 نوعاً" }, { status: 400 });
    }

    const types = body.types.map((value) => (typeof value === "string" ? value.trim() : ""));
    if (types.some((value) => value.length < 1 || value.length > 32)) {
      return NextResponse.json({ error: "يجب أن يتراوح اسم النوع بين حرف واحد و32 حرفاً" }, { status: 400 });
    }
    const uniqueTypes = [...new Set(types)];
    if (uniqueTypes.length !== types.length) {
      return NextResponse.json({ error: "توجد أنواع مكررة" }, { status: 400 });
    }

    const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 404 });

    await db
      .insert(storeSettings)
      .values({ storeId, productAnimalTypes: uniqueTypes })
      .onConflictDoUpdate({
        target: storeSettings.storeId,
        set: { productAnimalTypes: uniqueTypes, updatedAt: new Date() },
      });

    await logActivity("تعديل أنواع المنتجات", "المنتجات", null, uniqueTypes.join("، "));
    return NextResponse.json({ types: uniqueTypes });
  } catch (error) {
    return serverError(error, "تعذر حفظ أنواع المنتجات");
  }
}
