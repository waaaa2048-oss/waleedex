import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
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
  const cookieStore = await cookies();
  const phone = cookieStore.get("user_phone")?.value;
  const storeBasePath = `/${storeSlug}`;

  if (!phone) redirect(`${storeBasePath}/customer/login`);

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  const rawOrders = customer
    ? await db
        .select()
        .from(orders)
        .where(and(eq(orders.customerId, customer.id), eq(orders.storeId, storeId)))
        .orderBy(orders.createdAt)
    : [];

  const customerData = JSON.parse(
    JSON.stringify({
      name: customer?.name || "عميل",
      phone,
      email: customer?.email || "",
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
