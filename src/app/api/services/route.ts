import { NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { getServices, toServiceDTO } from "@/lib/data";
import { parseServicePayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await permissionGuard("products.read");
  if (denied) return denied;
  try {
    return NextResponse.json({ services: await getServices() });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const denied = await permissionGuard("services.write");
  if (denied) return denied;
  try {
    const parsed = parseServicePayload(await request.json().catch(() => null));
    if (   parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const value = parsed.value;

    const [created] = await db
      .insert(services)
      .values({ ...value, price: String(value.price) })
      .returning();

    return NextResponse.json({ service: { ...toServiceDTO(created), usageCount: 0 } }, { status: 201 });
  } catch (error) {
    return serverError(error, "تعذر إضافة الخدمة");
  }
}
