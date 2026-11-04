import type { Metadata } from "next";
import { OrdersView } from "@/components/orders/orders-view";
import { getCustomers, getOrders, getProductsByStore, getServices } from "@/lib/data";
import { roleCan } from "@/lib/roles";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الطلبات | Waleedex" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; storeId?: string }>;
}) {
  const user = await requirePermission("orders.read");
  const [{ new: newOrder, storeId: storeIdParam }, storeRows] = await Promise.all([
    searchParams,
    db.select({ id: stores.id, storeType: stores.storeType }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
  ]);
  const requestedStoreId = Number(storeIdParam);
  const storeId = storeRows.find((store) => store.id === requestedStoreId)?.id ?? storeRows[0]?.id;
  if (!storeId) throw new Error("لا توجد متاجر لعرض الطلبات");

  const [orders, customers, products, services] = await Promise.all([
    getOrders(storeId),
    getCustomers(),
    getProductsByStore(storeId),
    getServices(),
  ]);

  return (
    <OrdersView
      key={storeId}
      initialOrders={orders}
      customers={customers}
      products={products}
      services={services}
      initiallyOpen={newOrder === "1"}
      storeId={storeId}
      storeType={storeRows.find((store) => store.id === storeId)?.storeType ?? "OTHER"}
      canCreate={roleCan(user.role, user.permissions, "orders.create")}
    />
  );
}
