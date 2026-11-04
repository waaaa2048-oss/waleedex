import type { Metadata } from "next";
import { CouponsView } from "@/components/admin/coupons-view";
import { getCoupons } from "@/lib/admin-data";

import { requirePermission } from "@/lib/require-permission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الكوبونات والعروض | أهل الكرم" };

export default async function CouponsPage() {
  await requirePermission("coupons.write");

  return <CouponsView initial={await getCoupons()} />;
}
