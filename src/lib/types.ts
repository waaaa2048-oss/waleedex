import type { OrderStatus } from "./format";

export type ProductDTO = {
  id: number;
  storeId?: number;
  storeType?: string;
  sku?: string;
  modifiers?: ProductModifierDTO[];
  name: string;
  animalType: string;
  category: string;
  kind: "ready" | "custom" | "booking";
  description: string;
  weightKg: number;
  pricePerKg: number;
  fixedPrice: number | null;
  totalPrice: number;
  price: number;
  stock: number;
  imageUrl: string | null;
  origin: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
};

export type ProductModifierOption = {
  label: string;
  value: string;
  priceDelta: number;
};

export type ProductModifierDTO = {
  id?: number;
  name: string;
  type: string;
  required: boolean;
  options: ProductModifierOption[];
};

export type CustomerDTO = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  address: string | null;
  notes: string | null;
  isVip: boolean;
  createdAt: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
};

export type ServiceDTO = {
  id: number;
  name: string;
  type: string;
  description: string;
  price: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  usageCount: number;
};

export type OrderLineDTO = {
  id: number;
  productId: number | null;
  name: string;
  animalType: string;
  quantity: number;
  weightKg: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderServiceLineDTO = {
  id: number;
  serviceId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderDTO = {
  id: number;
  storeId: number;
  code: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  status: OrderStatus;
  fulfillment: "delivery" | "pickup";
  deliveryDate: string | null;
  deliveryAddress: string | null;
  deliveryFee: number;
  notes: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  hasPaymentReceipt?: boolean;
  createdAt: string;
  updatedAt: string;
  items: OrderLineDTO[];
  services: OrderServiceLineDTO[];
};

export type OrderInput = {
  customerId: number;
  status?: OrderStatus;
  fulfillment: "delivery" | "pickup";
  deliveryDate?: string | null;
  deliveryAddress?: string | null;
  deliveryFee?: number;
  notes?: string | null;
  paymentMethod?: string;
  paidAmount?: number;
  items: { productId: number; quantity: number }[];
  services: { serviceId: number; quantity: number }[];
};

export type ProductInput = {
  storeId: number;
  sku?: string;
  modifiers?: ProductModifierDTO[];
  name: string;
  animalType: string;
  category: string;
  kind: "ready" | "custom" | "booking";
  description: string;
  weightKg: number;
  pricePerKg: number;
  fixedPrice: number | null;
  stock: number;
  imageUrl?: string | null;
  origin: string;
  isActive: boolean;
  isFeatured: boolean;
};

export type CustomerInput = {
  name: string;
  phone: string;
  email?: string | null;
  city: string;
  address?: string | null;
  notes?: string | null;
  isVip: boolean;
};

export type ServiceInput = {
  name: string;
  type: string;
  description: string;
  price: number;
  unit: string;
  isActive: boolean;
};

export type DashboardData = {
  revenue: number;
  monthRevenue: number;
  todayRevenue: number;
  todayOrderCount: number;
  ordersCount: number;
  activeOrders: number;
  customersCount: number;
  availableHeads: number;
  lowStock: ProductDTO[];
  avgOrderValue: number;
  statusCounts: Record<string, number>;
  dailySeries: { label: string; date: string; orders: number; revenue: number }[];
  recentOrders: OrderDTO[];
  needsAttentionOrders: OrderDTO[];
  topCustomers: { id: number; name: string; city: string; orders: number; spend: number }[];
  animalMix: { type: string; count: number; revenue: number }[];
};
