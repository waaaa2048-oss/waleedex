import type { Metadata } from "next";
import { IntegrationsView } from "@/components/admin/integrations-view";
import { getIntegrations } from "@/lib/admin-data";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "التكاملات والمواقع | أهل الكرم" };

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ storeId?: string }> }) {
  await requirePermission("integrations.write");
  const [{ storeId: storeIdParam }, storeRows] = await Promise.all([
    searchParams,
    db.select({ id: stores.id, name: stores.name }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
  ]);
  const requestedId = Number(storeIdParam);
  const selectedStore = storeRows.find((store) => store.id === requestedId) ?? storeRows[0];
  if (!selectedStore) throw new Error("لا توجد متاجر لإدارة التكاملات");

  return (
    <IntegrationsView
      key={selectedStore.id}
      initial={await getIntegrations(selectedStore.id)}
      storeId={selectedStore.id}
      storeName={selectedStore.name}
    />
  );
}
