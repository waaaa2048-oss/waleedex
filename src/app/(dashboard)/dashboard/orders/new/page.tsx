import type { Metadata } from "next";
import { OrderCreateView } from "@/components/orders/order-create-view";
import { getOrderCustomerOptions, getProductsByStore, getServices } from "@/lib/data";
import { requirePermission } from "@/lib/require-permission";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إنشاء طلب | Waleedex" };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ storeId?: string }> }) {
  await requirePermission("orders.create");
  const [{ storeId: storeIdParam }, storeRows, customers, services] = await Promise.all([
    searchParams,
    db.select({ id: stores.id, storeType: stores.storeType }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
    getOrderCustomerOptions(),
    getServices(),
  ]);
  const requestedStoreId = Number(storeIdParam);
  const storeId = storeRows.find((store) => store.id === requestedStoreId)?.id ?? storeRows[0]?.id;
  if (!storeId) throw new Error("لا توجد متاجر لإنشاء الطلب");
  const products = await getProductsByStore(storeId);

  const selectedStore = storeRows.find((store) => store.id === storeId);
  return <OrderCreateView key={storeId} customers={customers} products={products} services={services} isSlaughterhouseStore={selectedStore?.storeType === "SLAUGHTERHOUSE"} />;
}
