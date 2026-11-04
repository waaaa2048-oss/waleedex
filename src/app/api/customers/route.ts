import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { parseCustomerPayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await permissionGuard("customers.read");
  if (denied) return denied;
  try {
    const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
    return NextResponse.json({ customers: allCustomers });
  } catch (error) {
    return serverError(error, "تعذر تحميل العملاء");
  }
}

export async function POST(request: Request) {
  const denied = await permissionGuard("customers.write");
  if (denied) return denied;
  try {
    const parsed = parseCustomerPayload(await request.json().catch(() => null));
    if (   parsed.ok === false) {
      const errorMessage = (parsed as { error?: string; message?: string }).error || 
                           (parsed as { error?: string; message?: string }).message || 
                           "بيانات العميل غير صالحة";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    const value = parsed.value;

    const [created] = await db.insert(customers).values(value).returning();
    return NextResponse.json({ customer: created }, { status: 201 });
  } catch (error) {
    return serverError(error, "تعذر إضافة العميل");
  }
}