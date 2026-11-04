import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { parseCustomerPayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const denied = await permissionGuard("customers.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const customerId = Number(id);
    if (!Number.isInteger(customerId)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    const parsed = parseCustomerPayload(await request.json().catch(() => null));
    if (   parsed.ok === false) {
      const errorMessage = (parsed as { error?: string; message?: string }).error || 
                           (parsed as { error?: string; message?: string }).message || 
                           "بيانات العميل غير صالحة";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const [updated] = await db
      .update(customers)
      .set(parsed.value)
      .where(eq(customers.id, customerId))
      .returning();

    if (!updated) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    return NextResponse.json({ customer: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (error) {
    return serverError(error, "تعذر تحديث العميل");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await permissionGuard("customers.write");
  if (denied) return denied;
  try {
    const { id } = await params;
    const customerId = Number(id);
    if (!Number.isInteger(customerId)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    const [deleted] = await db
      .delete(customers)
      .where(eq(customers.id, customerId))
      .returning({ id: customers.id });

    if (!deleted) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    console.error("[customers:delete]", error);
    return NextResponse.json(
      { error: "لا يمكن حذف عميل مرتبط بطلبات سابقة. احتفظ بسجله أو احذف طلباته أولاً." },
      { status: 409 },
    );
  }
}