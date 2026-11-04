/**
 * tamara.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. حفظ tamaraOrderId فوراً بعد الإنشاء (حرج — الـ webhook لا يجد الطلب بدونه).
 *   2. Idempotency early-return إذا كان مدفوعاً.
 *   3. expectedCustomerId اختياري في confirmTamaraPayment.
 *   4. tamaraRequest يرمي عند payload.error حتى مع 200.
 *   5. isTamaraConfigured لا يرمي عند env غير صالح.
 *   6. isValidTamaraNotificationToken يطلب exp إجبارياً.
 *   7. حفظ tamaraPaymentStatus: "created" عند الإنشاء.
 *   8. تحقق من رقم الجوال + city اختيارية.
 *   9. تسجيل تحذيرات أمنية عند فشل التحقق.
 */

import "server-only";
import { and, eq } from "drizzle-orm";
import { timingSafeEqual, createHmac } from "node:crypto";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getPaymentCredentials, isTamaraCredentialsConfigured } from "@/lib/payment-credentials";

type TamaraOrderResponse = {
  order_id?: string;
  order_reference_id?: string;
  status?: string;
  total_amount?: { amount?: number | string; currency?: string };
  captured_amount?: { amount?: number | string; currency?: string } | number | string;
};

type TamaraApiError = { message?: string; error?: string };

const SUCCESS_STATUSES = new Set(["fully_captured", "captured"]);

/* ───────────── API base URL ───────────── */

function tamaraApiBaseUrl() {
  const value = process.env.TAMARA_API_BASE_URL || "https://api-sandbox.tamara.co";
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    !["api.tamara.co", "api-sandbox.tamara.co"].includes(parsed.hostname) ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("رابط Tamara API غير صالح؛ استخدم بيئة Sandbox أو Production الرسمية");
  }
  return parsed.origin;
}

async function tamaraCredentials() {
  const { tamaraToken: token } = await getPaymentCredentials();
  if (!token || token.includes("replace_with")) {
    throw new Error("إعدادات Tamara غير مكتملة على الخادم");
  }
  return { token, baseUrl: tamaraApiBaseUrl() };
}

export async function isTamaraConfigured() {
  try {
    return isTamaraCredentialsConfigured(await getPaymentCredentials()) && Boolean(tamaraApiBaseUrl());
  } catch {
    return false;
  }
}

/* ───────────── HTTP layer ───────────── */

async function tamaraRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { token, baseUrl } = await tamaraCredentials();
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (T & TamaraApiError) | null;
  if (!response.ok || !payload) {
    console.error(
      "[tamara] API request failed",
      response.status,
      payload?.message ?? payload?.error ?? "invalid response",
    );
    throw new Error("تعذر إكمال طلب الدفع عبر تمارا. حاول مرة أخرى أو اختر التحويل البنكي.");
  }
  // Some Tamara responses come back as 200 with an error body.
  if (payload.error || payload.message) {
    console.error("[tamara] API logical error", payload.error ?? payload.message);
    throw new Error("تعذر إكمال طلب الدفع عبر تمارا. حاول مرة أخرى أو اختر التحويل البنكي.");
  }
  return payload;
}

/* ───────────── Helpers ───────────── */

function splitName(fullName: string) {
  const [firstName, ...remaining] = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: firstName || "عميل", lastName: remaining.join(" ") || "أهل الكرم" };
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  return `+966${digits}`;
}

function money(amount: number) {
  return { amount: Number(amount.toFixed(2)), currency: "SAR" };
}

/* ───────────── Checkout creation ───────────── */

