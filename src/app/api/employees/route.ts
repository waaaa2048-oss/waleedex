import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { getStaff } from "@/lib/admin-data";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/log";
import { defaultPermissions, PERMISSION_OPTIONS, ROLE_PRESETS, roleCan } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await permissionGuard("employees.write");
  if (denied) return denied;
  try {
    return NextResponse.json({ staff: await getStaff() });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const current = await getCurrentUser();
  if (!current || !roleCan(current.role, current.permissions, "employees.write")) {
    return NextResponse.json({ error: "ليس لديك صلاحية إدارة الموظفين" }, { status: 403 });
  }
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const requestedRole = typeof body?.role === "string" ? body.role : "sales";
    const role = ROLE_PRESETS.some((preset) => preset.value === requestedRole) ? requestedRole : "sales";
    if ((role === "admin" || role === "manager") && current.role !== "admin") {
      return NextResponse.json({ error: "صلاحية المدير العام ومدير المتجر للمالك فقط" }, { status: 403 });
    }
    const permissionAllowlist = new Set<string>(PERMISSION_OPTIONS.map((option) => option.id));
    const requestedPermissions = Array.isArray(body?.permissions) ? body.permissions.filter((item): item is string => typeof item === "string" && permissionAllowlist.has(item)) : [];
    if (current.role !== "admin" && requestedPermissions.some((permission) => !current.permissions.includes(permission))) {
      return NextResponse.json({ error: "لا يمكنك منح صلاحيات أعلى من صلاحيات حسابك" }, { status: 403 });
    }
    const permissions = Array.isArray(body?.permissions)
      ? (requestedPermissions.length ? requestedPermissions : ["__none__"])
      : defaultPermissions(role);
    const allowedCategories = Array.isArray(body?.allowedCategories) ? body.allowedCategories.filter((item): item is string => typeof item === "string").slice(0, 100) : [];
    if (name.length < 3) return NextResponse.json({ error: "أدخل اسم الموظف" }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "البريد غير صحيح" }, { status: 400 });
    if (!(password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)))
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون ٨ أحرف وتشمل حرفاً ورقماً" }, { status: 400 });

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return NextResponse.json({ error: "البريد مسجل مسبقاً" }, { status: 409 });

    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
        role,
        permissions,
        allowedCategories,
        passwordHash: await hashPassword(password),
      })
      .returning({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, permissions: users.permissions, allowedCategories: users.allowedCategories, createdAt: users.createdAt });

    await logActivity("إضافة موظف", "الموظفين", created.id, `${created.name} — ${created.email}`);
    return NextResponse.json({ staff: { ...created, createdAt: created.createdAt.toISOString() } }, { status: 201 });
  } catch (error) {
    return serverError(error, "تعذر إضافة الموظف");
  }
}
