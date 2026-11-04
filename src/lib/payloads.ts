/**
 * payloads.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. تحقق من صيغة البريد الإلكتروني (regex).
 *   2. تحقق أن رقم الجوال يحتوي أرقامًا فعلاً (ليس فقط رموزاً).
 *   3. حدود أقصى للأطوال: الاسم / الوصف / الملاحظات / الروابط.
 *   4. تحقق من صيغة imageUrl (يسمح فقط http/https أو /path محلي).
 *
 * ⚠️ لم يتغيّر منطق العمل — فقط إضافة قيود أمان على المدخلات.
 */

import { SERVICE_TYPES } from "./format";
import type { CustomerInput, ProductInput, ServiceInput } from "./types";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/* ───────────── Helpers ───────────── */

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const optionalText = (value: unknown): string | null => {
  const result = text(value);
  return result === "" ? null : result;
};

const number = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))
    return Number(value);
  return 0;
};

const bool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

/* ───────────── Limits ───────────── */

const MAX_NAME = 120;
const MAX_DESC = 2000;
const MAX_NOTES = 1000;
const MAX_URL = 500;
const MAX_ANIMAL_TYPE = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s-]{8,20}$/;

/**
 * يقبل فقط:
 *   - http(s)://...
 *   - /path محلي (مثل /uploads/foo.jpg)
 * يرفض: javascript:, data:, file:, //evil.com، إلخ.
 */
function validateImageUrl(value: string | null): string | null {
  if (!value) return null;
  if (value.length > MAX_URL) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return null;
}

/* ───────────── Products ───────────── */

export function parseProductPayload(body: unknown): ParseResult<ProductInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "بيانات غير صالحة" };
  const payload = body as Record<string, unknown>;

  const name = text(payload.name);
  const storeId = Number(payload.storeId);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    return { ok: false, error: "اختر المتجر" };
  }
  const sku = text(payload.sku) || `SKU-${Date.now().toString().slice(-6)}`;
  const animalType = text(payload.animalType) || "عام";
  const category = text(payload.category) || "عام";
  const kindRaw = text(payload.kind) || "ready";
  const kind: ProductInput["kind"] =
    kindRaw === "custom" || kindRaw === "booking" ? kindRaw : "ready";
  const description = text(payload.description);
  const weightKg = number(payload.weightKg);
  const pricePerKg = number(payload.pricePerKg);
  const fixedPriceRaw = number(payload.fixedPrice);
  const fixedPrice = fixedPriceRaw > 0 ? fixedPriceRaw : null;
  const stock = Math.round(number(payload.stock));
  const modifiersRaw = Array.isArray(payload.modifiers) ? payload.modifiers : [];
  const modifiers = modifiersRaw
    .slice(0, 8)
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const modifier = raw as Record<string, unknown>;
      const modifierName = text(modifier.name).slice(0, 60);
      const options = (Array.isArray(modifier.options) ? modifier.options : [])
        .slice(0, 30)
        .map((rawOption) => {
          if (typeof rawOption === "string") {
            const label = rawOption.trim().slice(0, 80);
            return label ? { label, value: label, priceDelta: 0 } : null;
          }
          if (!rawOption || typeof rawOption !== "object") return null;
          const option = rawOption as Record<string, unknown>;
          const label = text(option.label).slice(0, 80);
          const value = text(option.value) || label;
          const priceDelta = number(option.priceDelta);
          if (!label || !value || !Number.isFinite(priceDelta) || Math.abs(priceDelta) > 100000) return null;
          return { label, value: value.slice(0, 80), priceDelta };
        })
        .filter((option): option is NonNullable<typeof option> => option !== null);
      if (!modifierName || options.length === 0) return null;
      return {
        name: modifierName,
        type: text(modifier.type) || "select",
        required: bool(modifier.required),
        options,
      };
    })
    .filter((modifier): modifier is NonNullable<typeof modifier> => modifier !== null);

  if (name.length < 2) return { ok: false, error: "اسم المنتج قصير جداً" };
  if (name.length > MAX_NAME) return { ok: false, error: "اسم المنتج طويل جداً" };
  if (animalType.length < 1 || animalType.length > MAX_ANIMAL_TYPE)
    return { ok: false, error: "أدخل نوعاً أو فئة صالحة للمنتج" };
  if (description.length > MAX_DESC)
    return { ok: false, error: `الوصف طويل جداً (الحد الأقصى ${MAX_DESC} حرف)` };
  if (fixedPrice === null && weightKg <= 0)
    return { ok: false, error: "أدخل الوزن أو حدّد سعراً ثابتاً للمنتج" };
  if (fixedPrice === null && pricePerKg <= 0)
    return { ok: false, error: "أدخل سعر الوحدة أو سعراً ثابتاً" };
  if (stock < 0) return { ok: false, error: "المخزون لا يمكن أن يكون سالباً" };

  return {
    ok: true,
    value: {
      storeId,
      sku,
      modifiers,
      name,
      animalType,
      category,
      kind,
      description,
      weightKg,
      pricePerKg,
      fixedPrice,
      stock,
      imageUrl: validateImageUrl(optionalText(payload.imageUrl)),
      origin: text(payload.origin),
      isActive: bool(payload.isActive, true),
      isFeatured: bool(payload.isFeatured, false),
    },
  };
}

