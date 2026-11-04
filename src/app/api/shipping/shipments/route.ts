import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, shipments, shippingCarriers } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await permissionGuard("shipping.read");
  if (denied) return denied;
  try {
    const search = new URL(request.url).searchParams;
    const carrierId = Number(search.get("carrierId"));
    const status = search.get("status");
    const conditions = [];
    if (Number.isInteger(carrierId) && carrierId > 0) conditions.push(eq(shipments.carrierId, carrierId));
    if (status && status !== "all") conditions.push(eq(shipments.status, status));

    const rows = await db
      .select({
        id: shipments.id,
        orderId: shipments.orderId,
        orderCode: orders.code,
        carrierId: shipments.carrierId,
        carrierName: shippingCarriers.name,
        externalShipmentId: shipments.externalShipmentId,
        trackingNumber: shipments.trackingNumber,
        trackingUrl: shipments.trackingUrl,
        labelUrl: shipments.labelUrl,
        status: shipments.status,
        cancellationStatus: shipments.cancellationStatus,
        shippingCost: shipments.shippingCost,
        billingReference: shipments.billingReference,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
        updatedAt: shipments.updatedAt,
      })
      .from(shipments)
      .innerJoin(orders, eq(orders.id, shipments.orderId))
      .leftJoin(shippingCarriers, eq(shippingCarriers.id, shipments.carrierId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(shipments.createdAt), desc(shipments.id))
      .limit(500);

    return NextResponse.json({ shipments: rows, carrierApiReady: false });
  } catch (error) {
    return serverError(error, "تعذر تحميل أرشيف البوليصات");
  }
}
