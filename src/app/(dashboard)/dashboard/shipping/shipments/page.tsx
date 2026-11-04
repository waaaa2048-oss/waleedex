import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, shipments, shippingCarriers } from "@/db/schema";
import { ShippingShipmentsView } from "@/components/admin/shipping-shipments-view";
import { requirePermission } from "@/lib/require-permission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "أرشيف البوليصات | أهل الكرم" };

export default async function ShippingShipmentsPage() {
  await requirePermission("shipping.read");
  const [rows, carriers] = await Promise.all([
    db
      .select({
        id: shipments.id,
        orderId: shipments.orderId,
        orderCode: orders.code,
        carrierId: shipments.carrierId,
        carrierName: shippingCarriers.name,
        trackingNumber: shipments.trackingNumber,
        trackingUrl: shipments.trackingUrl,
        labelUrl: shipments.labelUrl,
        status: shipments.status,
        cancellationStatus: shipments.cancellationStatus,
        shippingCost: shipments.shippingCost,
        billingReference: shipments.billingReference,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
      })
      .from(shipments)
      .innerJoin(orders, eq(orders.id, shipments.orderId))
      .leftJoin(shippingCarriers, eq(shippingCarriers.id, shipments.carrierId))
      .orderBy(desc(shipments.createdAt), desc(shipments.id))
      .limit(500),
    db.select({ id: shippingCarriers.id, name: shippingCarriers.name }).from(shippingCarriers).orderBy(shippingCarriers.name),
  ]);

  return (
    <ShippingShipmentsView
      initial={rows.map((row) => ({
        ...row,
        shippingCost: row.shippingCost === null ? null : Number(row.shippingCost),
        createdAt: row.createdAt.toISOString(),
      }))}
      carriers={carriers}
    />
  );
}
