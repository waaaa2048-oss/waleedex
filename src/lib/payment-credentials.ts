/**
 * payment-credentials.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. try/catch حول decrypt() — لا crash عند تغيير/فقدان مفتاح التشفير،
 *      مع تسجيل واضح والرجوع إلى env vars.
 *   2. تحذير عند عدم تطابق وضع Moyasar (pk_test_ مع sk_live_).
 *   3. hasPaymentEncryptionKey أشد صرامة (يرفض placeholders).
 *   4. باقي المنطق (AES-GCM، fallback، schema-ready) بدون تغيير.
 */

import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentCredentials } from "@/db/schema";

export type PaymentCredentials = {
  moyasarPublishableKey: string;
  moyasarSecretKey: string;
  tabbyPublicKey: string;
  tabbySecretKey: string;
  tabbyMerchantCode: string;
  tabbyWebhookSecret: string;
  tamaraToken: string;
  tamaraNotificationToken: string;
};

export const EMPTY_PAYMENT_CREDENTIALS: PaymentCredentials = {
  moyasarPublishableKey: "",
  moyasarSecretKey: "",
  tabbyPublicKey: "",
  tabbySecretKey: "",
  tabbyMerchantCode: "",
  tabbyWebhookSecret: "",
  tamaraToken: "",
  tamaraNotificationToken: "",
};

function encryptionKey() {
  const secret = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      "يجب ضبط PAYMENT_CREDENTIALS_ENCRYPTION_KEY بمفتاح عشوائي لا يقل عن 32 حرفاً",
    );
  }
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: PaymentCredentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

function decrypt(value: string): PaymentCredentials {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("تعذر فك تشفير بيانات بوابات الدفع المخزنة");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const parsed = JSON.parse(decrypted) as Partial<PaymentCredentials>;
  return Object.fromEntries(
    Object.keys(EMPTY_PAYMENT_CREDENTIALS).map((key) => [
      key,
      typeof parsed[key as keyof PaymentCredentials] === "string"
        ? parsed[key as keyof PaymentCredentials]
        : "",
    ]),
  ) as PaymentCredentials;
}

export function isPaymentCredentialsMigrationMissing(error: unknown) {
  const candidate = error as { code?: unknown; cause?: { code?: unknown } } | null;
  return candidate?.code === "42P01" || candidate?.cause?.code === "42P01";
}

export async function getPaymentCredentials(): Promise<PaymentCredentials> {
  const stored = await getStoredPaymentCredentials();
  return {
    moyasarPublishableKey:
      stored.moyasarPublishableKey ||
      process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.trim() ||
      "",
    moyasarSecretKey:
      stored.moyasarSecretKey || process.env.MOYASAR_SECRET_KEY?.trim() || "",
    tabbyPublicKey:
      stored.tabbyPublicKey || process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY?.trim() || "",
    tabbySecretKey:
      stored.tabbySecretKey || process.env.TABBY_SECRET_KEY?.trim() || "",
    tabbyMerchantCode:
      stored.tabbyMerchantCode || process.env.TABBY_MERCHANT_CODE?.trim() || "",
    tabbyWebhookSecret:
      stored.tabbyWebhookSecret || process.env.TABBY_WEBHOOK_SECRET?.trim() || "",
    tamaraToken: stored.tamaraToken || process.env.TAMARA_TOKEN_SECRET?.trim() || "",
    tamaraNotificationToken:
      stored.tamaraNotificationToken ||
      process.env.TAMARA_NOTIFICATION_TOKEN?.trim() ||
      "",
  };
}

export async function savePaymentCredentials(
  updates: Partial<PaymentCredentials>,
  clearFields: string[],
) {
  const current = await getStoredPaymentCredentials();
  for (const key of clearFields) {
    if (key in EMPTY_PAYMENT_CREDENTIALS) current[key as keyof PaymentCredentials] = "";
  }
  for (const [key, value] of Object.entries(updates)) {
    if (key in EMPTY_PAYMENT_CREDENTIALS) current[key as keyof PaymentCredentials] = value;
  }
  const encrypted = Object.values(current).some(Boolean) ? encrypt(current) : null;
  await db
    .insert(paymentCredentials)
    .values({ id: 1, encryptedCredentials: encrypted })
    .onConflictDoUpdate({
      target: paymentCredentials.id,
      set: { encryptedCredentials: encrypted, updatedAt: new Date() },
    });
}

