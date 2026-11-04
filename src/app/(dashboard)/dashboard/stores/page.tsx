import type { Metadata } from "next";
import { StoresView } from "@/components/admin/stores-view";
import { getStoreSettings } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إدارة المتاجر | لوحة التحكم" };

export default async function StoresPage() {
  await requirePermission("settings.write");

  const [settings, user, storeRows] = await Promise.all([
    getStoreSettings(),
    requireUser(),
    db.select().from(stores).orderBy(asc(stores.createdAt)),
  ]);
  const initialStores = storeRows.map((store) => ({
    ...store,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  }));
  return <StoresView settings={settings} ownerName={user.name} initialStores={initialStores} />;
}
