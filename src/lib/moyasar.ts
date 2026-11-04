/**
 * moyasar.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. قبول "captured" كحالة نجاح (إلى جانب "paid") — حماية من دفع مفقود.
 *   2. Early-return إذا كان الطلب مدفوعاً مسبقاً (idempotency).
 *   3. تسجيل تحذيرات أمنية عند فشل التحقق (لمراقبة محاولات التلاعب).
 *   4. باقي التحققات الصارمة بدون تغيير.
 */

import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getPaymentCredentials, isMoyasarCredentialsConfigured } from "@/lib/payment-credentials";

type MoyasarPayment = {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  source?: { type?: string; company?: string };
};

// Moyasar statuses that mean "money has been captured".
const SUCCESS_STATUSES = new Set(["paid", "captured"]);

export async function isMoyasarConfigured() {
  return isMoyasarCredentialsConfigured(await getPaymentCredentials());
}

async function fetchMoyasarPayment(paymentId: string) {
  const { moyasarSecretKey: secretKey } = await getPaymentCredentials();
  if (!secretKey || !/^sk_(test|live)_/.test(secretKey)) {
    throw new Error("مفتاح Moyasar السري غير مضبوط على الخادم");
  }
  const response = await fetch(
    `https://api.moyasar.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    },
  );
  const payment = (await response.json().catch(() => null)) as MoyasarPayment | null;
  if (!response.ok || !payment) {
    console.error("[moyasar] Payment lookup failed", response.status);
    throw new Error("تعذر التحقق من عملية الدفع عبر ميسر");
  }
  return payment;
}

export async function confirmMoyasarPayment(
  paymentId: string,
  orderId: number,
  customerId: number,
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) {
    throw new Error("معرّف عملية الدفع غير صالح");
  }

  const [order] = await db
    .select({
      id: orders.id,
      code: orders.code,
      customerId: orders.customerId,
      paymentMethod: orders.paymentMethod,
      totalAmount: orders.totalAmount,
      moyasarPaymentId: orders.moyasarPaymentId,
      moyasarPaymentStatus: orders.moyasarPaymentStatus,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.customerId !== customerId || order.paymentMethod !== "moyasar") {
    return { found: false as const, paid: false as const };
  }

  // Idempotency: if this order is already paid with this exact paymentId,
  // skip the network call and return early.
  if (
    order.moyasarPaymentId === paymentId &&
    SUCCESS_STATUSES.has(order.moyasarPaymentStatus)
  ) {
    return {
      found: true as const,
      paid: true,
      orderCode: order.code,
      status: order.moyasarPaymentStatus,
    };
  }

  const payment = await fetchMoyasarPayment(paymentId);
  const expectedAmount = Math.round(Number(order.totalAmount) * 100);

  // ── Strict integrity checks. Log specific failures for security audit. ──
  const failures: string[] = [];
  if (payment.id !== paymentId) failures.push("id");
  if (payment.currency !== "SAR") failures.push("currency");
  if (!Number.isInteger(payment.amount)) failures.push("amount_not_integer");
  if (payment.amount !== expectedAmount) failures.push("amount_mismatch");
  if (payment.description !== `Ahl Alkaram order ${order.code}`) failures.push("description");
  if (payment.metadata?.order_id !== String(order.id)) failures.push("metadata_order_id");
  if (!["creditcard", "applepay"].includes(payment.source?.type ?? "")) failures.push("source_type");

  if (failures.length > 0) {
    console.warn("[moyasar] payment verification failed", {
      orderId: order.id,
      orderCode: order.code,
      paymentId,
      failures,
      expectedAmount,
      actualAmount: payment.amount,
      actualCurrency: payment.currency,
      actualStatus: payment.status,
      sourceType: payment.source?.type,
    });
    throw new Error("بيانات الدفع المسترجعة من ميسر لا تطابق الطلب");
  }

  const paid = SUCCESS_STATUSES.has(payment.status ?? "");
  const status = typeof payment.status === "string" ? payment.status : "unknown";

  if (order.moyasarPaymentId && order.moyasarPaymentId !== paymentId) {
    console.warn("[moyasar] paymentId mismatch on same order", {
      orderId: order.id,
      existing: order.moyasarPaymentId,
      incoming: paymentId,
    });
    throw new Error("معرّف الدفع لا يطابق العملية المسجلة للطلب");
  }

  await db
    .update(orders)
    .set({
      moyasarPaymentStatus: status.slice(0, 40),
      ...(paid ? { moyasarPaymentId: paymentId, paidAmount: order.totalAmount } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, order.id), eq(orders.customerId, customerId)));

  return { found: true as const, paid, orderCode: order.code, status };
}