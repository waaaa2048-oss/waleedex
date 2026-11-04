import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge, EmptyState } from "@/components/ui";
import { getCustomers, getOrders, getProducts } from "@/lib/data";
import { PAYMENT_METHODS, animalMeta, formatMoney, formatNumber } from "@/lib/format";
import { requirePermission } from "@/lib/require-permission";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "التقارير | Waleedex" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; storeId?: string }>;
}) {
  await requirePermission("reports.read");

  const resolvedSearchParams = await searchParams;
  const fromDateStr = resolvedSearchParams.from;
  const toDateStr = resolvedSearchParams.to;
  const requestedStoreId = Number(resolvedSearchParams.storeId);
  const selectedStoreId = Number.isInteger(requestedStoreId) && requestedStoreId > 0 ? requestedStoreId : undefined;

  const [orders, customers, allProducts, storeRows] = await Promise.all([
    getOrders(selectedStoreId),
    getCustomers(),
    getProducts(),
    db.select({ id: stores.id, name: stores.name, storeType: stores.storeType }).from(stores).orderBy(asc(stores.name)),
  ]);
  const isSlaughterhouseStore = storeRows.find((store) => store.id === selectedStoreId)?.storeType === "SLAUGHTERHOUSE";
  const products = selectedStoreId ? allProducts.filter((product) => product.storeId === selectedStoreId) : allProducts;

  // فلترة الطلبات بناءً على التاريخ المختار (إن وجد) بالإضافة لاستثناء الطلبات الملغاة
  const validOrders = orders.filter((order) => {
    if (order.status === "cancelled") return false;
    if (!fromDateStr && !toDateStr) return true;

    const orderDate = new Date(order.createdAt);
    if (fromDateStr && orderDate < new Date(fromDateStr)) return false;
    if (toDateStr) {
      const endDate = new Date(toDateStr);
      endDate.setHours(23, 59, 59, 999);
      if (orderDate > endDate) return false;
    }
    return true;
  });

  const revenue = validOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const collected = validOrders.reduce((sum, order) => sum + Math.min(order.paidAmount, order.totalAmount), 0);
  const outstanding = Math.max(0, revenue - collected);

  const animalMap = new Map<string, { quantity: number; revenue: number }>();
  const productMap = new Map<string, { quantity: number; revenue: number; type: string }>();
  const serviceMap = new Map<string, { quantity: number; revenue: number }>();
  const paymentMap = new Map<string, number>();
  let deliveryCount = 0;
  let pickupCount = 0;

  for (const order of validOrders) {
    paymentMap.set(order.paymentMethod, (paymentMap.get(order.paymentMethod) ?? 0) + order.totalAmount);
    if (order.fulfillment === "delivery") deliveryCount += 1;
    else pickupCount += 1;

    for (const item of order.items) {
      const animal = animalMap.get(item.animalType) ?? { quantity: 0, revenue: 0 };
      animalMap.set(item.animalType, {
        quantity: animal.quantity + item.quantity,
        revenue: animal.revenue + item.lineTotal,
      });
      const product = productMap.get(item.name) ?? { quantity: 0, revenue: 0, type: item.animalType };
      productMap.set(item.name, {
        quantity: product.quantity + item.quantity,
        revenue: product.revenue + item.lineTotal,
        type: item.animalType,
      });
    }

    for (const service of order.services) {
      const entry = serviceMap.get(service.name) ?? { quantity: 0, revenue: 0 };
      serviceMap.set(service.name, {
        quantity: entry.quantity + service.quantity,
        revenue: entry.revenue + service.lineTotal,
      });
    }
  }

  const animals = Array.from(animalMap.entries())
    .map(([type, value]) => ({ type, ...value }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxAnimalRevenue = Math.max(...animals.map((animal) => animal.revenue), 1);

  const topProducts = Array.from(productMap.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topServices = Array.from(serviceMap.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const payments = Array.from(paymentMap.entries()).map(([method, value]) => ({
    method,
    label: PAYMENT_METHODS[method] ?? method,
    value,
  }));
  const paymentTotal = payments.reduce((sum, payment) => sum + payment.value, 0) || 1;

  const orderCustomerIds = new Set(validOrders.map((order) => order.customerId));
  const vips = customers.filter((customer) => customer.isVip && orderCustomerIds.has(customer.id));
  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.totalPrice, 0);

  return (
    <div className="space-y-5">
      {/* شريط فلترة التاريخ (من وإلى) */}
      <div className="card p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold text-ink-600 mb-1">المتجر:</label>
            <select
              name="storeId"
              defaultValue={selectedStoreId ?? ""}
              className="px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">كل متاجر المنصة</option>
              {storeRows.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-ink-600 mb-1">من تاريخ:</label>
            <input 
              type="date" 
              name="from" 
              defaultValue={fromDateStr || ""} 
              className="px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-ink-600 mb-1">إلى تاريخ:</label>
            <input 
              type="date" 
              name="to" 
              defaultValue={toDateStr || ""} 
              className="px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="submit" 
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm">
              بحث وتصفية
            </button>
            {(fromDateStr || toDateStr) && (
              <Link
                href="/dashboard/reports"
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-200 transition">
                إعادة ضبط
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* بطاقات الإحصائيات العلوية */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "إجمالي المبيعات", value: formatMoney(revenue), icon: "wallet" as const, tone: "bg-emerald-50 text-emerald-700" },
          { label: "المبالغ المحصلة", value: formatMoney(collected), icon: "check" as const, tone: "bg-sky-50 text-sky-700" },
          { label: "مبالغ معلقة", value: formatMoney(outstanding), icon: "clock" as const, tone: "bg-amber-50 text-amber-700" },
          { label: "قيمة المخزون", value: formatMoney(inventoryValue), icon: "box" as const, tone: "bg-brand-50 text-brand-700" },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-start justify-between gap-3 p-4">
            <div>
              <p className="text-[11px] font-semibold text-ink-400">{stat.label}</p>
              <p className="mt-1 text-lg font-extrabold text-ink-900">{stat.value}</p>
            </div>
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${stat.tone}`}>
              <Icon name={stat.icon} className="h-4 w-4" />
            </span>
          </div>
        ))}
      </div>

      {validOrders.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="reports"
            title="لا توجد بيانات كافية خلال الفترة المحددة"
            description="جرب اختيار نطاق تاريخ آخر أو تأكد من وجود طلبات في هذه الفترة."
          />
        </div>
      ) : (
        <>
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-ink-900">ملخص الفترة المحددة</h3>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {fromDateStr || toDateStr ? `من ${fromDateStr || 'البداية'} إلى ${toDateStr || 'الآن'}` : 'إجمالي كافة الطلبات المؤكدة'} 
                  {' — '}({formatNumber(validOrders.length)} طلب)
                </p>
              </div>
              <Badge tone="brand">
                <Icon name="reports" className="h-3 w-3" />
                متوسط الطلب {formatMoney(revenue / Math.max(validOrders.length, 1))}
              </Badge>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="text-sm font-bold text-ink-900">{isSlaughterhouseStore ? "المبيعات حسب نوع الذبيحة" : "ملخص التوصيل والاستلام"}</h3>
              <p className="mt-0.5 text-[11px] text-ink-400">{isSlaughterhouseStore ? "مقارنة أداء أنواع الذبائح في المبيعات" : "عدد الطلبات بحسب طريقة الاستلام"}</p>
              {isSlaughterhouseStore ? <ul className="mt-4 space-y-3">
                {animals.map((animal) => (
                  <li key={animal.type}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-bold text-ink-700">
                        {animalMeta(animal.type).emoji} {animal.type}
                        <span className="font-normal text-ink-400">({animal.quantity} رأس)</span>
                      </span>
                      <span className="font-extrabold text-ink-900">{formatMoney(animal.revenue)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600"
                        style={{ width: `${Math.max(5, (animal.revenue / maxAnimalRevenue) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul> : <div className="mt-4 rounded-xl bg-stone-50 px-3 py-4 text-center text-sm font-bold text-ink-700">
                {formatNumber(deliveryCount)} توصيل · {formatNumber(pickupCount)} استلام من الفرع
              </div>}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-stone-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-ink-400">طلبات توصيل</p>
                  <p className="mt-0.5 text-base font-extrabold text-ink-900">{deliveryCount}</p>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-ink-400">استلام من الفرع</p>
                  <p className="mt-0.5 text-base font-extrabold text-ink-900">{pickupCount}</p>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-bold text-ink-900">طرق الدفع</h3>
              <p className="mt-0.5 text-[11px] text-ink-400">توزيع الإيرادات حسب طريقة السداد</p>
              <div className="mt-4 space-y-2.5">
                {payments.map((payment) => (
                  <div key={payment.method}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-ink-700">{payment.label}</span>
                      <span className="text-ink-500">
                        {formatMoney(payment.value)}
                        <span className="ms-1 text-ink-300">({Math.round((payment.value / paymentTotal) * 100)}%)</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(4, (payment.value / paymentTotal) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-brand-50/70 px-3.5 py-3 ring-1 ring-brand-100">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-brand-900">
                  <Icon name="crown" className="h-3.5 w-3.5" />
                  {vips.length} عميل VIP
                </p>
                <p className="mt-1 text-[10px] leading-5 text-brand-800/70">
                  عملاء VIP يولّدون {formatMoney(vips.reduce((sum, customer) => sum + customer.totalSpend, 0))} من المبيعات.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-stone-100 px-5 py-4">
                <h3 className="text-sm font-bold text-ink-900">أفضل المنتجات مبيعاً</h3>
              </div>
              <ul className="divide-y divide-stone-100">
                {topProducts.map((product, index) => (
                  <li key={product.name} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-stone-100 text-[10px] font-extrabold text-ink-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink-800">
                        {isSlaughterhouseStore ? `${animalMeta(product.type).emoji} ` : ""}{product.name}
                      </p>
                      <p className="text-[10px] text-ink-400">{product.quantity} {isSlaughterhouseStore ? "رأس مباعة" : "وحدة مباعة"}</p>
                    </div>
                    <span className="text-xs font-extrabold text-ink-900">{formatMoney(product.revenue)}</span>
                  </li>
                ))}
                {topProducts.length === 0 ? (
                  <li className="px-5 py-6 text-center text-[11px] text-ink-400">لا توجد مبيعات منتجات في هذه الفترة.</li>
                ) : null}
              </ul>
            </div>

            {isSlaughterhouseStore ? (
              <div className="card overflow-hidden">
                <div className="border-b border-stone-100 px-5 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    <Icon name="fire" className="h-4 w-4 text-orange-500" />
                    الخدمات الأكثر طلباً
                  </h3>
                </div>
                <ul className="divide-y divide-stone-100">
                  {topServices.map((service, index) => (
                    <li key={service.name} className="flex items-center gap-3 px-5 py-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-50 text-[10px] font-extrabold text-orange-700">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink-800">{service.name}</p>
                        <p className="text-[10px] text-ink-400">{service.quantity} مرة</p>
                      </div>
                      <span className="text-xs font-extrabold text-ink-900">{formatMoney(service.revenue)}</span>
                    </li>
                  ))}
                  {topServices.length === 0 ? (
                    <li className="px-5 py-6 text-center text-[11px] text-ink-400">لم تُطلب خدمات إضافية في هذه الفترة.</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}