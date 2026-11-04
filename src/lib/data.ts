/**
 * data.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. nextOrderCode(tx?) — تقبل tx لاستخدام advisory lock (يمنع race).
 *   2. getActiveProducts تستعلم DB مباشرة (بدون فلترة في JS).
 *   3. localDateKey helper — توحيد توليد مفاتيح التاريخ.
 *   4. إصلاح bug في dailySeries: كان يستخدم UTC بدل التوقيت المحلي.
 *   5. todayKey يستخدم helper للاتساق.
 */

import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  orderItems,
  orderServices,
  orders,
  products,
  productModifiers,
  services,
  type CustomerRow,
  type OrderRow,
  type ProductRow,
  type ServiceRow,
} from "@/db/schema";
import type {
  CustomerDTO,
  DashboardData,
  OrderDTO,
  OrderLineDTO,
  OrderServiceLineDTO,
  ProductDTO,
  ProductModifierDTO,
  ServiceDTO,
} from "./types";
import { ORDER_STATUSES, type OrderStatus } from "./format";

const num = (value: string | number | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Local-time YYYY-MM-DD (avoids UTC shifts around midnight). */
const localDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/* --------------------------- DTO mappers --------------------------- */

export function toProductDTO(row: ProductRow): ProductDTO {
  const weightKg = num(row.weightKg);
  const pricePerKg = num(row.pricePerKg);
  const fixedPrice = row.fixedPrice === null ? null : num(row.fixedPrice);
  const totalPrice = round2(weightKg * pricePerKg);
  return {
    id: row.id,
    storeId: row.storeId,
    sku: row.sku,
    name: row.name,
    animalType: row.animalType,
    category: row.category,
    kind: (row.kind === "custom" || row.kind === "booking" ? row.kind : "ready") as ProductDTO["kind"],
    description: row.description,
    weightKg,
    pricePerKg,
    fixedPrice: fixedPrice && fixedPrice > 0 ? fixedPrice : null,
    totalPrice,
    price: fixedPrice && fixedPrice > 0 ? fixedPrice : totalPrice,
    stock: row.stock,
    imageUrl: row.imageUrl,
    origin: row.origin,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toCustomerDTO(row: CustomerRow): CustomerDTO {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    address: row.address,
    notes: row.notes,
    isVip: row.isVip,
    createdAt: row.createdAt.toISOString(),
    orderCount: 0,
    totalSpend: 0,
    lastOrderAt: null,
  };
}

export function toServiceDTO(row: ServiceRow): ServiceDTO {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    price: num(row.price),
    unit: row.unit,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    usageCount: 0,
  };
}

/* --------------------------- Products --------------------------- */

export async function getProducts(): Promise<ProductDTO[]> {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt), desc(products.id));
  return withProductModifiers(rows);
}

export async function getProductsByStore(storeId: number): Promise<ProductDTO[]> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(desc(products.createdAt), desc(products.id));
  return withProductModifiers(rows);
}

export async function getActiveProducts(): Promise<ProductDTO[]> {
  // Query the DB directly — don't load inactive products only to filter them out.
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt), desc(products.id));
  return withProductModifiers(rows);
}

export async function getActiveProductsByStore(storeId: number): Promise<ProductDTO[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.isActive, true)))
    .orderBy(desc(products.createdAt), desc(products.id));
  return withProductModifiers(rows);
}

async function withProductModifiers(rows: ProductRow[]): Promise<ProductDTO[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const modifierRows = await db.select().from(productModifiers).where(inArray(productModifiers.productId, ids));
  const modifiersByProduct = new Map<number, ProductModifierDTO[]>();

  for (const row of modifierRows) {
    const options = row.options.flatMap((option) => {
      const label = typeof option.label === "string" ? option.label : "";
      const value = typeof option.value === "string" ? option.value : label;
      if (!label || !value) return [];
      const priceDelta = Number(option.priceDelta ?? 0);
      return [{ label, value, priceDelta: Number.isFinite(priceDelta) ? priceDelta : 0 }];
    });
    const list = modifiersByProduct.get(row.productId) ?? [];
    list.push({ id: row.id, name: row.name, type: row.type, required: row.required, options });
    modifiersByProduct.set(row.productId, list);
  }

  return rows.map((row) => ({
    ...toProductDTO(row),
    modifiers: modifiersByProduct.get(row.id) ?? [],
  }));
}

/* --------------------------- Customers -------------------------- */

export type OrderCustomerOption = Pick<CustomerDTO, "id" | "name" | "phone" | "city" | "isVip">;

export async function getOrderCustomerOptions(): Promise<OrderCustomerOption[]> {
  return db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      city: customers.city,
      isVip: customers.isVip,
    })
    .from(customers)
    .orderBy(desc(customers.createdAt), desc(customers.id));
}

