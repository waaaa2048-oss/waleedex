/**
 * api/payments/tabby/webhook/route.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. 404 → 200 عند عدم إيجاد الطلب (يمنع retries بلا فائدة + سجل حرج).
 *   2. إرجاع { ok, found, paid } للمراقبة.
 *   3. تسجيل محاولات webhook غير مصرح بها.
 *   4. trim() على paymentId.
 *   5. تحسين تنسيق سجل الأخطاء.
 */

import { NextResponse } from "next/server";
import { confirmTabbyPayment, isValidTabbyWebhookSecret } from "@/lib/tabby";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Verify webhook signature (constant-time comparison inside).
  const secret = request.headers.get("x-auth-key");
  if (!(await isValidTabbyWebhookSecret(secret))) {
    console.warn("[tabby-webhook] unauthorized webhook attempt");
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    const paymentId = typeof body?.id === "string" ? body.id.trim() : "";
    if (!paymentId) {
      console.warn("[tabby-webhook] missing payment id in webhook body");
      return NextResponse.json({ error: "معرّف الدفع مفقود" }, { status: 400 });
    }

    const result = await confirmTabbyPayment(paymentId);

    if (!result.found) {
      // ⚠️ Acknowledge receipt to prevent infinite retries — retrying won't help
      //    if the order is truly missing. Log critically so operators can investigate:
      //      - data loss / accidental deletion
      //      - replay of an old webhook after the order was removed
      //      - a bug in createTabbySession that failed to persist tabbyPaymentId
      console.error("[tabby-webhook] PAYMENT_NOT_FOUND", {
        paymentId,
        action:
          "Order with this tabbyPaymentId does not exist. Investigate if the payment was actually received.",
      });
      return NextResponse.json({ ok: true, found: false });
    }

    return NextResponse.json({ ok: true, found: true, paid: result.paid });
  } catch (error) {
    // 5xx → Tabby will retry. Appropriate for transient failures:
    //   - DB temporarily unreachable
    //   - Tabby API blip during verification
    //   - capture race (another instance captured first — retry will confirm)
    console.error(
      "[tabby-webhook] processing failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "تعذر التحقق من إشعار الدفع" }, { status: 500 });
  }
}