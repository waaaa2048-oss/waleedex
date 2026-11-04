import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureDatabaseReady } from "@/db";
import { platformDomainSettings } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export async function GET() {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    await ensureDatabaseReady();
    const [settings] = await db
      .select()
      .from(platformDomainSettings)
      .where(eq(platformDomainSettings.id, 1))
      .limit(1);
    return NextResponse.json({
      settings: settings ?? { customDomain: null, domainStatus: "none" },
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    await ensureDatabaseReady();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

    const customDomain =
      typeof body.customDomain === "string" && body.customDomain.trim()
        ? body.customDomain.trim().toLowerCase().replace(/\.$/, "")
        : null;
    const domainStatus = body.domainStatus;
    if (customDomain && !DOMAIN_PATTERN.test(customDomain)) {
      return NextResponse.json({ error: "أدخل دوميناً صالحاً مثل example.com" }, { status: 400 });
    }
    if (domainStatus !== "active" && domainStatus !== "pending" && domainStatus !== "none") {
      return NextResponse.json({ error: "حالة الدومين غير صالحة" }, { status: 400 });
    }
    if (!customDomain && domainStatus !== "none") {
      return NextResponse.json({ error: "أدخل الدومين أولاً" }, { status: 400 });
    }

    const [settings] = await db
      .insert(platformDomainSettings)
      .values({ id: 1, customDomain, domainStatus })
      .onConflictDoUpdate({
        target: platformDomainSettings.id,
        set: { customDomain, domainStatus, updatedAt: new Date() },
      })
      .returning();
    return NextResponse.json({ settings });
  } catch (error) {
    return serverError(error);
  }
}
