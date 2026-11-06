import { getCurrentCustomer } from "@/lib/customer-auth";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import AccountClientView from "@/app/(store)/account/AccountClientView";

export async function CustomerAccountPage({
  storeId,
  storeName,
  storeSlug,
}: {
  storeId: number;
  storeName: string;
  storeSlug: string;
}) {
  const storeBasePath = `/${storeSlug}`;

  // الهوية من جلسة الخادم فقط، لا من كوكي الجوال.
  const customer = await getCurrentCustomer();
  if (!customer) redirect(`${storeBasePath}/customer/login`);

  const rawOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.customerId, customer.id), eq(orders.storeId, storeId)))
    .orderBy(orders.createdAt);

  const customerData = JSON.parse(
    JSON.stringify({
      name: customer.name || "عميل",
      phone: customer.phone,
      email: customer.email || "",
      orders: rawOrders,
    }),
  );

  return (
    <AccountClientView
      customer={customerData}
      storeName={storeName}
      storeSlug={storeSlug}
    />
  );
}