async function getStoredPaymentCredentials(): Promise<PaymentCredentials> {
  try {
    const [row] = await db
      .select({ encrypted: paymentCredentials.encryptedCredentials })
      .from(paymentCredentials)
      .where(eq(paymentCredentials.id, 1))
      .limit(1);
    if (!row?.encrypted) return { ...EMPTY_PAYMENT_CREDENTIALS };
    try {
      return decrypt(row.encrypted);
    } catch (error) {
      // 🔴 NEVER crash checkout on decryption failure. Fall back to env vars.
      // Common causes: encryption key changed, DB row corrupted, key lost.
      console.error(
        "[payment-credentials] Failed to decrypt stored credentials. " +
          "Checkout will fall back to environment variables if configured. " +
          "Admin action required: re-save payment credentials from the dashboard " +
          "and confirm PAYMENT_CREDENTIALS_ENCRYPTION_KEY has not changed.",
        error,
      );
      return { ...EMPTY_PAYMENT_CREDENTIALS };
    }
  } catch (error) {
    if (isPaymentCredentialsMigrationMissing(error)) return { ...EMPTY_PAYMENT_CREDENTIALS };
    throw error;
  }
}

export async function isPaymentCredentialsSchemaReady() {
  try {
    await db
      .select({ encrypted: paymentCredentials.encryptedCredentials })
      .from(paymentCredentials)
      .limit(1);
    return true;
  } catch (error) {
    if (isPaymentCredentialsMigrationMissing(error)) return false;
    throw error;
  }
}

export function hasPaymentEncryptionKey() {
  const key = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!key || key.length < 32) return false;
  // Reject obvious placeholders / weak values.
  if (key.includes("replace_with") || key.includes("changeme")) return false;
  if (/^(.)\1+$/.test(key)) return false; // e.g. "0000..." or "aaaa..."
  return true;
}

export function isMoyasarCredentialsConfigured(credentials: PaymentCredentials) {
  const publishableMode = credentials.moyasarPublishableKey.match(/^pk_(test|live)_/)?.[1];
  const secretMode = credentials.moyasarSecretKey.match(/^sk_(test|live)_/)?.[1];

  // 🔍 Log mode mismatch — helps admins diagnose silent "not configured".
  if (publishableMode && secretMode && publishableMode !== secretMode) {
    console.warn(
      `[payment-credentials] Moyasar mode mismatch: publishable=${publishableMode}, secret=${secretMode}. ` +
        "All payments will fail until this is fixed in the dashboard.",
    );
  }

  return Boolean(
    publishableMode &&
      publishableMode === secretMode &&
      !credentials.moyasarPublishableKey.includes("replace_with") &&
      !credentials.moyasarSecretKey.includes("replace_with"),
  );
}

export function isTabbyCredentialsConfigured(credentials: PaymentCredentials) {
  return Boolean(
    credentials.tabbyPublicKey.startsWith("pk_") &&
      !credentials.tabbyPublicKey.includes("replace_with") &&
      credentials.tabbySecretKey.startsWith("sk") &&
      !credentials.tabbySecretKey.includes("replace_with") &&
      credentials.tabbyMerchantCode &&
      !credentials.tabbyMerchantCode.includes("replace_with"),
  );
}

export function isTamaraCredentialsConfigured(credentials: PaymentCredentials) {
  return Boolean(
    credentials.tamaraToken &&
      !credentials.tamaraToken.includes("replace_with") &&
      credentials.tamaraNotificationToken &&
      !credentials.tamaraNotificationToken.includes("replace_with"),
  );
}

export async function getPaymentCredentialStatus() {
  const [credentials, schemaReady] = await Promise.all([
    getPaymentCredentials(),
    isPaymentCredentialsSchemaReady(),
  ]);
  return {
    moyasar: isMoyasarCredentialsConfigured(credentials),
    tabby: isTabbyCredentialsConfigured(credentials),
    tamara: isTamaraCredentialsConfigured(credentials),
    encryptionKeyConfigured: hasPaymentEncryptionKey(),
    schemaReady,
  };
}