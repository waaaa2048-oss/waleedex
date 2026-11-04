import type { Metadata } from "next";
import { EmployeesView } from "@/components/admin/employees-view";
import { getStaff, getStoreCategories } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";
import { roleCan } from "@/lib/roles";

import { requirePermission } from "@/lib/require-permission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الموظفون | أهل الكرم" };

export default async function EmployeesPage() {
  await requirePermission("employees.write");

  const [user, staff, categories] = await Promise.all([requireUser(), getStaff(), getStoreCategories()]);
  return <EmployeesView initial={staff} currentUserId={user.id} isAdmin={roleCan(user.role, user.permissions, "employees.write")} categories={categories.map(({ id, name }) => ({ id, name }))} />;
}
