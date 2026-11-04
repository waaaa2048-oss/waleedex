import type { Metadata } from "next";
import { CategoriesView } from "@/components/admin/categories-view";
import { getStoreCategories } from "@/lib/admin-data";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "التصنيفات | أهل الكرم" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  await requirePermission("products.read");
  const [{ storeId: storeIdParam }, storeRows] = await Promise.all([
    searchParams,
    db.select({ id: stores.id, name: stores.name }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
  ]);
  const requestedStoreId = Number(storeIdParam);
  const selectedStore = storeRows.find((store) => store.id === requestedStoreId) ?? storeRows[0];
  if (!selectedStore) throw new Error("لا توجد متاجر لإدارة الأقسام");
  const allCategories = await getStoreCategories(selectedStore.id);

  return <CategoriesView key={selectedStore.id} initial={allCategories} storeId={selectedStore.id} storeName={selectedStore.name} />;
}
