import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { shippingCarriers } from "@/db/schema";
import { ShippingCarriersView } from "@/components/admin/shipping-carriers-view";
import { requirePermission } from "@/lib/require-permission";
import { shippingCredentialEncryptionReady } from "@/lib/shipping-credentials";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "شركات الشحن | أهل الكرم" };

export default async function ShippingCarriersPage() {
  await requirePermission("shipping.read");
  const carriers = await db
    .select({
      id: shippingCarriers.id,
      key: shippingCarriers.key,
      name: shippingCarriers.name,
      apiBaseUrl: shippingCarriers.apiBaseUrl,
      isEnabled: shippingCarriers.isEnabled,
      hasCredentials: shippingCarriers.credentialsCiphertext,
    })
    .from(shippingCarriers)
    .orderBy(asc(shippingCarriers.name));

  return (
    <ShippingCarriersView
      initial={carriers.map((carrier) => ({
        ...carrier,
        hasCredentials: Boolean(carrier.hasCredentials),
      }))}
      credentialsEncryptionReady={shippingCredentialEncryptionReady()}
    />
  );
}