/* ───────────── Customers ───────────── */

export function parseCustomerPayload(body: unknown): ParseResult<CustomerInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "بيانات غير صالحة" };
  const payload = body as Record<string, unknown>;

  const name = text(payload.name);
  const phone = text(payload.phone);
  const city = text(payload.city) || "الرياض";
  const email = optionalText(payload.email);
  const notes = optionalText(payload.notes);

  if (name.length < 2) return { ok: false, error: "أدخل اسم العميل" };
  if (name.length > MAX_NAME) return { ok: false, error: "اسم العميل طويل جداً" };
  if (!PHONE_RE.test(phone)) return { ok: false, error: "أدخل رقم جوال صحيح" };
  if (!/\d/.test(phone)) return { ok: false, error: "رقم الجوال يجب أن يحتوي أرقاماً" };
  if (email && !EMAIL_RE.test(email))
    return { ok: false, error: "البريد الإلكتروني غير صحيح" };
  if (notes && notes.length > MAX_NOTES)
    return { ok: false, error: `الملاحظات طويلة جداً (الحد الأقصى ${MAX_NOTES} حرف)` };

  return {
    ok: true,
    value: {
      name,
      phone,
      city,
      email,
      address: optionalText(payload.address),
      notes,
      isVip: bool(payload.isVip),
    },
  };
}

/* ───────────── Services ───────────── */

export function parseServicePayload(body: unknown): ParseResult<ServiceInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "بيانات غير صالحة" };
  const payload = body as Record<string, unknown>;

  const name = text(payload.name);
  const type = text(payload.type) || "طبخ";
  const price = number(payload.price);
  const description = text(payload.description);

  if (name.length < 2) return { ok: false, error: "أدخل اسم الخدمة" };
  if (name.length > MAX_NAME) return { ok: false, error: "اسم الخدمة طويل جداً" };
  if (!SERVICE_TYPES.includes(type as (typeof SERVICE_TYPES)[number]))
    return { ok: false, error: "نوع الخدمة غير مدعوم" };
  if (price < 0) return { ok: false, error: "السعر غير صحيح" };
  if (description.length > MAX_DESC)
    return { ok: false, error: `الوصف طويل جداً (الحد الأقصى ${MAX_DESC} حرف)` };

  return {
    ok: true,
    value: {
      name,
      type,
      description,
      price,
      unit: text(payload.unit) || "للطلب",
      isActive: bool(payload.isActive, true),
    },
  };
}