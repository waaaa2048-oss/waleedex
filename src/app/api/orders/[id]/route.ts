import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { getOrderById } from "@/lib/data";
import { isOrderStatus, parseOrderPayload, updateOrder, type OrderUpdatePayload } from "@/lib/orders";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const denied = await permissionGuard("orders.read");
  if (denied) return denied;
  try {
    const { id } = await params;
    const order = await getOrderById(Number(id));
    if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const denied = await permissionGuard("orders.update");
  if (denied) return denied;
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

    if (Array.isArray(body.items)) {
      const parsed = parseOrderPayload(body);
      if (   parsed.ok === false) {
        const errorMessage = (parsed as { error?: string; message?: string }).error || 
                             (parsed as { error?: string; message?: string }).message || 
                             "بيانات الطلب غير صالحةة";
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
      const order = await updateOrder(orderId, parsed.value);
      return NextResponse.json({ order });
    }

    const patch: OrderUpdatePayload = {};
    if ("status" in body) {
      if (!isOrderStatus(body.status)) return NextResponse.json({ error: "حالة الطلب غير صالحة" }, { status: 400 });
      patch.status = body.status;
    }
    if ("notes" in body) patch.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    if ("paymentMethod" in body && typeof body.paymentMethod === "string") patch.paymentMethod = body.paymentMethod;
    if ("paidAmount" in body) patch.paidAmount = Math.max(0, Number(body.paidAmount) || 0);
    if ("deliveryDate" in body) patch.deliveryDate = typeof body.deliveryDate === "string" ? body.deliveryDate : null;
    if ("deliveryAddress" in body)
      patch.deliveryAddress = typeof body.deliveryAddress === "string" ? body.deliveryAddress : null;

    const order = await updateOrder(orderId, patch);
    await logActivity("تحديث طلب", "الطلبات", order.id, `${order.code} — ${order.status}`);
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof Error && error.message.includes("غير موجود")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return serverError(error, "تعذر تحديث الطلب");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await permissionGuard("orders.delete");
  if (denied) return denied;
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    const [deleted] = await db.delete(orders).where(eq(orders.id, orderId)).returning({ id: orders.id });
    if (!deleted) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    await logActivity("حذف طلب", "الطلبات", deleted.id);
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    return serverError(error, "تعذر حذف الطلب");
  }
}