export async function createTamaraCheckout({
  orderId,
  orderCode,
  totalAmount,
  customer,
  items,
  deliveryFee,
  shippingAddress,
  origin,
}: {
  orderId: number;
  orderCode: string;
  totalAmount: number;
  customer: { id: number; name: string; phone: string; email: string; city?: string };
  items: { productId: number | null; name: string; quantity: number; unitPrice: number }[];
  deliveryFee: number;
  shippingAddress: string;
  origin: string;
}) {
  const storeOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || origin);
  if (process.env.NODE_ENV === "production" && storeOrigin.protocol !== "https:") {
    throw new Error("يجب ضبط NEXT_PUBLIC_APP_URL على رابط المتجر الآمن HTTPS");
  }

  const digits = customer.phone.replace(/\D/g, "");
  if (!digits) throw new Error("رقم جوال العميل مطلوب لإتمام الدفع عبر تمارا");

  const { firstName, lastName } = splitName(customer.name);
  const phone = normalizePhone(customer.phone);
  const address = shippingAddress.slice(0, 500) || "الرياض";
  const city = customer.city?.trim() || "Riyadh";

  const totalItems = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (Math.round(totalItems * 100) !== Math.round((totalAmount - deliveryFee) * 100)) {
    console.error("[tamara] amount mismatch", {
      totalAmount,
      deliveryFee,
      totalItems,
      expectedItems: Number((totalAmount - deliveryFee).toFixed(2)),
      actualItems: Number(totalItems.toFixed(2)),
    });
    throw new Error("مجموع المنتجات لا يطابق إجمالي طلب تمارا");
  }

  const customerAddress = {
    first_name: firstName,
    last_name: lastName,
    line1: address,
    city,
    country_code: "SA",
    phone_number: phone,
  };

  const returnUrl = new URL("/checkout/tamara", storeOrigin);
  returnUrl.searchParams.set("orderId", String(orderId));

  const response = await tamaraRequest<{
    order_id?: string;
    checkout_url?: string;
  }>("/checkout", {
    method: "POST",
    body: JSON.stringify({
      order_reference_id: orderCode,
      order_number: orderCode,
      total_amount: money(totalAmount),
      shipping_amount: money(deliveryFee),
      tax_amount: money(0),
      discount: { name: "Discount", amount: money(0) },
      description: `طلب ${orderCode} من متجر أهل الكرم`,
      country_code: "SA",
      payment_type: "PAY_BY_INSTALMENTS",
      consumer: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email: customer.email,
      },
      billing_address: customerAddress,
      shipping_address: customerAddress,
      items: items.map((item) => {
        const lineAmount = item.unitPrice * item.quantity;
        return {
          reference_id: String(item.productId ?? item.name),
          type: "Physical",
          name: item.name,
          sku: String(item.productId ?? orderId),
          quantity: item.quantity,
          unit_price: money(item.unitPrice),
          tax_amount: money(0),
          discount_amount: money(0),
          total_amount: money(lineAmount),
        };
      }),
      merchant_url: {
        success: `${returnUrl.toString()}&result=success`,
        failure: `${returnUrl.toString()}&result=failure`,
        cancel: `${returnUrl.toString()}&result=cancel`,
        notification: `${storeOrigin.origin}/api/payments/tamara/webhook`,
      },
    }),
  });

  const tamaraOrderId = response.order_id;
  const checkoutUrl = response.checkout_url;
  if (!tamaraOrderId || !checkoutUrl) {
    throw new Error("لم تُرجع تمارا رابط الدفع المطلوب");
  }

  const resolvedCheckoutUrl = new URL(checkoutUrl);
  if (
    resolvedCheckoutUrl.protocol !== "https:" ||
    !(
      resolvedCheckoutUrl.hostname.endsWith(".tamara.co") ||
      resolvedCheckoutUrl.hostname.endsWith(".tamara.sa")
    )
  ) {
    throw new Error("أعادت تمارا رابط دفع غير صالح");
  }

  // 🔴 CRITICAL: persist tamaraOrderId immediately, so the webhook can find
  // the order even if the user closes the browser before returning.
  await db
    .update(orders)
    .set({
      tamaraOrderId,
      tamaraPaymentStatus: "created",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  return { paymentId: tamaraOrderId, checkoutUrl: resolvedCheckoutUrl.toString() };
}

/* ───────────── Confirmation ───────────── */

function amountOf(value: TamaraOrderResponse["captured_amount"]) {
  if (typeof value === "number" || typeof value === "string") return Number(value);
  return Number(value?.amount);
}

export async function confirmTamaraPayment(tamaraOrderId: string, expectedCustomerId?: number) {
  const [order] = await db
    .select({
      id: orders.id,
      code: orders.code,
      customerId: orders.customerId,
      totalAmount: orders.totalAmount,
      tamaraOrderId: orders.tamaraOrderId,
      tamaraPaymentStatus: orders.tamaraPaymentStatus,
    })
    .from(orders)
    .where(eq(orders.tamaraOrderId, tamaraOrderId))
    .limit(1);

  if (!order) return { found: false as const, paid: false as const };
  if (expectedCustomerId !== undefined && order.customerId !== expectedCustomerId) {
    console.warn("[tamara] customer mismatch on confirm", {
      orderId: order.id,
      expectedCustomerId,
      actualCustomerId: order.customerId,
    });
    return { found: false as const, paid: false as const };
  }

  // Idempotency: already paid.
  if (SUCCESS_STATUSES.has(order.tamaraPaymentStatus ?? "")) {
    return {
      found: true as const,
      paid: true as const,
      orderCode: order.code,
      status: order.tamaraPaymentStatus ?? "captured",
    };
  }

  const remoteOrder = await tamaraRequest<TamaraOrderResponse>(
    `/orders/${encodeURIComponent(tamaraOrderId)}`,
    { method: "GET" },
  );

  const failures: string[] = [];
  if (remoteOrder.order_id !== tamaraOrderId) failures.push("order_id");
  if (remoteOrder.order_reference_id !== order.code) failures.push("order_reference_id");
  if (remoteOrder.total_amount?.currency !== "SAR") failures.push("currency");
  if (
    Math.round(Number(remoteOrder.total_amount?.amount ?? NaN) * 100) !==
    Math.round(Number(order.totalAmount) * 100)
  ) {
    failures.push("total_amount_mismatch");
  }
  if (failures.length > 0) {
    console.warn("[tamara] payment verification failed", {
      orderId: order.id,
      orderCode: order.code,
      tamaraOrderId,
      failures,
      expectedAmount: order.totalAmount,
      actualAmount: remoteOrder.total_amount?.amount,
      actualCurrency: remoteOrder.total_amount?.currency,
      actualStatus: remoteOrder.status,
      referenceId: remoteOrder.order_reference_id,
    });
    throw new Error("بيانات الطلب المسترجعة من تمارا لا تطابق الطلب في المتجر");
  }

  const status = (remoteOrder.status ?? "unknown").toLowerCase();
  const capturedAmount = amountOf(remoteOrder.captured_amount);
  const capturedCurrency =
    typeof remoteOrder.captured_amount === "object" && remoteOrder.captured_amount !== null
      ? remoteOrder.captured_amount.currency
      : "SAR";

  const paid =
    SUCCESS_STATUSES.has(status) &&
    capturedCurrency === "SAR" &&
    Number.isFinite(capturedAmount) &&
    Math.round(capturedAmount * 100) === Math.round(Number(order.totalAmount) * 100);

  await db
    .update(orders)
    .set({
      tamaraPaymentStatus: paid ? "captured" : status.slice(0, 40),
      ...(paid ? { paidAmount: order.totalAmount } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, order.id), eq(orders.tamaraOrderId, tamaraOrderId)));

  return { found: true as const, paid, orderCode: order.code, status };
}

/* ───────────── Webhook token validation ───────────── */

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export async function isValidTamaraNotificationToken(token: string | null) {
  const { tamaraNotificationToken: secret } = await getPaymentCredentials();
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const header = JSON.parse(decodeBase64Url(parts[0]).toString("utf8")) as { alg?: unknown };
    if (header.alg !== "HS256") return false;

    const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
    const supplied = decodeBase64Url(parts[2]);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;

    const claims = JSON.parse(decodeBase64Url(parts[1]).toString("utf8")) as {
      exp?: unknown;
      nbf?: unknown;
    };
    const now = Math.floor(Date.now() / 1000);

    // 🔒 exp is required — reject tokens that never expire.
    if (typeof claims.exp !== "number") {
      console.warn("[tamara] webhook token missing exp claim");
      return false;
    }
    if (claims.exp <= now) return false;

    // nbf is optional but enforced if present.
    if (typeof claims.nbf === "number" && claims.nbf > now) return false;

    return true;
  } catch {
    return false;
  }
}