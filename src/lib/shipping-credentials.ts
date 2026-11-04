/**
 * shipping-credentials.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. إضافة v1. prefix للـ ciphertext (مع دعم الفك القديم بدون prefix).
 *   2. safeDecryptShippingCredentials — لا crash عند فشل الفك (checkout محمي).
 *   3. تحقق صارم من base64 للمفتاح + رفض مفاتيح كلها أصفار.
 *   4. تحقق من نوع/طول كل حقل بعد الفك (max 2000 حرف لكل حقل).
 *   5. shippingCredentialEncryptionReady أشد صرامة.
 */

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type ShippingCredentials = {
  apiKey?: string;
  apiSecret?: string;
  accountNumber?: string;
  clientId?: string;
};

const STRING_FIELDS = ["apiKey", "apiSecret", "accountNumber", "clientId"] as const;
const MAX_FIELD_LENGTH = 2000;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/* ───────────── Encryption key ───────────── */

function encryptionKey(): Buffer {
  const encoded = process.env.SHIPPING_CREDENTIALS_KEY;
  if (!encoded) {
    throw new Error("SHIPPING_CREDENTIALS_KEY is required to store carrier credentials");
  }
  if (!BASE64_RE.test(encoded)) {
    throw new Error("SHIPPING_CREDENTIALS_KEY must be valid base64");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("SHIPPING_CREDENTIALS_KEY must be a base64-encoded 32-byte key");
  }
  // Reject trivially weak keys (e.g., 32 zero bytes).
  if (key.every((byte) => byte === 0)) {
    throw new Error("SHIPPING_CREDENTIALS_KEY is a placeholder — generate a real key");
  }
  return key;
}

/* ───────────── Payload format ───────────── */

type Payload = { version: "v1" | "legacy"; iv: Buffer; tag: Buffer; ciphertext: Buffer };

/**
 * Parses either:
 *   - "v1.<iv_b64>.<tag_b64>.<ct_b64>"    (current format)
 *   - "<iv_b64>.<tag_b64>.<ct_b64>"       (legacy, no version)
 */
function splitPayload(value: string): Payload {
  const parts = value.split(".");
  if (parts[0] === "v1" && parts.length === 4) {
    return {
      version: "v1",
      iv: Buffer.from(parts[1], "base64"),
      tag: Buffer.from(parts[2], "base64"),
      ciphertext: Buffer.from(parts[3], "base64"),
    };
  }
  if (parts.length === 3) {
    return {
      version: "legacy",
      iv: Buffer.from(parts[0], "base64"),
      tag: Buffer.from(parts[1], "base64"),
      ciphertext: Buffer.from(parts[2], "base64"),
    };
  }
  throw new Error("Stored carrier credentials are malformed");
}

/* ───────────── Validation after decryption ───────────── */

function validateCredentials(parsed: unknown): ShippingCredentials {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Stored carrier credentials are invalid");
  }
  const obj = parsed as Record<string, unknown>;
  const result: ShippingCredentials = {};
  for (const key of STRING_FIELDS) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      throw new Error(`Stored carrier credentials have invalid type for "${key}"`);
    }
    if (value.length > MAX_FIELD_LENGTH) {
      throw new Error(`Stored carrier credentials have oversized field "${key}"`);
    }
    result[key] = value;
  }
  return result;
}

/* ───────────── Encrypt / decrypt ───────────── */

export function encryptShippingCredentials(credentials: ShippingCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  // v1.<iv>.<tag>.<ct>
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptShippingCredentials(value: string): ShippingCredentials {
  const { iv, tag, ciphertext } = splitPayload(value);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return validateCredentials(JSON.parse(plaintext));
}

/**
 * Never throws. Returns null on any failure (decryption, malformed data, missing key).
 *
 * Use this in read paths (checkout, admin display) so a rotated or lost key
 * doesn't take down the whole application.
 * Logs the error for the operator.
 */
export function safeDecryptShippingCredentials(
  value: string | null | undefined,
): ShippingCredentials | null {
  if (!value) return null;
  try {
    return decryptShippingCredentials(value);
  } catch (error) {
    console.error(
      "[shipping-credentials] Failed to decrypt stored carrier credentials. " +
        "Carrier will be treated as not configured. " +
        "Admin action required: re-save carrier credentials from the dashboard " +
        "and confirm SHIPPING_CREDENTIALS_KEY has not changed.",
      error,
    );
    return null;
  }
}

/* ───────────── Health check ───────────── */

export function shippingCredentialEncryptionReady(): boolean {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}