/**
 * customer-auth.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. إضافة deleteExpiredCustomerSessions لحذف الجلسات المنتهية.
 *   2. استدعاؤها تلقائياً عند إنشاء جلسة جديدة (رخيص بعد إضافة index).
 *   3. تسجيل أخطاء DB في getCurrentCustomer للـ dev (بدون كشفها للمستخدم).
 */

import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { customerSessions, customers } from "@/db/schema";

export const CUSTOMER_COOKIE = "ahlalkaram_customer_v2";
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type CustomerSessionUser = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  isVip: boolean;
};

export async function createCustomerSession(customerId: number) {
  // تنظيف أي جلسات منتهية (رخيص بعد إضافة index على expires_at).
  await deleteExpiredCustomerSessions();

  const token = `v2_${randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.insert(customerSessions).values({ token, customerId, expiresAt });
  return { token, expiresAt, maxAge: TTL_MS / 1000 };
}

export async function deleteCustomerSession(token: string) {
  await db.delete(customerSessions).where(eq(customerSessions.token, token));
}

export async function deleteExpiredCustomerSessions() {
  await db.delete(customerSessions).where(lt(customerSessions.expiresAt, new Date()));
}

export const getCurrentCustomer = cache(async (): Promise<CustomerSessionUser | null> => {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token?.startsWith("v2_")) return null;
  try {
    const rows = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        city: customers.city,
        isVip: customers.isVip,
      })
      .from(customerSessions)
      .innerJoin(customers, eq(customers.id, customerSessions.customerId))
      .where(and(eq(customerSessions.token, token), gt(customerSessions.expiresAt, new Date())))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("[customer-auth] getCurrentCustomer failed:", error);
    return null;
  }
});

export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  return digits.length === 9 ? `0${digits}` : digits;
}