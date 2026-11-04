import type { Metadata } from "next";
import { ServicesView } from "@/components/services/services-view";
import { getServices } from "@/lib/data";

import { requirePermission } from "@/lib/require-permission";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الطبخ والعشاء | Waleedex" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ storeId?: string }> }) {
  await requirePermission("products.read");

  const [{ storeId: storeIdParam }, storeRows] = await Promise.all([
    searchParams,
    db.select({ id: stores.id, storeType: stores.storeType }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
  ]);
  const requestedStoreId = Number(storeIdParam);
  const selectedStore = storeRows.find((store) => store.id === requestedStoreId) ?? storeRows[0];
  if (!selectedStore || selectedStore.storeType !== "SLAUGHTERHOUSE") notFound();

  const services = await getServices();
  return <ServicesView initialServices={services} />;
}
