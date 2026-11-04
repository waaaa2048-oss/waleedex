/**
 * tabby.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. حفظ tabbyPaymentId في createTabbySession (حرج — بدون هذا الـ webhook لا يجد الطلب).
 *   2. Idempotency early-return إذا كان paid.
 *   3. معالجة race condition عند capture.
 *   4. إصلاح ثغرة الأموال المفقودة (capture رجع بدون CLOSED).
 *   5. expectedCustomerId اختياري في confirmTabbyPayment.
 *   6. meta.order_id = String(orderId) للاتساق مع moyasar.
 *   7. التحقق من payload.error حتى مع response.ok.
 *   8. city ديناميكية في shipping_address.
 *   9. تحقق من رقم الجوال.
 *  10. تسجيل تحذيرات أمنية عند فشل التحقق.
 */

import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getPaymentCredentials, isTabbyCredentialsConfigured } from "@/lib/payment-credentials";

type TabbyApiPayment = {
  id?: string;
  status?: string;
  amount?: string;
  currency?: string;
  order?: { reference_id?: string };
  captures?: { amount?: string }[];
};

type TabbyApiError = { error?: string; description?: string };

const SUCCESS_STATUSES = new Set(["CLOSED"]);
const FAILED_STATUSES = new Set(["REJECTED", "EXPIRED"]);

function tabbyApiBaseUrl() {
  const url = process.env.TABBY_API_BASE_URL || "https://api.tabby.sa";
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("يجب أن يستخدم رابط Tabby بروتوكول HTTPS");
  return parsed.origin;
}

async function tabbyCredentials() {
  const { tabbySecretKey: secretKey, tabbyMerchantCode: merchantCode } = await getPaymentCredentials();
  if (!secretKey || !merchantCode) throw new Error("إعدادات Tabby غير مكتملة على الخادم");
  return { secretKey, merchantCode, apiBaseUrl: tabbyApiBaseUrl() };
}

async function tabbyRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { secretKey, merchantCode, apiBaseUrl } = await tabbyCredentials();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "X-Merchant-Code": merchantCode,
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (T & TabbyApiError) | null;
  if (!response.ok || !payload) {
    console.error("[tabby] API request failed", response.status, payload?.error ?? "invalid response");
    throw new Error("تعذر إكمال طلب الدفع عبر تابي. حاول مرة أخرى أو اختر التحويل البنكي.");
  }
  // Some Tabby endpoints return 200 with a logical error object.
  if (payload.error) {
    console.error("[tabby] API logical error", payload.error, payload.description ?? "");
    throw new Error("تعذر إكمال طلب الدفع عبر تابي. حاول مرة أخرى أو اختر التحويل البنكي.");
  }
  return payload;
}

export async function isTabbyConfigured() {
  return isTabbyCredentialsConfigured(await getPaymentCredentials());
}

export async function isValidTabbyWebhookSecret(value: string | null) {
  const { tabbyWebhookSecret: expected } = await getPaymentCredentials();
  if (!expected || !value || value.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ value.charCodeAt(index);
  }
  return difference === 0;
}

/* ───────────── Session creation ───────────── */

