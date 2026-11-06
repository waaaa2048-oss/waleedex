import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_COOKIE, deleteCustomerSession } from "@/lib/customer-auth";
import { clearedCookieOptions } from "@/lib/cookies";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(CUSTOMER_COOKIE)?.value;
  if (token) await deleteCustomerSession(token).catch(() => null);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, "", clearedCookieOptions(request));
  // كوكي العرض فقط في الواجهة
  response.cookies.set("user_phone", "", { path: "/", maxAge: 0 });
  return response;
}
