import { NextResponse } from "next/server";
import { permissionGuard, serverError } from "@/lib/api";
import {
  EMPTY_PAYMENT_CREDENTIALS,
  getPaymentCredentialStatus,
  hasPaymentEncryptionKey,
  isPaymentCredentialsMigrationMissing,
  savePaymentCredentials,
  type PaymentCredentials,
} from "@/lib/payment-credentials";
import { getGlobalPaymentMethods, saveGlobalPaymentMethods, type GlobalPaymentMethods } from "@/lib/payment-methods";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const [status, methods] = await Promise.all([getPaymentCredentialStatus(), getGlobalPaymentMethods()]);
    return NextResponse.json({ status, methods });
  } catch (error) {
    return serverError(error, "تعذر قراءة حالة مفاتيح الدفع");
  }
}

export async function PATCH(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "بيانات مفاتيح الدفع غير صالحة" }, { status: 400 });
    }

    if (body.methods !== undefined) {
      const methodValues = body.methods as Record<string, unknown> | null;
      const keys = ["codEnabled", "bankTransferEnabled", "moyasarEnabled", "tabbyEnabled", "tamaraEnabled"] as const;
      if (!methodValues || keys.some((key) => typeof methodValues[key] !== "boolean")) {
        return NextResponse.json({ error: "اختر حالة صالحة لكل طريقة دفع" }, { status: 400 });
      }
      const methods = Object.fromEntries(keys.map((key) => [key, methodValues[key]])) as GlobalPaymentMethods;
      await saveGlobalPaymentMethods(methods);
      return NextResponse.json({ methods });
    }

    if (!hasPaymentEncryptionKey()) {
      return NextResponse.json(
        { error: "أضف PAYMENT_CREDENTIALS_ENCRYPTION_KEY إلى أسرار الخادم أولاً" },
        { status: 503 },
      );
    }

    const credentials: Partial<PaymentCredentials> = {};
    for (const key of Object.keys(EMPTY_PAYMENT_CREDENTIALS) as (keyof PaymentCredentials)[]) {
      const value = body[key];
      if (value === undefined) continue;
      if (typeof value !== "string" || value.length > 2000) {
        return NextResponse.json({ error: "تحقق من قيمة مفاتيح الدفع المدخلة" }, { status: 400 });
      }
      if (value.trim()) credentials[key] = value.trim();
    }

    const clearFields = Array.isArray(body.clearFields)
      ? body.clearFields.filter(
          (value): value is string => typeof value === "string" && value in EMPTY_PAYMENT_CREDENTIALS,
        )
      : [];
    await savePaymentCredentials(credentials, clearFields);
    return NextResponse.json({ status: await getPaymentCredentialStatus() });
  } catch (error) {
    if (isPaymentCredentialsMigrationMissing(error)) {
      return NextResponse.json({ error: "طبّق ترحيل قاعدة البيانات 0011_encrypted_payment_credentials.sql أولاً" }, { status: 503 });
    }
    return serverError(error, "تعذر حفظ مفاتيح الدفع");
  }
}
