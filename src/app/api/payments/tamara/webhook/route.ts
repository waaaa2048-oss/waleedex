/**
 * api/payments/tamara/webhook/route.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. دعم tamara-notification-token header (بالإضافة إلى Bearer).
 *   2. تحذير عند وصول التوكين عبر query string (تسريب محتمل).
 *   3. 404 → 200 عند عدم إيجاد الطلب (مع تسجيل حرج).
 *   4. إصلاح bug: 400 → 200 + تحذير عند mismatch بعد الدفع (كان يُرجع
 *      400 بعد أن الدفع تم فعلاً، مما يُسبب retries لا نهائية).
 *   5. تسجيل محاولات webhook غير مصرح بها.
 *   6. trim() على order_id و order_reference_id.
 *   7. تسجيل event_type (مرجع تشغيلي).
 *   8. إرجاع { ok, found, paid } للمراقبة.
 */

import { NextResponse } from "next/server";
import { confirmTamaraPayment, isValidTamaraNotificationToken } from "@/lib/tamara";

export const dynamic = "force-dynamic";

/* ───────────── Token extraction ───────────── */

type TokenSource =
  | "tamara-notification-token"
  | "authorization"
  | "query (WARNING: may leak in logs)"
  | "none";

function extractToken(request: Request): { token: string | null; source: TokenSource } {
  // Primary: Tamara's dedicated webhook header.
  const dedicated = request.headers.get("tamara-notification-token");
  if (dedicated) return { token: dedicated, source: "tamara-notification-token" };

  // Fallback: Authorization: Bearer <jwt>
  const auth = request.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  if (bearer) return { token: bearer, source: "authorization" };

  // Legacy: query string (leaks in proxy/server logs — accept but warn).
  const query = new URL(request.url).searchParams.get("tamaraToken");
  if (query) return { token: query, source: "query (WARNING: may leak in logs)" };

  return { token: null, source: "none" };
}

/* ───────────── Handler ───────────── */

export async function POST(request: Request) {
  // 1. Verify webhook signature (JWT HS256 + exp + nbf, constant-time).
  const { token, source } = extractToken(request);

  if (source === "query (WARNING: may leak in logs)") {
    console.warn(
      "[tamara-webhook] token received via query string — " +
        "this token appears in proxy/server access logs and browser history. " +
        "Ask Tamara to send it via the tamara-notification-token header instead.",
    );
  }

  if (!(await isValidTamaraNotificationToken(token))) {
    console.warn("[tamara-webhook] unauthorized webhook attempt", { source });
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    // 2. Parse + validate body.
    const body = (await request.json().catch(() => null)) as {
      order_id?: unknown;
      order_reference_id?: unknown;
      event_type?: unknown;
    } | null;

    if (
      typeof body?.order_id !== "string" ||
      typeof body.order_reference_id !== "string" ||
      typeof body.event_type !== "string"
    ) {
      console.warn("[tamara-webhook] malformed webhook body");
      return NextResponse.json({ error: "بيانات إشعار تمارا غير مكتملة" }, { status: 400 });
    }

    const tamaraOrderId = body.order_id.trim();
    const orderReferenceId = body.order_reference_id.trim();
    const eventType = body.event_type.trim();

    if (!tamaraOrderId) {
      return NextResponse.json({ error: "معرّف طلب تمارا مفقود" }, { status: 400 });
    }

    // 3. Confirm against Tamara API — this is the authoritative source.
    const result = await confirmTamaraPayment(tamaraOrderId);

    if (!result.found) {
      // ⚠️ Acknowledge to prevent infinite retries. Retrying won't fix a missing order.
      //    Investigate: data loss, accidental deletion, or createTamaraCheckout
      //    failed to persist tamaraOrderId.
      console.error("[tamara-webhook] PAYMENT_NOT_FOUND", {
        tamaraOrderId,
        orderReferenceId,
        eventType,
        action:
          "Order with this tamaraOrderId does not exist. Investigate if the payment was actually received.",
      });
      return NextResponse.json({ ok: true, found: false });
    }

    // 4. Cross-check body reference against DB (informational only).
    //    Tamara API is authoritative — a mismatch here means:
    //      - Tamara sent a corrupted body (their bug), OR
    //      - our DB was modified post-creation (should be impossible).
    //    The payment has already been verified + persisted via the API,
    //    so we log loudly but do NOT cause retries (return 200).
    if (result.orderCode !== orderReferenceId) {
      console.warn("[tamara-webhook] ORDER_CODE_MISMATCH (payment already processed)", {
        tamaraOrderId,
        dbOrderCode: result.orderCode,
        webhookOrderCode: orderReferenceId,
        eventType,
        paid: result.paid,
        action:
          "Cross-check failed but payment status is authoritative from Tamara API. " +
          "Investigate data corruption if this recurs.",
      });
    }

    console.log("[tamara-webhook] processed", {
      tamaraOrderId,
      orderReferenceId,
      eventType,
      paid: result.paid,
      status: result.status,
    });

    return NextResponse.json({ ok: true, found: true, paid: result.paid });
  } catch (error) {
    // 5xx → Tamara retries. Appropriate for transient failures:
    //   - DB temporarily unreachable
    //   - Tamara API blip during verification
    console.error(
      "[tamara-webhook] processing failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "تعذر التحقق من إشعار تمارا" }, { status: 500 });
  }
}