import "server-only";
import { createHash } from "node:crypto";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 10_000;

export function checkCustomerAuthLimit(request: Request, action: string, identifier: string, limit: number, windowMs: number): boolean {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const remoteAddress = request.headers.get("x-real-ip")?.trim() || forwardedFor || "unknown";
  const identityHash = createHash("sha256").update(identifier).digest("hex");
  const key = `${action}:${remoteAddress}:${identityHash}`;
  const now = Date.now();
  let entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    if (attempts.size >= MAX_KEYS) {
      for (const [storedKey, storedValue] of attempts) {
        if (storedValue.resetAt <= now || attempts.size >= MAX_KEYS) attempts.delete(storedKey);
        if (attempts.size < MAX_KEYS * 0.8) break;
      }
    }
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  attempts.set(key, entry);
  return entry.count <= limit;
}