export async function getCustomers(): Promise<CustomerDTO[]> {
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt), desc(customers.id));
  const stats = await db
    .select({
      customerId: orders.customerId,
      orderCount: sql<number>`count(*)::int`,
      totalSpend: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
      lastOrderAt: sql<string | null>`max(${orders.createdAt})`,
    })
    .from(orders)
    .groupBy(orders.customerId);

  const byId = new Map(stats.map((stat) => [stat.customerId, stat]));
  return rows.map((row) => {
    const base = toCustomerDTO(row);
    const stat = byId.get(row.id);
    return {
      ...base,
      orderCount: stat ? Number(stat.orderCount) : 0,
      totalSpend: stat ? round2(num(stat.totalSpend)) : 0,
      lastOrderAt: stat?.lastOrderAt ? new Date(stat.lastOrderAt).toISOString() : null,
    };
  });
}

/* --------------------------- Services --------------------------- */

export async function getServices(): Promise<ServiceDTO[]> {
  const rows = await db.select().from(services).orderBy(asc(services.id));
  const stats = await db
    .select({
      serviceId: orderServices.serviceId,
      usageCount: sql<number>`count(*)::int`,
    })
    .from(orderServices)
    .groupBy(orderServices.serviceId);

  const byId = new Map(stats.map((stat) => [stat.serviceId, Number(stat.usageCount)]));
  return rows.map((row) => ({ ...toServiceDTO(row), usageCount: byId.get(row.id) ?? 0 }));
}

/* ---------------------------- Orders ---------------------------- */

type OrderJoinRow = {
  order: OrderRow;
  customerName: string;
  customerPhone: string;
  customerCity: string;
};

function buildOrders(
  rows: OrderJoinRow[],
  itemRows: (typeof orderItems.$inferSelect)[],
  serviceRows: (typeof orderServices.$inferSelect)[],
): OrderDTO[] {
  const itemsByOrder = new Map<number, OrderLineDTO[]>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({
      id: item.id,
      productId: item.productId,
      name: item.name,
      animalType: item.animalType,
      quantity: item.quantity,
      weightKg: num(item.weightKg),
      unitPrice: num(item.unitPrice),
      lineTotal: num(item.lineTotal),
    });
    itemsByOrder.set(item.orderId, list);
  }

  const servicesByOrder = new Map<number, OrderServiceLineDTO[]>();
  for (const service of serviceRows) {
    const list = servicesByOrder.get(service.orderId) ?? [];
    list.push({
      id: service.id,
      serviceId: service.serviceId,
      name: service.name,
      quantity: service.quantity,
      unitPrice: num(service.unitPrice),
      lineTotal: num(service.lineTotal),
    });
    servicesByOrder.set(service.orderId, list);
  }

  return rows.map(({ order, customerName, customerPhone, customerCity }) => ({
    id: order.id,
    storeId: order.storeId,
    code: order.code,
    customerId: order.customerId,
    customerName,
    customerPhone,
    customerCity,
    status: (ORDER_STATUSES.includes(order.status as OrderStatus) ? order.status : "new") as OrderStatus,
    fulfillment: order.fulfillment === "pickup" ? "pickup" : "delivery",
    deliveryDate: order.deliveryDate,
    deliveryAddress: order.deliveryAddress,
    deliveryFee: num(order.deliveryFee),
    notes: order.notes,
    totalAmount: num(order.totalAmount),
    paidAmount: num(order.paidAmount),
    paymentMethod: order.paymentMethod,
    hasPaymentReceipt: Boolean(order.paymentReceiptPath),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: itemsByOrder.get(order.id) ?? [],
    services: servicesByOrder.get(order.id) ?? [],
  }));
}

export async function getOrders(storeId?: number): Promise<OrderDTO[]> {
  const orderRows = await db
    .select({
      order: orders,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerCity: customers.city,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(typeof storeId === "number" ? eq(orders.storeId, storeId) : undefined)
    .orderBy(desc(orders.createdAt), desc(orders.id));

  if (orderRows.length === 0) return [];
  const ids = orderRows.map((row) => row.order.id);
  const [itemRows, serviceRows] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
    db.select().from(orderServices).where(inArray(orderServices.orderId, ids)),
  ]);

  return buildOrders(orderRows, itemRows, serviceRows);
}

export async function getOrderById(id: number): Promise<OrderDTO | null> {
  const rows = await db
    .select({
      order: orders,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerCity: customers.city,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  const [itemRows, serviceRows] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderServices).where(eq(orderServices.orderId, id)),
  ]);
  return buildOrders(rows, itemRows, serviceRows)[0] ?? null;
}

