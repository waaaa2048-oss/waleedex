import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/log";
import { defaultPermissions, PERMISSION_OPTIONS, ROLE_PRESETS, roleCan } from "@/lib/roles";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const denied = await permissionGuard("employees.write");
  if (denied) return denied;
  const current = await getCurrentUser();
  if (!current || !roleCan(current.role, current.permissions, "employees.write")) {
    return NextResponse.json({ error: "ليس لديك صلاحية إدارة الموظفين" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const targetId = Number(id);
    const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId)).limit(1);
    if (!targetUser) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    if (targetUser.role === "admin" && current.role !== "admin") {
      return NextResponse.json({ error: "لا يمكن تعديل حساب المالك" }, { status: 403 });
    }
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if ((body?.role === "admin" || body?.role === "manager") && current.role !== "admin") {
      return NextResponse.json({ error: "صلاحية المدير العام ومدير المتجر للمالك فقط" }, { status: 403 });
    }
    const values: Partial<typeof users.$inferInsert> = {};
    if (typeof body?.name === "string" && body.name.trim().length >= 3) values.name = body.name.trim();
    if (typeof body?.phone === "string") values.phone = body.phone.trim() || null;
    if (typeof body?.role === "string" && ROLE_PRESETS.some((preset) => preset.value === body.role)) {
      values.role = body.role;
      if (!Array.isArray(body.permissions)) values.permissions = defaultPermissions(body.role);
    }
    if (Array.isArray(body?.permissions)) {
      const allowlist = new Set<string>(PERMISSION_OPTIONS.map((permission) => permission.id));
      const selected = body.permissions.filter((item): item is string => typeof item === "string" && allowlist.has(item));
      if (current.role !== "admin" && selected.some((permission) => !current.permissions.includes(permission))) {
        return NextResponse.json({ error: "لا يمكنك منح صلاحيات أعلى من صلاحيات حسابك" }, { status: 403 });
      }
      values.permissions = selected.length ? selected : ["__none__"];
    }
    if (Array.isArray(body?.allowedCategories)) values.allowedCategories = body.allowedCategories.filter((item): item is string => typeof item === "string").slice(0, 100);
    if (
      typeof body?.password === "string" &&
      body.password.length >= 8 &&
      /[A-Za-z]/.test(body.password) &&
      /\d/.test(body.password)
    ) {
      values.passwordHash = await hashPassword(body.password);
    }
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "لا توجد تغييرات" }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, Number(id)))
      .returning({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, permissions: users.permissions, allowedCategories: users.allowedCategories, createdAt: users.createdAt });
    if (!updated) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    await logActivity("تعديل موظف", "الموظفين", updated.id, updated.name);
    return NextResponse.json({ staff: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (error) {
    return serverError(error, "تعذر تحديث الموظف");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await permissionGuard("employees.write");
  if (denied) return denied;
  const current = await getCurrentUser();
  if (!current || !roleCan(current.role, current.permissions, "employees.write")) {
    return NextResponse.json({ error: "ليس لديك صلاحية إدارة الموظفين" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const target = Number(id);
    if (target === current.id) {
      return NextResponse.json({ error: "لا يمكنك حذف حسابك الحالي" }, { status: 400 });
    }
    const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, target)).limit(1);
    if (!targetUser) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    if (targetUser.role === "admin" && current.role !== "admin") {
      return NextResponse.json({ error: "لا يمكن حذف حساب المالك" }, { status: 403 });
    }
    const [deleted] = await db.delete(users).where(eq(users.id, target)).returning({ id: users.id, name: users.name });
    if (!deleted) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    await logActivity("حذف موظف", "الموظفين", deleted.id, deleted.name);
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error) {
    return serverError(error, "تعذر حذف الموظف");
  }
}
