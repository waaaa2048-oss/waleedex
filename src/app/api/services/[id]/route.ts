import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { toServiceDTO } from "@/lib/data";
import { parseServicePayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const denied = await permissionGuard("services.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const serviceId = Number(id);
    if (!Number.isInteger(serviceId)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    const parsed = parseServicePayload(await request.json().catch(() => null));
    if (   parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const value = parsed.value;

    const [updated] = await db
      .update(services)
      .set({ ...value, price: String(value.price) })
      .where(eq(services.id, serviceId))
      .returning();

    if (!updated) return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
    return NextResponse.json({ service: toServiceDTO(updated) });
  } catch (error) {
    return serverError(error, "تعذر تحديث الخدمة");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await permissionGuard("services.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const serviceId = Number(id);
    if (!Number.isInteger(serviceId)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    const [deleted] = await db.delete(services).where(eq(services.id, serviceId)).returning({ id: services.id });
    if (!deleted) return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    return serverError(error, "تعذر حذف الخدمة");
  }
}
