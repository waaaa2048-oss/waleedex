import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { roleCan } from "@/lib/roles";
import { getDashboardData } from "@/lib/data";
import { getActivityLogs, getCoupons, getStoreSettings } from "@/lib/admin-data";
import { redirect } from "next/navigation";
import { WelcomeBanner } from "@/components/admin/welcome-banner";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";
import {
  ORDER_STATUSES,
  STATUS_META,
  animalMeta,
  formatMoney,
  formatNumber,
  relativeTime,
  statusMeta,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  new: "#f59e0b",
  confirmed: "#0ea5e9",
  preparing: "#8b5cf6",
  cooking: "#f97316",
  ready: "#10b981",
  delivered: "#14b8a6",
  cancelled: "#a8a29e",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  const user = await requireUser();
  if (
    roleCan(user.role, user.permissions, "orders.create") &&
    !roleCan(user.role, user.permissions, "orders.read")
  ) {
    redirect("/dashboard/orders/new");
  }

  const [{ storeId: storeIdParam }, storeRows] = await Promise.all([
    searchParams,
    db.select({ id: stores.id, name: stores.name, storeType: stores.storeType }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
  ]);
  const requestedStoreId = Number(storeIdParam);
  const selectedStore = storeRows.find((store) => store.id === requestedStoreId) ?? storeRows[0];
  if (!selectedStore) throw new Error("لا توجد متاجر لعرض لوحة التحكم");
  const isSlaughterhouseStore = selectedStore.storeType === "SLAUGHTERHOUSE";
  const storeQuery = `?storeId=${selectedStore.id}`;
  const [data, coupons, logs, settings] = await Promise.all([
    getDashboardData(selectedStore.id),
    getCoupons(),
    getActivityLogs(5),
    getStoreSettings(selectedStore.id),
  ]);
  const activeCoupons = coupons.filter((coupon) => coupon.isActive);

  const maxRevenue = Math.max(...data.dailySeries.map((day) => day.revenue), 1);
  const activeStatuses = ORDER_STATUSES.filter((status) => (data.statusCounts[status] ?? 0) > 0);
  const totalStatuses = activeStatuses.reduce((sum, status) => sum + (data.statusCounts[status] ?? 0), 0) || 1;
  const donut = activeStatuses.reduce<{ slices: { status: string; value: number; start: number; end: number }[]; cursor: number }>(
    (result, status) => {
      const value = data.statusCounts[status] ?? 0;
      const start = (result.cursor / totalStatuses) * 360;
      const cursor = result.cursor + value;
      return {
        slices: [...result.slices, { status, value, start, end: (cursor / totalStatuses) * 360 }],
        cursor,
      };
    },
    { slices: [], cursor: 0 },
  ).slices;
  const gradient =
    donut.length > 0
      ? `conic-gradient(${donut
          .map((slice) => `${STATUS_COLORS[slice.status]} ${slice.start}deg ${slice.end}deg`)
          .join(", ")})`
      : "#efeae2";

  const maxAnimal = Math.max(...data.animalMix.map((item) => item.revenue), 1);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const displayedOrders = data.needsAttentionOrders.length
    ? data.needsAttentionOrders.slice(0, 6)
    : data.recentOrders;

  return (
    <div className="space-y-5">
      <WelcomeBanner ownerName={user.name.split(" ").slice(0, 2).join(" ")} storeId={selectedStore.id} />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-5 text-white sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(207,120,48,0.45),transparent_50%)]" />
        <div className="grain absolute inset-0 opacity-20" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold text-brand-200">أهلاً بك مجدداً</p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">{user.name}</h2>
            <p className="mt-2 max-w-xl text-xs leading-6 text-white/60 sm:text-[13px]">
              في <span className="font-bold text-white">{selectedStore.name}</span> لديك{" "}
              <span className="font-bold text-white">{data.activeOrders}</span> طلب نشط، و
              <span className="font-bold text-white"> {formatNumber(data.availableHeads)}</span> وحدة متاحة في المخزون.
              مبيعات هذا الشهر {formatMoney(data.monthRevenue)}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/orders${storeQuery}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-ink-900 transition hover:bg-brand-50"
              >
                <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} />
                إضافة طلب
              </Link>
              <Link
                href={`/dashboard/products${storeQuery}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-4 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20"
              >
                <Icon name="products" className="h-4 w-4" />
                إدارة المنتجات
              </Link>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2.5 sm:w-auto sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[10px] font-semibold text-white/50">مبيعات اليوم</p>
              <p className="mt-0.5 text-lg font-extrabold">{formatMoney(data.todayRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[10px] font-semibold text-white/50">طلبات اليوم</p>
              <p className="mt-0.5 text-lg font-extrabold">{formatNumber(data.todayOrderCount)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[10px] font-semibold text-white/50">متوسط الطلب</p>
              <p className="mt-0.5 text-lg font-extrabold">{formatMoney(data.avgOrderValue)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Owner quick controls */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon name="sparkles" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xs font-bold text-ink-900">مركز التحكم السريع</h2>
              <p className="text-[10px] text-ink-400">أضف، عدّل، واحذف كل شيء من حسابك كمالك</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "الخلفية والألوان", href: `/dashboard/settings/store${storeQuery}`, icon: "sparkles" as const },
              { label: "إضافة منتج", href: `/dashboard/products${storeQuery}`, icon: "products" as const },
              { label: "كوبون خصم", href: `/dashboard/coupons${storeQuery}`, icon: "star" as const },
              { label: "إضافة موظف", href: `/dashboard/employees${storeQuery}`, icon: "customers" as const },
              { label: "كل الإعدادات", href: `/dashboard/settings${storeQuery}`, icon: "settings" as const },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-stone-100 px-3 text-[11px] font-bold text-ink-600 transition hover:bg-brand-50 hover:text-brand-800"
              >
                <Icon name={action.icon} className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-stone-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-ink-400">كوبونات مفعّلة</p>
            <p className="mt-0.5 text-sm font-extrabold text-ink-900">{activeCoupons.length}</p>
            <p className="text-[9px] text-ink-400">{activeCoupons.slice(0, 2).map((coupon) => coupon.code).join(" · ") || "لا توجد"}</p>
          </div>
          <div className="rounded-xl bg-stone-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-ink-400">خلفية المتجر</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-5 w-5 rounded ring-1 ring-stone-200" style={{ background: settings.backgroundColor }} />
              <span className="h-5 w-5 rounded ring-1 ring-stone-200" style={{ background: settings.primaryColor }} />
              <span className="h-5 w-5 rounded ring-1 ring-stone-200" style={{ background: settings.accentColor }} />
              <span className="text-[9px] font-bold text-ink-500">
                {settings.backgroundImageUrl ? "صورة مخصصة" : settings.backgroundPattern === "none" ? "لون" : "نقشة"}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-stone-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-ink-400">حالة المتجر</p>
            <p className={`mt-0.5 text-sm font-extrabold ${settings.maintenanceMode ? "text-amber-600" : "text-emerald-600"}`}>
              {settings.maintenanceMode ? "مغلق للصيانة" : "مفتوح للطلبات"}
            </p>
            <p className="text-[9px] text-ink-400">تحضير {settings.prepHours} ساعات</p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "طلبات نشطة", value: formatNumber(data.activeOrders), hint: `من ${data.ordersCount} طلب`, icon: "orders" as const, tint: "bg-brand-50 text-brand-700" },
          { label: "مبيعات الشهر", value: formatMoney(data.monthRevenue), hint: "من بداية الشهر", icon: "wallet" as const, tint: "bg-emerald-50 text-emerald-700" },
          { label: "وحدات المخزون", value: formatNumber(data.availableHeads), hint: `${data.lowStock.length} منتجات قاربت النفاد`, icon: "products" as const, tint: "bg-amber-50 text-amber-700" },
          { label: "العملاء", value: formatNumber(data.customersCount), hint: "عميل مسجل", icon: "customers" as const, tint: "bg-sky-50 text-sky-700" },
        ].map((kpi) => (
          <div key={kpi.label} className="card flex items-start justify-between gap-3 p-4">
            <div>
              <p className="text-[11px] font-semibold text-ink-400">{kpi.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-ink-900">{kpi.value}</p>
              <p className="mt-0.5 text-[10px] text-ink-400">{kpi.hint}</p>
            </div>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${kpi.tint}`}>
              <Icon name={kpi.icon} className="h-5 w-5" />
            </span>
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Weekly revenue */}
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-ink-900">مبيعات آخر ٧ أيام</h3>
              <p className="mt-0.5 text-[11px] text-ink-400">
                إجمالي {formatMoney(data.dailySeries.reduce((sum, day) => sum + day.revenue, 0))}
              </p>
            </div>
            <Badge tone="success">
              <Icon name="reports" className="h-3 w-3" />
              {data.dailySeries.reduce((sum, day) => sum + day.orders, 0)} طلب
            </Badge>
          </div>
          <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
            {data.dailySeries.map((day) => (
              <div key={day.date} className="group flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-ink-500 opacity-0 transition group-hover:opacity-100">
                  {formatMoney(day.revenue)}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-brand-200 via-brand-400 to-brand-500 transition-all duration-500 group-hover:from-brand-300 group-hover:to-brand-600"
                    style={{ height: `${Math.max(6, (day.revenue / maxRevenue) * 100)}%` }}
                    title={`${day.label}: ${formatMoney(day.revenue)}`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-ink-400">{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Status donut */}
        <section className="card p-5">
          <h3 className="text-sm font-bold text-ink-900">توزيع الطلبات</h3>
          <p className="mt-0.5 text-[11px] text-ink-400">{data.ordersCount} طلب مسجل</p>
          <div className="mt-5 flex items-center gap-5">
            <div className="relative h-32 w-32 shrink-0">
              <div className="h-full w-full rounded-full" style={{ background: gradient }} />
              <div className="absolute inset-[18%] grid place-items-center rounded-full bg-white shadow-inner">
                <div className="text-center">
                  <p className="text-xl font-extrabold text-ink-900">{data.ordersCount}</p>
                  <p className="text-[9px] font-semibold text-ink-400">إجمالي</p>
                </div>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2">
              {activeStatuses.slice(0, 5).map((status) => (
                <li key={status} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                  <span className="flex-1 truncate font-semibold text-ink-600">{STATUS_META[status].short}</span>
                  <span className="font-extrabold text-ink-900">{data.statusCounts[status] ?? 0}</span>
                </li>
              ))}
              {activeStatuses.length === 0 ? <li className="text-[11px] text-ink-400">لا توجد بيانات بعد.</li> : null}
            </ul>
          </div>
          {isSlaughterhouseStore ? (
            <div className="mt-5 rounded-xl bg-stone-50 px-3.5 py-2.5">
              <p className="text-[10px] font-bold text-ink-500">أنواع الذبائح الأكثر طلباً</p>
              <ul className="mt-2 space-y-1.5">
                {data.animalMix.slice(0, 3).map((animal) => (
                  <li key={animal.type} className="flex items-center gap-2 text-[10px]">
                    <span>{animalMeta(animal.type).emoji}</span>
                    <span className="w-12 shrink-0 font-semibold text-ink-600">{animal.type}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
                      <span
                        className="block h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.max(8, (animal.revenue / maxAnimal) * 100)}%` }}
                      />
                    </span>
                    <span className="font-bold text-ink-700">{animal.count}</span>
                  </li>
                ))}
                {data.animalMix.length === 0 ? <li className="text-[10px] text-ink-400">لا توجد بيانات.</li> : null}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent orders */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h3 className="text-sm font-bold text-ink-900">
              {data.needsAttentionOrders.length ? `طلبات تحتاج متابعة (${data.needsAttentionOrders.length})` : "أحدث الطلبات"}
            </h3>
            <Link             href={`/dashboard/orders${storeQuery}`} className="flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800">
              عرض الكل
              <Icon name="chevronLeft" className="h-3 w-3" />
            </Link>
          </div>
          {displayedOrders.length === 0 ? (
            <EmptyState
              icon="orders"
              title="لم يتم تسجيل طلبات بعد"
              description="ابدأ بإضافة أول طلب من صفحة الطلبات."
              action={
                <Link href="/dashboard/orders" className="text-xs font-bold text-brand-700">
                  إضافة طلب ←
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {displayedOrders.map((order) => {
                const meta = statusMeta(order.status);
                const firstItem = order.items[0];
                const overdue = Boolean(order.deliveryDate && order.deliveryDate < todayKey && !["delivered", "cancelled"].includes(order.status));
                return (
                  <li key={order.id}>
                    <Link
                      href={`/dashboard/orders/${order.id}${storeQuery}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-brand-50/40"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-sm text-ink-600">
                        {isSlaughterhouseStore ? animalMeta(firstItem?.animalType ?? "خروف").emoji : <Icon name="products" className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink-900">
                          {order.customerName} <span className="font-mono text-[10px] text-ink-300">· {order.code}</span>
                        </p>
                        <p className="truncate text-[10px] text-ink-400">
                          {firstItem?.name ?? "بدون بنود"} · {relativeTime(order.createdAt)}
                          {overdue ? " · موعد التسليم متأخر" : order.status === "new" ? " · بانتظار التأكيد" : ""}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-ink-900">{formatMoney(order.totalAmount)}</p>
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${meta.badge}`}>
                          {meta.short}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          {/* Low stock */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <Icon name="products" className="h-4 w-4 text-amber-600" />
                مخزون منخفض
              </h3>
              <Link href="/dashboard/products" className="text-[11px] font-bold text-brand-700">
                إدارة
              </Link>
            </div>
            {data.lowStock.length === 0 ? (
              <p className="px-5 py-6 text-center text-[11px] text-ink-400">كل الأصناف بمخزون جيد ✓</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {data.lowStock.map((product) => (
                  <li key={product.id} className="flex items-center gap-2.5 px-5 py-2.5">
                    <Icon name="products" className="h-4 w-4 text-ink-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-ink-800">{product.name}</p>
                      <p className="text-[10px] text-ink-400">{product.origin}</p>
                    </div>
                    <Badge tone={product.stock === 0 ? "danger" : "warning"}>
                      {product.stock === 0 ? "نفد" : `${product.stock} متبقي`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Top customers */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <Icon name="crown" className="h-4 w-4 text-brand-600" />
                أفضل العملاء
              </h3>
              <Link href="/dashboard/customers" className="text-[11px] font-bold text-brand-700">
                الكل
              </Link>
            </div>
            <ul className="divide-y divide-stone-100">
              {data.topCustomers.map((customer, index) => (
                <li key={customer.id} className="flex items-center gap-2.5 px-5 py-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-stone-100 text-[10px] font-extrabold text-ink-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-ink-800">{customer.name}</p>
                    <p className="text-[10px] text-ink-400">
                      {customer.city} · {customer.orders} طلب
                    </p>
                  </div>
                  <span className="text-[11px] font-extrabold text-ink-900">{formatMoney(customer.spend)}</span>
                </li>
              ))}
              {data.topCustomers.length === 0 ? (
                <li className="px-5 py-6 text-center text-[11px] text-ink-400">لا يوجد عملاء بعد.</li>
              ) : null}
            </ul>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <Icon name="clock" className="h-4 w-4 text-brand-600" />
                آخر العمليات
              </h3>
              <Link href="/dashboard/logs" className="text-[11px] font-bold text-brand-700">
                السجل
              </Link>
            </div>
            <ul className="divide-y divide-stone-100">
              {logs.map((log) => (
                <li key={log.id} className="px-5 py-2.5">
                  <p className="text-[11px] font-bold text-ink-800">{log.action}</p>
                  <p className="text-[10px] text-ink-400">
                    {log.actorName} · {relativeTime(log.createdAt)}
                  </p>
                </li>
              ))}
              {logs.length === 0 ? <li className="px-5 py-6 text-center text-[11px] text-ink-400">لا توجد عمليات بعد.</li> : null}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
