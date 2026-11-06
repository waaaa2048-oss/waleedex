import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { permissionGuard } from "@/lib/api";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  PaymentReceiptValidationError,
  createPaymentReceiptSignedUrl,
  savePaymentReceipt,
} from "@/lib/payment-receipts";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** رفع/استبدال إيصال التحويل: للعميل صاحب الطلب فقط، ويُخزَّن في تخزين خاص (ليس public). */
export async function POST(request: Request, { params }: Context) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "سجّل الدخول بحساب العميل أولاً" }, { status: 401 });
  }

  const orderId = Number((await params).id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "معرّف الطلب غير صالح" }, { status: 400 });
  }

  try {
    const [order] = await db
      .select({ id: orders.id, customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order || order.customerId !== customer.id) {
      return NextResponse.json({ error: "الطلب غير موجود أو لا يخص هذا الحساب" }, { status: 404 });
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("receipt");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "لم يتم إرفاق أي ملف" }, { status: 400 });
    }

    const path = await savePaymentReceipt(orderId, file);
    await db.update(orders).set({ paymentReceiptPath: path }).where(eq(orders.id, orderId));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PaymentReceiptValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[order-receipt] upload failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "حدث خطأ أثناء رفع الإيصال" }, { status: 500 });
  }
}

/** عرض الإيصال للموظفين المخوّلين عبر رابط موقّع قصير العمر (يستخدمه زر "عرض إيصال التحويل"). */
export async function GET(_request: Request, { params }: Context) {
  const denied = await permissionGuard("orders.read");
  if (denied) return denied;

  const orderId = Number((await params).id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "معرّف الطلب غير صالح" }, { status: 400 });
  }

  try {
    const [order] = await db
      .select({ path: orders.paymentReceiptPath })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order?.path) {
      return NextResponse.json({ error: "لا يوجد إيصال لهذا الطلب" }, { status: 404 });
    }
    const signedUrl = await createPaymentReceiptSignedUrl(order.path);
    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    console.error("[order-receipt] view failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "تعذر عرض الإيصال" }, { status: 500 });
  }
}
