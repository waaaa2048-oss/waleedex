import type { Metadata } from "next";
import { CustomersView } from "@/components/customers/customers-view";
import { getCustomers } from "@/lib/data";

import { requirePermission } from "@/lib/require-permission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "العملاء | Waleedex" };

export default async function CustomersPage() {
  await requirePermission("customers.read");

  const customers = await getCustomers();
  return <CustomersView initialCustomers={customers} />;
}