export async function createTabbySession({
  orderId,
  orderCode,
  totalAmount,
  customer,
  items,
  deliveryFee,
  shippingAddress,
  postalCode,
  origin,
}: {
  orderId: number;
  orderCode: string;
  totalAmount: number;
  customer: {
    id: number;
    name: string;
    phone: string;
    email: string;
    city?: string;
    createdAt: Date;
  };
  items: { productId: number | null; name: string; quantity: number; unitPrice: number }[];
  deliveryFee: number;
  shippingAddress: string;
  postalCode: string;
  origin: string;
}) {
  const { merchantCode } = await tabbyCredentials();
  const storeOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || origin);
  if (process.env.NODE_ENV === "production" && storeOrigin.protocol !== "https:") {
    throw new Error("يجب ضبط NEXT_PUBLIC_APP_URL على رابط المتجر الآمن HTTPS");
  }

  const digits = customer.phone.replace(/\D/g, "");
  if (!digits) throw new Error("رقم جوال العميل مطلوب لإتمام الدفع عبر تابي");
  const phone = digits.startsWith("966")
    ? `+${digits}`
    : digits.startsWith("0")
      ? `+966${digits.slice(1)}`
      : `+966${digits}`;

  const returnUrl = new URL("/checkout/tabby", storeOrigin);
  returnUrl.searchParams.set("orderId", String(orderId));

  const amount = totalAmount.toFixed(2);

  const session = await tabbyRequest<{
    status?: string;
    payment?: { id?: string };
    configuration?: { available_products?: { installments?: { web_url?: string }[] } };
  }>("/api/v2/checkout", {
    method: "POST",
    body: JSON.stringify({
      payment: {
        amount,
        currency: "SAR",
        description: `طلب ${orderCode} من أهل الكرم`,
        buyer: {
          id: String(customer.id),
          name: customer.name,
          email: customer.email,
          phone,
        },
        shipping_address: {
          city: customer.city || "الرياض",
          address: shippingAddress,
          zip: postalCode,
        },
        order: {
          reference_id: orderCode,
          updated_at: new Date().toISOString(),
          tax_amount: "0.00",
          shipping_amount: deliveryFee.toFixed(2),
          discount_amount: "0.00",
          items: items.map((item) => ({
            reference_id: String(item.productId ?? item.name),
            title: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice.toFixed(2),
            category: "أغذية",
          })),
        },
        buyer_history: {
          registered_since: customer.createdAt.toISOString(),
          loyalty_level: 0,
          wishlist_count: 0,
          is_social_networks_connected: false,
          is_phone_number_verified: true,
          is_email_verified: false,
        },
        meta: { customer: String(customer.id), order_id: String(orderId) },
      },
      lang: "ar",
      merchant_code: merchantCode,
      merchant_urls: {
        success: `${returnUrl.toString()}&result=success`,
        cancel: `${returnUrl.toString()}&result=cancel`,
        failure: `${returnUrl.toString()}&result=failure`,
      },
    }),
  });

  const paymentId = session.payment?.id;
  const webUrl = session.configuration?.available_products?.installments?.[0]?.web_url;
  if (session.status !== "created" || !paymentId || !webUrl) {
    throw new Error("تعذر قبول العملية في تابي. اختر طريقة دفع أخرى أو تواصل مع المتجر.");
  }
  const checkoutUrl = new URL(webUrl);
  if (!["checkout.tabby.sa", "checkout.tabby.ai"].includes(checkoutUrl.hostname) || checkoutUrl.protocol !== "https:") {
    throw new Error("أعاد مزود الدفع رابطاً غير صالح");
  }

  // 🔴 CRITICAL: persist the paymentId immediately, so the webhook can find
  // the order even if the user closes the browser before returning.
  await db
    .update(orders)
    .set({
      tabbyPaymentId: paymentId,
      tabbyPaymentStatus: "created",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  return { paymentId, checkoutUrl: checkoutUrl.toString() };
}

/* ───────────── Verification helpers ───────────── */

function verifyPaymentMatches(
  payment: TabbyApiPayment,
  paymentId: string,
  orderCode: string,
  expectedAmount: number,
) {
  const failures: string[] = [];
  if (payment.id !== paymentId) failures.push("id");
  if (payment.currency !== "SAR") failures.push("currency");
  if (!Number.isFinite(Number(payment.amount))) failures.push("amount_not_number");
  if (Math.round(Number(payment.amount ?? 0) * 100) !== Math.round(expectedAmount * 100)) {
    failures.push("amount_mismatch");
  }
  if (payment.order?.reference_id !== orderCode) failures.push("reference_id");
  if (failures.length > 0) {
    console.warn("[tabby] payment verification failed", {
      paymentId,
      orderCode,
      expectedAmount,
      actualAmount: payment.amount,
      actualCurrency: payment.currency,
      actualStatus: payment.status,
      referenceId: payment.order?.reference_id,
      failures,
    });
    throw new Error("بيانات الدفع المسترجعة من تابي لا تطابق الطلب");
  }
}

function verifyCaptures(payment: TabbyApiPayment, expectedAmount: number) {
  const captured = (payment.captures ?? []).reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
  if (Math.round(captured * 100) !== Math.round(expectedAmount * 100)) {
    console.warn("[tabby] capture amount mismatch", {
      expectedAmount,
      capturedAmount: captured,
      captures: payment.captures,
    });
    throw new Error("مبلغ التحصيل في تابي لا يطابق إجمالي الطلب");
  }
}

async function markOrderPaid(orderId: number, paymentId: string, totalAmount: string) {
  await db
    .update(orders)
    .set({
      paidAmount: totalAmount,
      tabbyPaymentStatus: "paid",
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.tabbyPaymentId, paymentId)));
}

/* ───────────── Confirmation ───────────── */

