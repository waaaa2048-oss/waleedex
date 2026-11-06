/**
 * customer-verification.ts
 * ─────────────────────────────────────────────
 * إثبات قصير العمر بأن صاحب الجوال أدخل رمز OTP صحيحاً قبل أن يكمل بيانات
 * حسابه الجديد. الرمز موقّع بـ HMAC ولا يمكن تزويره أو تغيير الجوال داخله.
 * يُخزَّن في كوكي httpOnly لمدة 15 دقيقة، ويُحذف بعد إنشاء الحساب.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const VERIFIED_PHONE_COOKIE = "ahlalkaram_verified_phone";
export const VERIFIED_PHONE_TTL_SECONDS = 15 * 60;

function sign(payload: string): string {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error("OTP_SECRET غير مضبوط");
  return createHmac("sha256", secret).update(`verified-phone:${payload}`).digest("hex");
}

export function createVerifiedPhoneToken(phone: string): string {
  const exp = Date.now() + VERIFIED_PHONE_TTL_SECONDS * 1000;
  const payload = `${phone}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** يرجع الجوال الموثّق إذا كان الرمز سليماً وغير منتهٍ، وإلا null. */
export function readVerifiedPhone(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [phone, expRaw, signature] = parts;
  const exp = Number(expRaw);
  if (!/^05\d{8}$/.test(phone) || !Number.isFinite(exp) || exp < Date.now()) return null;

  try {
    const expected = Buffer.from(sign(`${phone}.${expRaw}`), "hex");
    const actual = Buffer.from(signature, "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  } catch {
    return null;
  }
  return phone;
}
