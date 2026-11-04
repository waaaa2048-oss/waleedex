import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { roleCan } from "@/lib/roles";

export async function requirePermission(permission: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=staff");
  if (!roleCan(user.role, user.permissions, permission)) redirect("/dashboard?permission=denied");
  return user;
}
