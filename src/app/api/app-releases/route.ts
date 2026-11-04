import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appReleases } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { logActivity } from "@/lib/log";

export const dynamic = "force-dynamic";

const PLATFORMS = ["android", "ios", "windows"] as const;
type Platform = (typeof PLATFORMS)[number];

function validArtifactUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const releases = await db.select().from(appReleases).orderBy(desc(appReleases.createdAt), desc(appReleases.id));
    return NextResponse.json({ releases });
  } catch (error) {
    return serverError(error, "تعذر تحميل إصدارات التطبيقات");
  }
}

export async function POST(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "بيانات الإصدار غير صالحة" }, { status: 400 });

    const version = typeof body.version === "string" ? body.version.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const platforms = Array.isArray(body.platforms)
      ? Array.from(new Set(body.platforms.filter((value): value is Platform => PLATFORMS.includes(value as Platform))))
      : [];
    const artifacts = body.artifacts && typeof body.artifacts === "object"
      ? body.artifacts as Record<string, unknown>
      : {};

    if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(version)) {
      return NextResponse.json({ error: "اكتب رقم إصدار بصيغة مثل 1.2.3" }, { status: 400 });
    }
    if (notes.length > 2000) return NextResponse.json({ error: "ملاحظات الإصدار تتجاوز الحد المسموح" }, { status: 400 });
    if (platforms.length === 0) return NextResponse.json({ error: "اختر منصة واحدة على الأقل" }, { status: 400 });

    for (const platform of platforms) {
      const artifactUrl = artifacts[platform];
      if (artifactUrl !== undefined && artifactUrl !== null && artifactUrl !== "" && !validArtifactUrl(artifactUrl)) {
        return NextResponse.json({ error: "روابط ملفات الإصدار يجب أن تكون روابط HTTPS صالحة" }, { status: 400 });
      }
    }

    const releaseGroup = randomUUID();
    const values = platforms.map((platform) => ({
      releaseGroup,
      platform,
      version,
      notes,
      artifactUrl: typeof artifacts[platform] === "string" && artifacts[platform].trim()
        ? (artifacts[platform] as string).trim()
        : null,
      status: "draft",
    }));
    const created = await db.insert(appReleases).values(values).returning();
    await logActivity("إنشاء مسودة إصدار تطبيق", "التطبيقات", releaseGroup, `${version} · ${platforms.join(", ")}`);
    return NextResponse.json({ releases: created }, { status: 201 });
  } catch (error) {
    return serverError(error, "تعذر حفظ مسودة الإصدار");
  }
}

export async function PATCH(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const id = Number(body?.id);
    if (!body || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "معرّف الإصدار غير صالح" }, { status: 400 });
    }

    const status = body.status;
    if (status !== undefined && status !== "draft" && status !== "ready" && status !== "archived") {
      return NextResponse.json({ error: "حالة الإصدار غير صالحة" }, { status: 400 });
    }

    const [current] = await db.select().from(appReleases).where(eq(appReleases.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "الإصدار غير موجود" }, { status: 404 });
    if (current.status !== "draft" && (body.notes !== undefined || body.artifactUrl !== undefined)) {
      return NextResponse.json({ error: "تعديل البيانات متاح للمسودات فقط" }, { status: 409 });
    }
    if (current.platform === "ios" && status === "ready") {
      return NextResponse.json({ error: "نشر iOS غير مهيأ: يلزم مشروع iOS وحساب Apple Developer" }, { status: 400 });
    }
    if (status === "ready" && !current.artifactUrl) {
      return NextResponse.json({ error: "أضف رابط ملف الإصدار قبل تعليمه جاهزاً للمراجعة" }, { status: 400 });
    }

    const notes = body.notes;
    if (notes !== undefined && (typeof notes !== "string" || notes.trim().length > 2000)) {
      return NextResponse.json({ error: "ملاحظات الإصدار غير صالحة أو تتجاوز الحد المسموح" }, { status: 400 });
    }
    const artifactUrl = body.artifactUrl;
    if (artifactUrl !== undefined && artifactUrl !== null && artifactUrl !== "" && !validArtifactUrl(artifactUrl)) {
      return NextResponse.json({ error: "رابط ملف الإصدار يجب أن يكون رابط HTTPS صالحاً" }, { status: 400 });
    }
    if (status === undefined && notes === undefined && artifactUrl === undefined) {
      return NextResponse.json({ error: "لا توجد تغييرات لحفظها" }, { status: 400 });
    }

    const [updated] = await db
      .update(appReleases)
      .set({
        ...(status === undefined ? {} : { status: status as "draft" | "ready" | "archived" }),
        ...(notes === undefined ? {} : { notes: (notes as string).trim() }),
        ...(artifactUrl === undefined ? {} : { artifactUrl: typeof artifactUrl === "string" && artifactUrl.trim() ? artifactUrl.trim() : null }),
        updatedAt: new Date(),
      })
      .where(eq(appReleases.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "الإصدار غير موجود" }, { status: 404 });
    await logActivity("تحديث إصدار تطبيق", "التطبيقات", updated.id, `${updated.platform} ${updated.version} · ${updated.status}`);
    return NextResponse.json({ release: updated });
  } catch (error) {
    return serverError(error, "تعذر تحديث حالة الإصدار");
  }
}

export async function DELETE(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "معرّف الإصدار غير صالح" }, { status: 400 });

    const [current] = await db.select().from(appReleases).where(eq(appReleases.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "الإصدار غير موجود" }, { status: 404 });
    if (current.status !== "draft") {
      return NextResponse.json({ error: "يمكن حذف المسودات فقط" }, { status: 409 });
    }
    const [deleted] = await db
      .delete(appReleases)
      .where(and(eq(appReleases.id, id), eq(appReleases.status, "draft")))
      .returning({ id: appReleases.id, platform: appReleases.platform, version: appReleases.version });
    if (!deleted) return NextResponse.json({ error: "تغيرت حالة الإصدار؛ حدّث الصفحة ثم حاول مجدداً" }, { status: 409 });
    await logActivity("حذف مسودة إصدار تطبيق", "التطبيقات", deleted.id, `${deleted.platform} ${deleted.version}`);
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    return serverError(error, "تعذر حذف مسودة الإصدار");
  }
}