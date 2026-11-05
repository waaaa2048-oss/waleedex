/**
 * orders.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. calculateOrderLines يُرجع missingProductIds / missingServiceIds.
 *   2. createOrder و updateOrder يرميان خطأ عند وجود أصناف مفقودة.
 *   3. إصلاح paidAmount > total في updateOrder (حساب newTotal أولاً).
 *   4. التحقق من paymentMethod ضد PAYMENT_METHODS.
 *   5. باقي منطق الحساب والخصم بدون تغيير.
 */

import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, orderItems, orderServices, orders, products, services } from "@/db/schema";
import { getOrderById, nextOrderCode } from "./data";
import { ORDER_STATUSES, PAYMENT_METHODS, type OrderStatus } from "./format";
import type { OrderDTO, OrderInput } from "./types";

const round2 = (value: number) => Math.round(value * 100) / 100;

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
};

const asText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const asOptionalText = (value: unknown): string | null => {
  const text = asText(value);
  return text === "" ? null : text;
};

/* ───────────── Payload parsing ───────────── */

export function parseOrderPayload(body: unknown): ParseResult<OrderInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "بيانات غير صالحة" };
  const payload = body as Record<string, unknown>;

  const customerId = asNumber(payload.customerId);
  if (!customerId || customerId <= 0) return { ok: false, error: "اختر العميل أولاً" };

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .map((line) => {
      const entry = line as Record<string, unknown>;
      return {
        productId: asNumber(entry.productId) ?? 0,
        quantity: Math.max(1, Math.min(50, Math.round(asNumber(entry.quantity) ?? 1))),
      };
    })
    .filter((line) => line.productId > 0);

  if (items.length === 0) return { ok: false, error: "أضف ذبيحة واحدة على الأقل إلى الطلب" };

  const rawServices = Array.isArray(payload.services) ? payload.services : [];
  const serviceLines = rawServices
    .map((line) => {
      const entry = line as Record<string, unknown>;
      return {
        serviceId: asNumber(entry.serviceId) ?? 0,
        quantity: Math.max(1, Math.min(50, Math.round(asNumber(entry.quantity) ?? 1))),
      };
    })
    .filter((line) => line.serviceId > 0);

  const statusRaw = asText(payload.status) || "new";
  const status = (ORDER_STATUSES.includes(statusRaw as OrderStatus) ? statusRaw : "new") as OrderStatus;
  const fulfillment = asText(payload.fulfillment) === "pickup" ? "pickup" : "delivery";
  const paidAmount = Math.max(0, asNumber(payload.paidAmount) ?? 0);
  const deliveryFee = Math.max(0, asNumber(payload.deliveryFee) ?? 0);
  const paymentReceipt = asOptionalText(payload.paymentReceipt);

  return {
    ok: true,
    value: {
      customerId,
      status,
      fulfillment,
      deliveryDate: asOptionalText(payload.deliveryDate),
      deliveryAddress: asOptionalText(payload.deliveryAddress),
      deliveryFee,
      notes: asOptionalText(payload.notes),
      paymentMethod: asText(payload.paymentMethod) || "cash",
      paidAmount,
      paymentReceipt,
      items,
      services: serviceLines,
    },
  };
}

/* ───────────── Line calculation ───────────── */