/**
 * Generates the next human-readable order code.
 *
 * ⚠️ If called inside a transaction (`tx` provided), acquires a Postgres
 * advisory lock to serialize concurrent calls — this prevents two parallel
 * `createOrder` calls from generating the same code and hitting a
 * `unique_violation` on `orders.code`.
 *
 * Callers OUTSIDE a transaction keep the old (unlocked) behavior.
 */
export async function nextOrderCode(tx?: typeof db): Promise<string> {
  const client = tx ?? db;
  if (tx) {
    // xact-scoped lock: auto-released at end of transaction.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('orders_code_seq'))`);
  }
  const result = await client
    .select({ max: sql<number>`coalesce(max(${orders.id}), 0)` })
    .from(orders);
  const base = Number(result[0]?.max ?? 0) + 1001;
  return `DB-${base}`;
}

/* --------------------------- Dashboard -------------------------- */

export async function getDashboardData(storeId?: number): Promise<DashboardData> {
  const [allOrders, productsList, customersList] = await Promise.all([
    getOrders(storeId),
    typeof storeId === "number" ? getProductsByStore(storeId) : getProducts(),
    db.select({ id: customers.id, name: customers.name, city: customers.city }).from(customers),
  ]);
  const orderedCustomerIds = new Set(allOrders.map((order) => order.customerId));
  const relevantCustomers = typeof storeId === "number"
    ? customersList.filter((customer) => orderedCustomerIds.has(customer.id))
    : customersList;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const todayKey = localDateKey(now);

  const validOrders = allOrders.filter((order) => order.status !== "cancelled");
  const revenue = validOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  const todayOrders = validOrders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt >= todayStart && createdAt < tomorrowStart;
  });

  const needsAttentionOrders = allOrders
    .filter(
      (order) =>
        order.status === "new" ||
        (Boolean(order.deliveryDate && order.deliveryDate < todayKey) &&
          !["delivered", "cancelled"].includes(order.status)),
    )
    .sort((left, right) => {
      const priority = (order: OrderDTO) =>
        order.deliveryDate && order.deliveryDate < todayKey ? 0 : 1;
      return (
        priority(left) - priority(right) ||
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    });

  const monthRevenue = validOrders
    .filter((order) => new Date(order.createdAt) >= monthStart)
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const statusCounts: Record<string, number> = {};
  for (const status of ORDER_STATUSES) statusCounts[status] = 0;
  for (const order of allOrders) statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;

  const dailySeries: DashboardData["dailySeries"] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayKey = localDateKey(day);
    const dayOrders = validOrders.filter(
      (order) => localDateKey(new Date(order.createdAt)) === dayKey,
    );
    dailySeries.push({
      date: dayKey,
      label: new Intl.DateTimeFormat("ar-SA", { weekday: "short" }).format(day),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    });
  }

  const customerStats = new Map<number, { orders: number; spend: number }>();
  for (const order of validOrders) {
    const current = customerStats.get(order.customerId) ?? { orders: 0, spend: 0 };
    customerStats.set(order.customerId, {
      orders: current.orders + 1,
      spend: current.spend + order.totalAmount,
    });
  }

  const topCustomers = relevantCustomers
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      city: customer.city,
      orders: customerStats.get(customer.id)?.orders ?? 0,
      spend: round2(customerStats.get(customer.id)?.spend ?? 0),
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  const animalStats = new Map<string, { count: number; revenue: number }>();
  for (const order of validOrders) {
    for (const item of order.items) {
      const current = animalStats.get(item.animalType) ?? { count: 0, revenue: 0 };
      animalStats.set(item.animalType, {
        count: current.count + item.quantity,
        revenue: current.revenue + item.lineTotal,
      });
    }
  }

  return {
    revenue: round2(revenue),
    monthRevenue: round2(monthRevenue),
    todayRevenue: round2(todayOrders.reduce((sum, order) => sum + order.totalAmount, 0)),
    todayOrderCount: todayOrders.length,
    ordersCount: allOrders.length,
    activeOrders: allOrders.filter((order) =>
      ["new", "confirmed", "preparing", "cooking", "ready"].includes(order.status),
    ).length,
    customersCount: relevantCustomers.length,
    availableHeads: productsList
      .filter((product) => product.isActive)
      .reduce((sum, product) => sum + product.stock, 0),
    lowStock: productsList.filter((product) => product.isActive && product.stock <= 3).slice(0, 4),
    avgOrderValue: validOrders.length ? round2(revenue / validOrders.length) : 0,
    statusCounts,
    dailySeries,
    recentOrders: allOrders.slice(0, 6),
    needsAttentionOrders,
    topCustomers,
    animalMix: Array.from(animalStats.entries()).map(([type, value]) => ({
      type,
      count: value.count,
      revenue: round2(value.revenue),
    })),
  };
}