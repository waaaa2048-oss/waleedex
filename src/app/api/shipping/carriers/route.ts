import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { shippingCarriers } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import {
  decryptShippingCredentials,
  encryptShippingCredentials,
  shippingCredentialEncryptionReady,
  type ShippingCredentials,
} from "@/lib/shipping-credentials";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

const CREDENTIAL_FIELDS = ["apiKey", "apiSecret", "accountNumber", "clientId"] as const;

export async function GET() {
  const denied = await permissionGuard("shipping.read");
  if (denied) return denied;
  try {
    const carriers = await db.select().from(shippingCarriers).orderBy(asc(shippingCarriers.name));
    return NextResponse.json({
      carriers: carriers.map(({ credentialsCiphertext, ...carrier }) => ({
        ...carrier,
        hasCredentials: Boolean(credentialsCiphertext),
      })),
      credentialsEncryptionReady: shippingCredentialEncryptionReady(),
      carrierApiReady: false,
    });
  } catch (error) {
    return serverError(error, "تعذر تحميل شركات الشحن");
  }
}

export async function PATCH(request: Request) {
  const denied = await permissionGuard("shipping.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const id = Number(body?.id);
    if (!body || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "معرّف شركة الشحن غير صالح" }, { status: 400 });
    }

    const [current] = await db.select().from(shippingCarriers).where(eq(shippingCarriers.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "شركة الشحن غير موجودة" }, { status: 404 });

    const updates: Partial<typeof shippingCarriers.$inferInsert> = { updatedAt: new Date() };
    if (body.apiBaseUrl !== undefined) {
      const value = typeof body.apiBaseUrl === "string" ? body.apiBaseUrl.trim() : "";
      if (value && (!/^https:\/\//i.test(value) || value.length > 500)) {
        return NextResponse.json({ error: "عنوان API يجب أن يكون HTTPS صالحاً وألا يتجاوز 500 حرف" }, { status: 400 });
      }
      updates.apiBaseUrl = value || null;
    }

    const providedCredentials: ShippingCredentials = {};
    let hasCredentialInput = false;
    for (const field of CREDENTIAL_FIELDS) {
      const value = body[field];
      if (value === undefined) continue;
      if (typeof value !== "string" || value.length > 2000) {
        return NextResponse.json({ error: "بيانات اعتماد شركة الشحن غير صالحة" }, { status: 400 });
      }
      if (value.trim()) {
        providedCredentials[field] = value.trim();
        hasCredentialInput = true;
      }
    }

    if (body.clearCredentials === true) {
      updates.credentialsCiphertext = null;
    } else if (hasCredentialInput) {
      if (!shippingCredentialEncryptionReady()) {
        return NextResponse.json({
          error: "حفظ المفاتيح غير متاح قبل ضبط SHIPPING_CREDENTIALS_KEY الآمن على الخادم.",
        }, { status: 503 });
      }
      const previous = current.credentialsCiphertext
        ? decryptShippingCredentials(current.credentialsCiphertext)
        : {};
      updates.credentialsCiphertext = encryptShippingCredentials({ ...previous, ...providedCredentials });
    }

    if (body.isEnabled === true || body.showAtCheckout === true) {
      return NextResponse.json({
        error: "التفعيل وإظهار الناقل في Checkout متوقفان حتى إضافة واعتماد موصل API الرسمي للشركة.",
      }, { status: 409 });
    }
    if (body.isEnabled === false) updates.isEnabled = false;
    if (body.showAtCheckout === false) updates.showAtCheckout = false;

    const [updated] = await db.update(shippingCarriers).set(updates).where(eq(shippingCarriers.id, id)).returning();
    await logActivity("تحديث إعدادات شركة شحن", "الشحن", updated.id, `${updated.name} — إعدادات محفوظة`);
    const { credentialsCiphertext, ...carrier } = updated;
    return NextResponse.json({ carrier: { ...carrier, hasCredentials: Boolean(credentialsCiphertext) } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("SHIPPING_CREDENTIALS_KEY")) {
      return NextResponse.json({ error: "تعذر تشفير المفاتيح؛ تحقق من إعداد مفتاح التشفير الآمن." }, { status: 503 });
    }
    return serverError(error, "تعذر حفظ إعدادات شركة الشحن");
  }
}
