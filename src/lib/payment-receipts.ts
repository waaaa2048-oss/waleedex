/**
 * payment-receipts.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. تحقق path أشد صرامة (backslash/null bytes/control chars/empty segments).
 *   2. تحقق orderId (positive integer).
 *   3. فحص bytes.length === file.size بعد القراءة.
 *   4. عمر signed URL: 60s → 300s.
 *   5. إضافة name لـ PaymentReceiptValidationError.
 *   6. bucket يجب أن يبدأ بحرف/رقم.
 *   7. استخراج buildObjectPath helper.
 */

import "server-only";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PATH_LENGTH = 500;
const SIGNED_URL_TTL_SECONDS = 300;

export class PaymentReceiptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentReceiptValidationError";
  }
}

/* ───────────── Config ───────────── */

function storageConfig() {
  const rawUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "payment-receipts";
  if (!rawUrl || !serviceRoleKey) {
    throw new Error("لم يكتمل إعداد التخزين الخاص لإيصالات التحويل");
  }
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new Error("إعدادات التخزين الخاص غير صالحة");
  }
  // Supabase bucket names must start with a letter or digit.
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(bucket)) {
    throw new Error("إعدادات التخزين الخاص غير صالحة");
  }
  return { url, serviceRoleKey, bucket };
}

/* ───────────── Validation ───────────── */

function hasExpectedSignature(mimeType: string, bytes: Buffer) {
  if (bytes.length < 12) return false;
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/webp") {
    return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  if (mimeType === "application/pdf") {
    return bytes.toString("ascii", 0, 5) === "%PDF-";
  }
  return false;
}

/**
 * Validates a storage path stored in the DB.
 * Must start with "receipts/" and contain only safe segments:
 *   - no backslashes, null bytes, or control characters
 *   - no `.` or `..` segments
 *   - no empty segments
 *   - within MAX_PATH_LENGTH
 */
function isValidReceiptPath(path: unknown): path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > MAX_PATH_LENGTH) {
    return false;
  }
  if (!path.startsWith("receipts/")) return false;
  // Reject backslashes and control characters (including null bytes).
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\\]/.test(path)) return false;
  const segments = path.split("/");
  if (segments.some((seg) => seg === "" || seg === "." || seg === "..")) return false;
  return true;
}

/* ───────────── URL builder ───────────── */

function buildObjectPath(baseUrl: URL, bucket: string, prefix: string, path: string): URL {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return new URL(
    `/storage/v1/object/${prefix}${encodeURIComponent(bucket)}/${encodedPath}`,
    baseUrl,
  );
}

/* ───────────── Upload ───────────── */

export async function savePaymentReceipt(orderId: number, file: File) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new PaymentReceiptValidationError("معرّف الطلب غير صالح");
  }
  if (!file || typeof file.size !== "number") {
    throw new PaymentReceiptValidationError("لم يُرفق ملف الإيصال");
  }
  if (!file.size || file.size > MAX_SIZE_BYTES) {
    throw new PaymentReceiptValidationError("حجم الإيصال يجب ألا يتجاوز 5 ميجابايت");
  }

  const ext = MIME_EXTENSIONS[file.type];
  if (!ext) {
    throw new PaymentReceiptValidationError("ارفع الإيصال بصيغة JPG أو PNG أو WEBP أو PDF");
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Defense in depth: the buffer must match the declared size.
  if (bytes.length !== file.size) {
    throw new PaymentReceiptValidationError("تعذر قراءة الملف بالكامل");
  }

  if (!hasExpectedSignature(file.type, bytes)) {
    throw new PaymentReceiptValidationError("محتوى الملف لا يطابق نوع الإيصال");
  }

  const { url, serviceRoleKey, bucket } = storageConfig();
  const path = `receipts/${orderId}/bank-transfer.${ext}`;
  const objectUrl = buildObjectPath(url, bucket, "", path);

  const response = await fetch(objectUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "true",
      "cache-control": "3600",
    },
    body: bytes,
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("[payment-receipt] Supabase upload failed", response.status);
    throw new Error("تعذر حفظ الإيصال. حاول مرة أخرى بعد قليل.");
  }

  return path;
}

/* ───────────── Signed URL ───────────── */

export async function createPaymentReceiptSignedUrl(path: string) {
  if (!isValidReceiptPath(path)) {
    throw new Error("مسار الإيصال غير صالح");
  }

  const { url, serviceRoleKey, bucket } = storageConfig();
  const signUrl = buildObjectPath(url, bucket, "sign/", path);

  const response = await fetch(signUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | { signedURL?: unknown; signedUrl?: unknown }
    | null;

  const signedUrl =
    typeof data?.signedURL === "string"
      ? data.signedURL
      : typeof data?.signedUrl === "string"
        ? data.signedUrl
        : null;

  if (!response.ok || !signedUrl) {
    console.error("[payment-receipt] Supabase signed URL failed", response.status);
    throw new Error("تعذر إنشاء رابط آمن لعرض الإيصال");
  }

  const resolved = new URL(signedUrl, url);
  if (resolved.origin !== url.origin || resolved.protocol !== "https:") {
    throw new Error("أعاد التخزين رابطاً غير صالح");
  }

  return resolved;
}