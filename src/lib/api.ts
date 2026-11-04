/**
 * api.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. permissionGuard يسجل الرفض في console.warn (أثر تدقيقي).
 *   2. serverError يقبل context اختياري للـ logging.
 *   3. رسائل guard و permissionGuard موحّدة.
 *   4. API لم يتغيّر — backward compatible.
 */

import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { roleCan } from "./roles";

const UNAUTHENTICATED = "انتهت الجلسة، يرجى تسجيل الدخول";

/**
 * Verifies that the caller is authenticated.
 * Returns null on success, or a 401 NextResponse on failure.
 */
export async function guard(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: UNAUTHENTICATED }, { status: 401 });
  }
  return null;
}

/**
 * Verifies that the caller is authenticated AND has the given permission
 * (and, for category managers, that the row belongs to their allowed categories).
 * Returns null on success, or 401/403 on failure.
 */
export async function permissionGuard(
  permission: string,
  category?: string,
): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: UNAUTHENTICATED }, { status: 401 });
  }
  if (!roleCan(user.role, user.permissions, permission)) {
    console.warn("[api] permission denied", {
      userId: user.id,
      role: user.role,
      permission,
    });
    return NextResponse.json(
      { error: "ليس لديك صلاحية لتنفيذ هذا الإجراء" },
      { status: 403 },
    );
  }
  if (
    user.role === "category_manager" &&
    category &&
    !user.allowedCategories.includes(category)
  ) {
    console.warn("[api] category denied", {
      userId: user.id,
      role: user.role,
      category,
    });
    return NextResponse.json(
      { error: "صلاحيتك تقتصر على تصنيفاتك المحددة" },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Logs the error server-side and returns a generic 500 response.
 * The client never sees the underlying error (no stack traces, no DB details).
 *
 * @param context optional label used in logs (e.g. "products", "orders/42").
 */
export function serverError(
  error: unknown,
  message = "حدث خطأ غير متوقع",
  context?: string,
): NextResponse {
  console.error(`[api${context ? `:${context}` : ""}]`, error);
  return NextResponse.json({ error: message }, { status: 500 });
}