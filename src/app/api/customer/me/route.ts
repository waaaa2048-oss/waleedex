import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  return NextResponse.json({ customer });
}
