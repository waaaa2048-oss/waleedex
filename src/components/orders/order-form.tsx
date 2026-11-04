"use client";

import { useMemo, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ORDER_STATUSES, PAYMENT_METHODS, animalMeta, cn, formatMoney, formatWeight, statusMeta, todayISO } from "@/lib/format";
import type { OrderCustomerOption } from "@/lib/data";
import type { OrderDTO, ProductDTO, ServiceDTO } from "@/lib/types";

type Selection = Record<number, number>;

export type OrderFormSubmit = {
  customerId: number;
  status: string;
  fulfillment: "delivery" | "pickup";
  deliveryDate: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  paymentMethod: string;
  paidAmount: number;
  items: { productId: number; quantity: number }[];
  services: { serviceId: number; quantity: number }[];
};

export function OrderForm({
  customers,
  products,
  services,
  isSlaughterhouseStore = true,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  customers: OrderCustomerOption[];
  products: ProductDTO[];
  services: ServiceDTO[];
  isSlaughterhouseStore?: boolean;
  initial?: OrderDTO | null;
  submitting: boolean;
  onSubmit: (values: OrderFormSubmit) => void;
  onCancel: () => void;
}) {
  const initialItems = useMemo<Selection>(() => {
    const map: Selection = {};
    for (const item of initial?.items ?? []) {
      if (item.productId) map[item.productId] = item.quantity;
    }
    return map;
  }, [initial]);

  const initialServices = useMemo<Selection>(() => {
    const map: Selection = {};
    for (const service of initial?.services ?? []) {
      if (service.serviceId) map[service.serviceId] = service.quantity;
    }
    return map;
  }, [initial]);

  const [customerId, setCustomerId] = useState<number>(initial?.customerId ?? customers[0]?.id ?? 0);
  const [status, setStatus] = useState(initial?.status ?? "new");
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">(initial?.fulfillment ?? "delivery");
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? todayISO());
  const [deliveryAddress, setDeliveryAddress] = useState(initial?.deliveryAddress ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? "cash");
  const [paidAmount, setPaidAmount] = useState(String(initial?.paidAmount ?? 0));
  const [items, setItems] = useState<Selection>(initialItems);
  const [serviceLines, setServiceLines] = useState<Selection>(initialServices);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"products" | "services">("products");

  const activeProducts = products.filter((product) => product.isActive);
  const activeServices = services.filter((service) => service.isActive);

  function step(map: Selection, setMap: (next: Selection) => void, id: number, delta: number) {
    const next = { ...map };
    const current = next[id] ?? 0;
    const value = current + delta;
    if (value <= 0) delete next[id];
    else next[id] = Math.min(value, 50);
    setMap(next);
  }

  const productsTotal = Object.entries(items).reduce((sum, [id, quantity]) => {
    const product = products.find((entry) => entry.id === Number(id));
    return sum + (product ? product.price * quantity : 0);
  }, 0);

  const servicesTotal = Object.entries(serviceLines).reduce((sum, [id, quantity]) => {
    const service = services.find((entry) => entry.id === Number(id));
    return sum + (service ? service.price * quantity : 0);
  }, 0);

  const itemsCount = Object.values(items).reduce((sum, quantity) => sum + quantity, 0);
  const total = productsTotal + servicesTotal;
  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  function submit() {
    if (!customerId) {
      setError("اختر العميل أولاً");
      return;
    }
    if (itemsCount === 0) {
      setError("أضف منتجاً واحداً على الأقل");
      return;
    }
    setError(null);
    onSubmit({
      customerId,
      status,
      fulfillment,
      deliveryDate: deliveryDate || null,
      deliveryAddress: deliveryAddress.trim() || null,
      notes: notes.trim() || null,
      paymentMethod,
      paidAmount: Math.min(Number(paidAmount) || 0, total),
      items: Object.entries(items).map(([id, quantity]) => ({ productId: Number(id), quantity })),
      services: Object.entries(serviceLines).map(([id, quantity]) => ({ serviceId: Number(id), quantity })),
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="العميل" required>
          <Select value={customerId} onChange={(event) => setCustomerId(Number(event.target.value))}>
            <option value={0} disabled>
              اختر العميل
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} — {customer.phone}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="حالة الطلب">
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusMeta(value).label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {selectedCustomer ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 px-3.5 py-2.5 text-[11px] font-semibold text-ink-500 ring-1 ring-stone-200/70">
          <Icon name="phone" className="h-3.5 w-3.5 text-brand-600" />
          <span dir="ltr">{selectedCustomer.phone}</span>
          <span className="text-stone-300">|</span>
          <Icon name="pin" className="h-3.5 w-3.5 text-brand-600" />
          {selectedCustomer.city}
          {selectedCustomer.isVip ? <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800">VIP</span> : null}
        </div>
      ) : null}

      {/* Items picker */}
      <div className="rounded-2xl border border-stone-200">
        <div className="flex items-center gap-1 border-b border-stone-100 p-2">
          <button
            type="button"
            onClick={() => setTab("products")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition",
              tab === "products" ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200" : "text-ink-400 hover:bg-stone-50",
            )}
          >
            <Icon name="products" className="h-4 w-4" />
            المنتجات ({itemsCount})
          </button>
          {isSlaughterhouseStore ? <button
            type="button"
            onClick={() => setTab("services")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition",
              tab === "services" ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200" : "text-ink-400 hover:bg-stone-50",
            )}
          >
            <Icon name="services" className="h-4 w-4" />
            الطبخ والخدمات ({Object.keys(serviceLines).length})
          </button> : null}
        </div>

        <div className="max-h-72 overflow-y-auto p-2.5">
          {tab === "products" ? (
            activeProducts.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-ink-400">لا توجد منتجات متاحة حالياً.</p>
            ) : (
              <ul className="space-y-1.5">
                {activeProducts.map((product) => {
                  const quantity = items[product.id] ?? 0;
                  const meta = animalMeta(product.animalType);
                  return (
                    <li
                      key={product.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-2.5 py-2 ring-1 transition",
                        quantity > 0 ? "bg-brand-50/60 ring-brand-200" : "ring-transparent hover:bg-stone-50",
                      )}
                    >
                      <span className={cn("grid h-9 w-9 place-items-center rounded-lg text-base", isSlaughterhouseStore ? meta.chip : "bg-stone-100")}>{isSlaughterhouseStore ? meta.emoji : "📦"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink-800">{product.name}</p>
                        <p className="text-[10px] text-ink-400">
                          {isSlaughterhouseStore ? `${formatWeight(product.weightKg)} · ${formatMoney(product.pricePerKg)}/كجم` : "سعر المنتج"}
                          {product.stock <= 3 ? <span className="text-amber-600"> · متبقي {product.stock}</span> : null}
                        </p>
                      </div>
                      <span className="hidden text-[11px] font-bold text-ink-600 sm:block">{formatMoney(product.price)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => step(items, setItems, product.id, -1)}
                          disabled={quantity === 0}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-white text-ink-600 ring-1 ring-stone-200 transition hover:bg-stone-100 disabled:opacity-40"
                          aria-label="تقليل"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-ink-800">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => step(items, setItems, product.id, 1)}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-ink-900 text-white transition hover:bg-ink-800"
                          aria-label="زيادة"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : activeServices.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-ink-400">لا توجد خدمات متاحة.</p>
          ) : (
            <ul className="space-y-1.5">
              {activeServices.map((service) => {
                const quantity = serviceLines[service.id] ?? 0;
                return (
                  <li
                    key={service.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-2.5 py-2 ring-1 transition",
                      quantity > 0 ? "bg-brand-50/60 ring-brand-200" : "ring-transparent hover:bg-stone-50",
                    )}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-stone-100 text-sm">
                      {service.type === "عشاء" ? "🍽️" : service.type === "توصيل" ? "🚚" : service.type === "تقطيع" ? "🔪" : "🔥"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink-800">{service.name}</p>
                      <p className="text-[10px] text-ink-400">
                        {formatMoney(service.price)} · {service.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => step(serviceLines, setServiceLines, service.id, -1)}
                        disabled={quantity === 0}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-white text-ink-600 ring-1 ring-stone-200 transition hover:bg-stone-100 disabled:opacity-40"
                        aria-label="تقليل"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-ink-800">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => step(serviceLines, setServiceLines, service.id, 1)}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-ink-900 text-white transition hover:bg-ink-800"
                        aria-label="زيادة"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 bg-stone-50/70 px-3.5 py-2.5 text-[11px] font-semibold text-ink-500">
          <span>المنتجات: {formatMoney(productsTotal)}</span>
          {isSlaughterhouseStore ? <span>الخدمات: {formatMoney(servicesTotal)}</span> : null}
          <span className="text-sm font-extrabold text-ink-900">الإجمالي: {formatMoney(total)}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="طريقة الاستلام">
          <div className="grid grid-cols-2 gap-2">
            {(["delivery", "pickup"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFulfillment(option)}
                className={cn(
                  "flex h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold ring-1 transition",
                  fulfillment === option
                    ? "bg-brand-50 text-brand-800 ring-brand-300"
                    : "bg-white text-ink-500 ring-stone-200 hover:bg-stone-50",
                )}
              >
                <Icon name={option === "delivery" ? "truck" : "pin"} className="h-4 w-4" />
                {option === "delivery" ? "توصيل" : "استلام"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="موعد التسليم">
          <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} dir="ltr" />
        </Field>
      </div>

      {fulfillment === "delivery" ? (
        <Field label="عنوان التوصيل">
          <Input
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            placeholder="الحي، الشارع، رقم المبنى"
          />
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="طريقة الدفع">
          <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="المبلغ المدفوع" hint={`الإجمالي ${formatMoney(total)}`}>
          <Input
            type="number"
            min={0}
            value={paidAmount}
            onChange={(event) => setPaidAmount(event.target.value)}
            dir="ltr"
          />
        </Field>
      </div>

      <Field label="ملاحظات الطلب">
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="مثال: الطبخ مندي، التوصيل بعد العصر، تقطيع ٤ أجزاء..."
        />
      </Field>

      {error ? (
        <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
        <div className="text-sm">
          <span className="text-ink-400">الإجمالي المتوقع:</span>{" "}
          <span className="font-extrabold text-ink-900">{formatMoney(total)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} type="button">
            إلغاء
          </Button>
          <Button size="sm" onClick={submit} loading={submitting} icon="check">
            {initial ? "حفظ التعديلات" : "إنشاء الطلب"}
          </Button>
        </div>
      </div>
    </div>
  );
}
