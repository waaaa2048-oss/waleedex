import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ensureSeeded } from "@/db/seed";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  const [user, storeRows] = await Promise.all([
    requireUser(),
    db.select({ id: stores.id, name: stores.name, storeType: stores.storeType }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
  ]);

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role, permissions: user.permissions }}
      stores={storeRows}
    >
      {children}
    </DashboardShell>
  );
}