export async function confirmTabbyPayment(paymentId: string, expectedCustomerId?: number) {
  const [order] = await db
    .select({
      id: orders.id,
      code: orders.code,
      customerId: orders.customerId,
      totalAmount: orders.totalAmount,
      tabbyPaymentId: orders.tabbyPaymentId,
      tabbyPaymentStatus: orders.tabbyPaymentStatus,
    })
    .from(orders)
    .where(eq(orders.tabbyPaymentId, paymentId))
    .limit(1);

  if (!order) return { found: false as const };
  if (expectedCustomerId !== undefined && order.customerId !== expectedCustomerId) {
    console.warn("[tabby] customer mismatch on confirm", {
      orderId: order.id,
      expectedCustomerId,
      actualCustomerId: order.customerId,
    });
    return { found: false as const };
  }

  // Idempotency: already paid.
  if (order.tabbyPaymentStatus === "paid") {
    return { found: true as const, paid: true as const, orderCode: order.code };
  }

  const expectedAmount = Number(order.totalAmount);

  // Fetch current state from Tabby.
  const payment = await tabbyRequest<TabbyApiPayment>(
    `/api/v2/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
  );
  verifyPaymentMatches(payment, paymentId, order.code, expectedAmount);

  // Already CLOSED (webhook likely beat us, or a previous attempt succeeded).
  if (SUCCESS_STATUSES.has(payment.status ?? "")) {
    verifyCaptures(payment, expectedAmount);
    await markOrderPaid(order.id, paymentId, order.totalAmount);
    return { found: true as const, paid: true as const, orderCode: order.code };
  }

  // Terminal non-paid status.
  if (FAILED_STATUSES.has(payment.status ?? "")) {
    await db
      .update(orders)
      .set({
        tabbyPaymentStatus: (payment.status ?? "").toLowerCase().slice(0, 40),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    return { found: true as const, paid: false as const, orderCode: order.code };
  }

  // AUTHORIZED → capture now.
  if (payment.status === "AUTHORIZED") {
    let capture: TabbyApiPayment | null = null;
    try {
      capture = await tabbyRequest<TabbyApiPayment>(
        `/api/v2/payments/${encodeURIComponent(paymentId)}/captures`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: expectedAmount.toFixed(2),
            reference_id: `${order.code}-capture`,
          }),
        },
      );
    } catch (error) {
      // 🔴 Race: another process (webhook or parallel call) captured first.
      // Re-fetch — if it's now CLOSED with the right amount, we're done.
      const fresh = await tabbyRequest<TabbyApiPayment>(
        `/api/v2/payments/${encodeURIComponent(paymentId)}`,
        { method: "GET" },
      );
      if (!SUCCESS_STATUSES.has(fresh.status ?? "")) {
        console.error("[tabby] capture failed and payment is not CLOSED", {
          paymentId,
          status: fresh.status,
        });
        throw error;
      }
      verifyCaptures(fresh, expectedAmount);
      await markOrderPaid(order.id, paymentId, order.totalAmount);
      return { found: true as const, paid: true as const, orderCode: order.code };
    }

    // 🔴 If capture didn't come back CLOSED, re-fetch to confirm.
    // The money may already be captured — never leave the order in "pending".
    if (capture && !SUCCESS_STATUSES.has(capture.status ?? "")) {
      const fresh = await tabbyRequest<TabbyApiPayment>(
        `/api/v2/payments/${encodeURIComponent(paymentId)}`,
        { method: "GET" },
      );
      if (!SUCCESS_STATUSES.has(fresh.status ?? "")) {
        console.warn("[tabby] capture returned non-CLOSED and fresh fetch still non-CLOSED", {
          paymentId,
          captureStatus: capture.status,
          freshStatus: fresh.status,
        });
        throw new Error("تمت الموافقة على الدفع لكن لم يؤكد تابي التحصيل النهائي بعد");
      }
      verifyCaptures(fresh, expectedAmount);
    } else if (capture) {
      verifyCaptures(capture, expectedAmount);
    }

    await markOrderPaid(order.id, paymentId, order.totalAmount);
    return { found: true as const, paid: true as const, orderCode: order.code };
  }

  // Intermediate status (CREATED, etc.) — record and wait for webhook.
  await db
    .update(orders)
    .set({
      tabbyPaymentStatus: (payment.status ?? "unknown").slice(0, 40),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));
  return { found: true as const, paid: false as const, orderCode: order.code };
}