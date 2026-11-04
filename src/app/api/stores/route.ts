import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { logActivity } from "@/lib/log";
import { seedStoreDemoCatalog } from "@/db/seed";

export const dynamic = "force-dynamic";

const STORE_TYPES = new Set(["SLAUGHTERHOUSE", "CLOTHING", "GROCERY", "FROZEN"]);
const STORE_STATUSES = new Set(["PRIVATE", "DRAFT", "PUBLISHED"]);

function slugify(value: string) {
  const trimmed = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");

  return trimmed || `store-${Date.now()}`;
}

export async function GET() {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;

  try {
    const rows = await db.select().from(stores).orderBy(desc(stores.createdAt));
    return NextResponse.json({
      stores: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return serverError(error, "تعذر تحميل المتاجر", "stores");
  }
}

export async function POST(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 2) {
      return NextResponse.json({ error: "أدخل اسم المتجر" }, { status: 400 });
    }

    const rawSlug = typeof body?.slug === "string" ? body.slug.trim() : name;
    const baseSlug = slugify(rawSlug || name);
    const requestedType = typeof body?.storeType === "string" ? body.storeType : "SLAUGHTERHOUSE";
    const requestedStatus = typeof body?.status === "string" ? body.status : "DRAFT";
    const storeType = STORE_TYPES.has(requestedType) ? requestedType : "SLAUGHTERHOUSE";
    const status = STORE_STATUSES.has(requestedStatus) ? requestedStatus : "DRAFT";
    const logoUrl = typeof body?.logoUrl === "string" && body.logoUrl.trim() ? body.logoUrl.trim() : null;

    let slug = baseSlug;
    let attempt = 1;

    while (true) {
      const [existing] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, slug)).limit(1);
      if (!existing) break;
      slug = `${baseSlug}-${attempt}`;
      attempt += 1;
    }

    const [created] = await db
      .insert(stores)
      .values({
        name,
        slug,
        storeType,
        status,
        logoUrl,
      })
      .returning();

    await seedStoreDemoCatalog(created.id, created.storeType, created.slug);
    await logActivity("إضافة متجر", "المتاجر", created.id, created.name);

    return NextResponse.json(
      {
        store: {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return serverError(error, "تعذر إضافة المتجر", "stores");
  }
}
