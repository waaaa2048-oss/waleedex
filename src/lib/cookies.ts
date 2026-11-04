/**
 * cookies.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. isSecureRequest تعطي الأولوية لـ NEXT_PUBLIC_APP_URL قبل x-forwarded-proto
 *      (لأن الهيدر قابل للتزوير خارج proxy موثوق).
 *   2. publicUrl تستخدم NEXT_PUBLIC_APP_URL مباشرة إن كان معرّفاً.
 *   3. لم يتغيّر منطق sessionCookieOptions / clearedCookieOptions.
 */

export type CookieRequestLike = { headers: { get(name: string): string | null } };

/**
 * Session cookies must work in three situations:
 *  - direct browser access over https (preview link),
 *  - the embedded preview iframe (third-party context → needs SameSite=None + Partitioned),
 *  - local http development (Secure cookies are rejected → fall back to SameSite=Lax).
 */
export function isSecureRequest(request?: CookieRequestLike | null): boolean {
  // 1. Explicit app URL wins — headers below can be spoofed when not behind a trusted proxy.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.startsWith("https://");

  // 2. Fallback to request headers.
  if (!request) return process.env.NODE_ENV === "production";
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  const host = request.headers.get("host") ?? "";
  return !host.includes("localhost") && !host.startsWith("127.0.0.1");
}

export function sessionCookieOptions(request?: CookieRequestLike | null, maxAge?: number) {
  const secure = isSecureRequest(request);
  return {
    httpOnly: true,
    path: "/",
    secure,
    sameSite: secure ? ("none" as const) : ("lax" as const),
    partitioned: secure,
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

export function clearedCookieOptions(request?: CookieRequestLike | null) {
  return { ...sessionCookieOptions(request, 0) };
}

/** Builds a browser-safe absolute URL behind proxies (x-forwarded-host / proto). */
export function publicUrl(request: CookieRequestLike & { url: string }, path: string): string {
  // 1. Explicit app URL wins.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      return new URL(path, appUrl).toString();
    } catch {
      /* fall through to header-based resolution */
    }
  }

  // 2. Fallback to request headers.
  try {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host.includes("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0") ? "http" : "https");
    const safeHost = host.startsWith("0.0.0.0") ? host.replace("0.0.0.0", "localhost") : host;
    return new URL(path, `${proto}://${safeHost}`).toString();
  } catch {
    return path;
  }
}