export async function calculateOrderLines(input: Pick<OrderInput, "items" | "services">) {
  const productIds = Array.from(new Set(input.items.map((item) => item.productId)));
  const serviceIds = Array.from(new Set(input.services.map((item) => item.serviceId)));

  const [productRows, serviceRows] = await Promise.all([
    productIds.length
      ? db.select().from(products).where(inArray(products.id, productIds))
      : Promise.resolve([]),
    serviceIds.length
      ? db.select().from(services).where(inArray(services.id, serviceIds))
      : Promise.resolve([]),
  ]);

  const productById = new Map(productRows.map((row) => [row.id, row]));
  const serviceById = new Map(serviceRows.map((row) => [row.id, row]));
  const storeIds = new Set(productRows.map((row) => row.storeId));
  if (storeIds.size > 1) throw new Error("لا يمكن جمع منتجات من متاجر مختلفة في طلب واحد");

  const items = input.items
    .map((line) => {
      const product = productById.get(line.productId);
      if (!product) return null;
      const fixed = product.fixedPrice === null ? 0 : Number(product.fixedPrice);
      const unitPrice = fixed > 0 ? round2(fixed) : round2(Number(product.weightKg) * Number(product.pricePerKg));
      return {
        productId: product.id,
        name: product.name,
        animalType: product.animalType,
        quantity: line.quantity,
        weightKg: product.weightKg,
        unitPrice: String(unitPrice),
        lineTotal: String(round2(unitPrice * line.quantity)),
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  const serviceLines = input.services
    .map((line) => {
      const service = serviceById.get(line.serviceId);
      if (!service) return null;
      return {
        serviceId: service.id,
        name: service.name,
        quantity: line.quantity,
        unitPrice: service.price,
        lineTotal: String(round2(Number(service.price) * line.quantity)),
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  // Report missing IDs so callers can reject partial orders.
  const foundProductIds = new Set(items.map((line) => line.productId));
  const missingProductIds = input.items
    .map((line) => line.productId)
    .filter((id) => !foundProductIds.has(id));

  const foundServiceIds = new Set(serviceLines.map((line) => line.serviceId));
  const missingServiceIds = input.services
    .map((line) => line.serviceId)
    .filter((id) => !foundServiceIds.has(id));

  const total = round2(
    items.reduce((sum, line) => sum + Number(line.lineTotal), 0) +
      serviceLines.reduce((sum, line) => sum + Number(line.lineTotal), 0),
  );

  return {
    items,
    serviceLines,
    total,
    storeId: productRows[0]?.storeId ?? null,
    missingProductIds,
    missingServiceIds,
  };
}

/* ───────────── Create ───────────── */

export async function createOrder(input: OrderInput): Promise<OrderDTO> {
  const customer = await db
    .select({ id: customers.id, address: customers.address, city: customers.city })
    .from(customers)
    .where(eq(customers.id, input.customerId))
    .limit(1);

  if (customer.length === 0) throw new Error("العميل غير موجود");

  const { items, serviceLines, total: itemsTotal, storeId, missingProductIds, missingServiceIds } =
    await calculateOrderLines(input);

  if (missingProductIds.length > 0) {
    throw new Error(`منتجات غير موجودة: ${missingProductIds.join(", ")}`);
  }
  if (missingServiceIds.length > 0) {
    throw new Error(`خدمات غير موجودة: ${missingServiceIds.join(", ")}`);
  }
  if (items.length === 0) throw new Error("لم يتم العثور على الذبايح المختارة");
  if (storeId === null) throw new Error("تعذر تحديد المتجر للطلب");

  const deliveryFee = input.fulfillment === "delivery" ? round2(Math.max(0, input.deliveryFee ?? 0)) : 0;
  const total = round2(itemsTotal + deliveryFee);
  const code = await nextOrderCode();
  const deliveryAddress =
    input.deliveryAddress ??
    (input.fulfillment === "delivery" ? (customer[0].address ?? customer[0].city) : "استلام من الفرع");

  const orderId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(orders)
      .values({
        storeId,
        code,
        customerId: input.customerId,
        status: input.status ?? "new",
        fulfillment: input.fulfillment,
        deliveryDate: input.deliveryDate ?? null,
        deliveryAddress,
        deliveryFee: String(deliveryFee),
        notes: input.notes ?? null,
        totalAmount: String(total),
        paidAmount: String(Math.min(input.paidAmount ?? 0, total)),
        paymentMethod: input.paymentMethod ?? "cash",
        paymentReceipt: input.paymentReceipt ?? null,
      })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(items.map((line) => ({ ...line, orderId: created.id })));
    if (serviceLines.length > 0) {
      await tx.insert(orderServices).values(serviceLines.map((line) => ({ ...line, orderId: created.id })));
    }
    return created.id;
  });

  const order = await getOrderById(orderId);
  if (!order) throw new Error("تعذر إنشاء الطلب");
  return order;
}

/* ───────────── Update ───────────── */

export type OrderUpdatePayload = Partial<OrderInput> & { recalculate?: boolean };

export async function updateOrder(id: number, payload: OrderUpdatePayload): Promise<OrderDTO> {
  const existing = await getOrderById(id);
  if (!existing) throw new Error("الطلب غير موجود");

  const shouldRecalculate = Array.isArray(payload.items) && payload.items.length > 0;
  let computed: Awaited<ReturnType<typeof calculateOrderLines>> | null = null;

  const deliveryFee = payload.deliveryFee === undefined
    ? (payload.fulfillment === "pickup" ? 0 : existing.deliveryFee)
    : Math.max(0, round2(payload.deliveryFee));

  if (shouldRecalculate) {
    computed = await calculateOrderLines({
      items: payload.items ?? [],
      services: payload.services ?? [],
    });
    if (computed.missingProductIds.length > 0) {
      throw new Error(`منتجات غير موجودة: ${computed.missingProductIds.join(", ")}`);
    }
    if (computed.missingServiceIds.length > 0) {
      throw new Error(`خدمات غير موجودة: ${computed.missingServiceIds.join(", ")}`);
    }
    if (computed.items.length === 0) throw new Error("لم يتم العثور على الذبايح المختارة");
    if (computed.storeId !== existing.storeId) {
      throw new Error("لا يمكن نقل الطلب إلى متجر آخر");
    }
  }

  const isPickup = payload.fulfillment === "pickup";
  const deliveryFeeChanged = payload.deliveryFee !== undefined || isPickup;

  let newTotal: number;
  if (computed) {
    newTotal = round2(computed.total + deliveryFee);
  } else if (deliveryFeeChanged) {
    const itemsTotal = existing.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const servicesTotal = existing.services.reduce((sum, service) => sum + service.lineTotal, 0);
    newTotal = round2(itemsTotal + servicesTotal + deliveryFee);
  } else {
    newTotal = existing.totalAmount;
  }

  await db.transaction(async (tx) => {
    const values: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };

    if (typeof payload.customerId === "number" && payload.customerId > 0) values.customerId = payload.customerId;
    if (payload.status && ORDER_STATUSES.includes(payload.status)) values.status = payload.status;
    if (payload.fulfillment) values.fulfillment = payload.fulfillment === "pickup" ? "pickup" : "delivery";
    if (payload.deliveryDate !== undefined) values.deliveryDate = payload.deliveryDate;
    if (payload.deliveryAddress !== undefined) values.deliveryAddress = payload.deliveryAddress;
    if (deliveryFeeChanged) values.deliveryFee = String(deliveryFee);
    if (payload.notes !== undefined) values.notes = payload.notes;
    if (payload.paymentMethod && payload.paymentMethod in PAYMENT_METHODS) {
      values.paymentMethod = payload.paymentMethod;
    }
    if (payload.paymentReceipt !== undefined) {
      values.paymentReceipt = payload.paymentReceipt;
    }

    if (computed || deliveryFeeChanged) {
      values.totalAmount = String(newTotal);
    }

    if (typeof payload.paidAmount === "number") {
      values.paidAmount = String(Math.max(0, Math.min(payload.paidAmount, newTotal)));
    } else if (computed || deliveryFeeChanged) {
      values.paidAmount = String(Math.min(existing.paidAmount, newTotal));
    }

    if (computed) {
      await tx.delete(orderItems).where(eq(orderItems.orderId, id));
      await tx.delete(orderServices).where(eq(orderServices.orderId, id));
      await tx.insert(orderItems).values(computed.items.map((line) => ({ ...line, orderId: id })));
      if (computed.serviceLines.length > 0) {
        await tx
          .insert(orderServices)
          .values(computed.serviceLines.map((line) => ({ ...line, orderId: id })));
      }
    }

    await tx.update(orders).set(values).where(eq(orders.id, id));
  });

  const updated = await getOrderById(id);
  if (!updated) throw new Error("تعذر تحديث الطلب");
  return updated;
}

/* ───────────── Helpers ───────────── */

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}
