"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, ConfirmDialog, EmptyState, Modal, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { OrderForm, type OrderFormSubmit } from "@/components/orders/order-form";
import { useToast } from "@/components/toast";
import {
  FULFILLMENT_META,
  ORDER_STATUSES,
  STATUS_META,
  animalMeta,
  cn,
  formatDate,
  formatMoney,
  relativeTime,
  statusMeta,
  type OrderStatus,
} from "@/lib/format";
import type { CustomerDTO, OrderDTO, ProductDTO, ServiceDTO } from "@/lib/types";

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "الكل" },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: STATUS_META[status].short })),
];

export function OrdersView({
  initialOrders,
  customers,
  products,
  services,
  storeId,
  storeType,
  initiallyOpen = false,
  canCreate = true,
}: {
  initialOrders: OrderDTO[];
  customers: CustomerDTO[];
  products: ProductDTO[];
  services: ServiceDTO[];
  storeId: number;
  storeType: string;
  initiallyOpen?: boolean;
  canCreate?: boolean;
}) {
  const isSlaughterhouseStore = storeType === "SLAUGHTERHOUSE";
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderDTO[]>(initialOrders);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(initiallyOpen && canCreate);
  const [editing, setEditing] = useState<OrderDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<OrderDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pending, setPending] = useState<number[]>([]);

  useEffect(() => {
    if (initiallyOpen && canCreate) window.history.replaceState(null, "", `/dashboard/orders?storeId=${storeId}`);
  }, [initiallyOpen, canCreate, storeId]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    for (const status of ORDER_STATUSES) map[status] = orders.filter((order) => order.status === status).length;
    return map;
  }, [orders]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = filter === "all" || order.status === filter;
      if (!matchesStatus) return false;
      if (!term) return true;
      return (
        order.code.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerPhone.includes(term) ||
        order.items.some((item) => item.name.toLowerCase().includes(term))
      );
    });
  }, [orders, filter, search]);

  function replaceOrder(next: OrderDTO) {
    setOrders((current) => current.map((order) => (order.id === next.id ? next : order)));
  }

  async function handleCreate(values: OrderFormSubmit) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { order?: OrderDTO; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error ?? "تعذر إنشاء الطلب");
      setOrders((current) => [data.order as OrderDTO, ...current]);
      setFormOpen(false);
      toast(`تم إنشاء الطلب ${data.order.code} بنجاح`);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر إنشاء الطلب", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(values: OrderFormSubmit) {
    if (!editing) return;
    setSubmitting(true);
    const previous = orders;
    const optimistic: OrderDTO = {
      ...editing,
      status: values.status as OrderStatus,
      fulfillment: values.fulfillment,
      deliveryDate: values.deliveryDate,
      deliveryAddress: values.deliveryAddress,
      notes: values.notes,
      paymentMethod: values.paymentMethod,
      paidAmount: values.paidAmount,
      items: values.items.map((line, index) => {
        const product = products.find((entry) => entry.id === line.productId);
        const existing = editing.items[index];
        return {
          id: existing?.id ?? -index - 1,
          productId: line.productId,
          name: product?.name ?? existing?.name ?? "منتج",
          animalType: product?.animalType ?? existing?.animalType ?? "عام",
          quantity: line.quantity,
          weightKg: product?.weightKg ?? existing?.weightKg ?? 0,
          unitPrice: product?.price ?? existing?.unitPrice ?? 0,
          lineTotal: (product?.price ?? existing?.unitPrice ?? 0) * line.quantity,
        };
      }),
      services: values.services.map((line, index) => {
        const service = services.find((entry) => entry.id === line.serviceId);
        const existing = editing.services[index];
        return {
          id: existing?.id ?? -index - 1,
          serviceId: line.serviceId,
          name: service?.name ?? existing?.name ?? "خدمة",
          quantity: line.quantity,
          unitPrice: service?.price ?? existing?.unitPrice ?? 0,
          lineTotal: (service?.price ?? existing?.unitPrice ?? 0) * line.quantity,
        };
      }),
    };
    optimistic.totalAmount =
      optimistic.items.reduce((sum, item) => sum + item.lineTotal, 0) +
      optimistic.services.reduce((sum, item) => sum + item.lineTotal, 0);

    replaceOrder(optimistic);
    setEditing(null);

    try {
      const response = await fetch(`/api/orders/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { order?: OrderDTO; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error ?? "تعذر تحديث الطلب");
      replaceOrder(data.order);
      toast("تم حفظ تعديلات الطلب");
      router.refresh();
    } catch (error) {
      setOrders(previous);
      toast(error instanceof Error ? error.message : "تعذر تحديث الطلب", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(order: OrderDTO, status: OrderStatus) {
    const previous = orders;
    replaceOrder({ ...order, status });
    setPending((current) => [...current, order.id]);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { order?: OrderDTO; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error ?? "تعذر تحديث الحالة");
      replaceOrder(data.order);
      toast(`${order.code}: ${statusMeta(status).label}`);
      router.refresh();
    } catch (error) {
      setOrders(previous);
      toast(error instanceof Error ? error.message : "تعذر تحديث الحالة", "error");
    } finally {
      setPending((current) => current.filter((id) => id !== order.id));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const previous = orders;
    setOrders((current) => current.filter((order) => order.id !== deleting.id));
    try {
      const response = await fetch(`/api/orders/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "تعذر حذف الطلب");
      }
      toast(`تم حذف الطلب ${deleting.code}`);
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setOrders(previous);
      toast(error instanceof Error ? error.message : "تعذر حذف الطلب", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "جديدة", value: counts.new ?? 0, tone: "text-amber-600", bg: "bg-amber-50" },
          { label: "قيد التجهيز", value: counts.preparing ?? 0, tone: "text-violet-600", bg: "bg-violet-50" },
          { label: "على النار", value: counts.cooking ?? 0, tone: "text-orange-600", bg: "bg-orange-50" },
          { label: "جاهزة", value: counts.ready ?? 0, tone: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold text-ink-400">{stat.label}</p>
              <p className="mt-0.5 text-xl font-extrabold text-ink-900">{stat.value}</p>
            </div>
            <span className={cn("grid h-9 w-9 place-items-center rounded-xl", stat.bg, stat.tone)}>
              <Icon name="orders" className="h-4 w-4" />
            </span>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition",
                  filter === item.value
                    ? "bg-ink-900 text-white shadow-sm"
                    : "bg-stone-100/70 text-ink-500 hover:bg-stone-100",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                    filter === item.value ? "bg-white/20 text-white" : "bg-white text-ink-500",
                  )}
                >
                  {counts[item.value] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Icon name="search" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث برقم الطلب أو العميل..."
                className="input h-10 pr-9 text-xs"
              />
            </div>
            {canCreate ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                icon="plus"
              >
                طلب جديد
              </Button>
            ) : null}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="orders"
            title={orders.length === 0 ? "لا توجد طلبات بعد" : "لا توجد نتائج مطابقة"}
            description={
              orders.length === 0
                ? isSlaughterhouseStore
                  ? "ابدأ بإضافة أول طلب ذبيحة مع خيارات الطبخ والعشاء ليظهر هنا."
                  : "ابدأ بإضافة أول طلب لتظهر الطلبات هنا."
                : "جرّب تغيير حالة الطلب في الفلتر أو كلمة البحث."
            }
            action={canCreate ? (
              <Button
                icon="plus"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                إنشاء طلب جديد
              </Button>
            ) : undefined}
          />
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden grid-cols-[1.1fr_1.4fr_1fr_0.9fr_0.9fr_auto] items-center gap-3 border-b border-stone-100 bg-stone-50/60 px-4 py-2.5 text-[10px] font-bold text-ink-400 lg:grid">
              <span>الطلب</span>
              <span>{isSlaughterhouseStore ? "العميل والذبائح" : "العميل والمنتجات"}</span>
              <span>الموعد</span>
              <span>الإجمالي</span>
              <span>الحالة</span>
              <span className="text-center">إجراءات</span>
            </div>
            <ul className="divide-y divide-stone-100">
              {visible.map((order) => {
                const meta = statusMeta(order.status);
                const isPending = pending.includes(order.id);
                const firstItem = order.items[0];
                return (
                  <li
                    key={order.id}
                    className={cn(
                      "group grid gap-3 px-4 py-3.5 transition hover:bg-brand-50/30 lg:grid-cols-[1.1fr_1.4fr_1fr_0.9fr_0.9fr_auto] lg:items-center",
                      isPending && "opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                      <div>
                        <Link href={`/dashboard/orders/${order.id}`} className="text-sm font-extrabold text-ink-900 hover:text-brand-700">
                          {order.code}
                        </Link>
                        <p className="text-[10px] text-ink-400">{relativeTime(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-[11px] font-bold text-ink-600">
                        {order.customerName.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-ink-800">{order.customerName}</p>
                        <p className="truncate text-[10px] text-ink-400">
                          {firstItem ? `${isSlaughterhouseStore ? `${animalMeta(firstItem.animalType).emoji} ` : ""}${firstItem.name}` : isSlaughterhouseStore ? "بدون ذبائح" : "بدون منتجات"}
                          {order.items.length > 1 ? ` +${order.items.length - 1}` : ""}
                          {order.services.length > 0 ? ` · ${order.services.length} خدمة` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-ink-500">
                      <span className="font-semibold text-ink-700">{formatDate(order.deliveryDate)}</span>
                      <p className="text-[10px] text-ink-400">{FULFILLMENT_META[order.fulfillment].label}</p>
                    </div>

                    <div className="text-xs">
                      <p className="font-extrabold text-ink-900">{formatMoney(order.totalAmount)}</p>
                      {order.deliveryFee > 0 ? <p className="text-[10px] text-ink-400">الشحن {formatMoney(order.deliveryFee)}</p> : null}
                      <p className={cn("text-[10px]", order.paidAmount >= order.totalAmount ? "text-emerald-600" : "text-amber-600")}>
                        {order.paidAmount >= order.totalAmount ? "مدفوع" : `متبقي ${formatMoney(order.totalAmount - order.paidAmount)}`}
                      </p>
                    </div>

                    <div>
                      <Select
                        value={order.status}
                        onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}
                        className="h-8 !py-0 text-[11px] font-bold"
                        disabled={isPending}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusMeta(status).label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex items-center gap-1 lg:justify-center">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-stone-100 hover:text-ink-800"
                        aria-label="عرض"
                        title="عرض التفاصيل"
                      >
                        <Icon name="arrowLeft" className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditing(order)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                        aria-label="تعديل"
                        title="تعديل"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(order)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label="حذف"
                        title="حذف"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={isSlaughterhouseStore ? "طلب ذبيحة جديد" : "طلب جديد"}
        description={isSlaughterhouseStore ? "اختر العميل، أضف الذبائح وخدمات الطبخ والعشاء، وحدد الموعد." : "اختر العميل وأضف المنتجات المطلوبة."}
        size="lg"
      >
        <OrderForm
          customers={customers}
          products={products}
          services={services}
          isSlaughterhouseStore={isSlaughterhouseStore}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`تعديل الطلب ${editing?.code ?? ""}`}
        description={isSlaughterhouseStore ? "أي تغيير في الذبائح أو الخدمات يعيد حساب إجمالي الطلب تلقائياً." : "أي تغيير في المنتجات يعيد حساب إجمالي الطلب تلقائياً."}
        size="lg"
      >
        {editing ? (
          <OrderForm
            customers={customers}
            products={products}
            services={services}
            isSlaughterhouseStore={isSlaughterhouseStore}
            initial={editing}
            submitting={submitting}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`حذف الطلب ${deleting?.code ?? ""}؟`}
        description={isSlaughterhouseStore ? "سيتم حذف الطلب وكل بنود الذبائح والخدمات المرتبطة به." : "سيتم حذف الطلب وكل المنتجات المرتبطة به."}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
