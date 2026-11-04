"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { ToastProvider } from "@/components/toast";
import { cn } from "@/lib/format";
import { roleCan } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: IconName; badge?: string; permission?: string; storeType?: string };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "الرئيسية",
    items: [
      { href: "/dashboard", label: "لوحة المتجر", icon: "dashboard" },
      { href: "/dashboard/orders", label: "الطلبات", icon: "orders", permission: "orders.read" },
      { href: "/dashboard/orders/new", label: "إنشاء طلب", icon: "orders", permission: "orders.create" },
      { href: "/dashboard/products", label: "المنتجات", icon: "products", permission: "products.read" },
      { href: "/dashboard/categories", label: "التصنيفات", icon: "box", permission: "products.read" },
    ],
  },
  {
    title: "الإدارة",
    items: [
      { href: "/dashboard/customers", label: "العملاء", icon: "customers", permission: "customers.read" },
      { href: "/dashboard/stores", label: "إدارة المتاجر", icon: "box", permission: "settings.write" },
      { href: "/dashboard/services", label: "الطبخ والعشاء", icon: "services", permission: "products.read", storeType: "SLAUGHTERHOUSE" },
      { href: "/dashboard/coupons", label: "الكوبونات والعروض", icon: "sparkles", permission: "coupons.write" },
      { href: "/dashboard/employees", label: "الموظفون", icon: "customers", permission: "employees.write" },
      { href: "/dashboard/reports", label: "التقارير", icon: "reports", permission: "reports.read" },
      { href: "/dashboard/shipping/carriers", label: "شركات الشحن", icon: "truck", permission: "shipping.read" },
      { href: "/dashboard/shipping/shipments", label: "أرشيف البوليصات", icon: "orders", permission: "shipping.read" },
    ],
  },
  {
    title: "المتجر والنظام",
    items: [
      { href: "/dashboard/settings/store", label: "الثيم وإعدادات المتجر", icon: "settings", permission: "theme.write" },
      { href: "/dashboard/settings/payments", label: "الدفع والبوابات", icon: "wallet", permission: "settings.write" },
      { href: "/dashboard/settings/domain", label: "الدومين والتطبيق", icon: "pin", permission: "settings.write" },
      { href: "/dashboard/apps", label: "إدارة التطبيقات والإصدارات", icon: "box", permission: "settings.write" },
      { href: "/dashboard/settings/integrations", label: "التكاملات والمواقع", icon: "search", permission: "integrations.write" },
      { href: "/dashboard/logs", label: "سجل العمليات", icon: "clock", permission: "reports.read" },
      { href: "/dashboard/settings", label: "مركز الإعدادات", icon: "sparkles", permission: "settings.write" },
      { href: "/dashboard/settings/profile", label: "الملف الشخصي", icon: "customers" },
    ],
  },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "لوحة المتجر", subtitle: "ملخص المبيعات والطلبات والمنتجات والعملاء" },
  "/dashboard/categories": { title: "التصنيفات", subtitle: "أقسام المتجر التي تظهر في الواجهة" },
  "/dashboard/coupons": { title: "الكوبونات والعروض", subtitle: "أكواد الخصم والحملات الترويجية" },
  "/dashboard/employees": { title: "الموظفون", subtitle: "فريق العمل والصلاحيات" },
  "/dashboard/logs": { title: "سجل العمليات", subtitle: "كل ما حدث في المتجر ومن قام به" },
  "/dashboard/settings/domain": { title: "الدومين والتطبيق", subtitle: "اربط دومينك وثبّت التطبيق على الجوال" },
  "/dashboard/apps": { title: "إدارة التطبيقات والإصدارات", subtitle: "مسودات إصدارات Android وiOS وWindows ومعاينة المتجر" },
  "/dashboard/settings/integrations": { title: "التكاملات والمواقع", subtitle: "قوقل، سوشيال ميديا، الدفع، التحليلات والدومين" },
  "/dashboard/settings/store": { title: "إعدادات المتجر", subtitle: "الخلفية والألوان والنصوص والتوصيل" },
  "/dashboard/settings/payments": { title: "الدفع والبوابات", subtitle: "إدارة ظهور طرق الدفع وربط مفاتيح ميسر وتابي وتمارا" },
  "/dashboard/settings/profile": { title: "الملف الشخصي", subtitle: "بياناتك وكلمة المرور" },
  "/dashboard/orders": { title: "الطلبات", subtitle: "تابع الطلبات من الاستلام حتى التسليم" },
  "/dashboard/orders/new": { title: "إنشاء طلب", subtitle: "اختر العميل والمنتجات المطلوبة" },
  "/dashboard/products": { title: "إدارة المنتجات", subtitle: "المنتجات والأسعار والمخزون والتصنيفات" },
  "/dashboard/customers": { title: "العملاء", subtitle: "قاعدة عملائك وتاريخ طلباتهم وقيمتها" },
  "/dashboard/stores": { title: "إدارة المتاجر", subtitle: "متاجرك وروابطها وحسابات الإدارة" },
  "/dashboard/shipping/carriers": { title: "شركات الشحن", subtitle: "إعداد الناقلين وربط بيانات الحساب بشكل آمن" },
  "/dashboard/shipping/shipments": { title: "أرشيف البوليصات", subtitle: "سجل الشحنات وحالاتها وأرقام التتبع" },
  "/dashboard/services": { title: "الخدمات", subtitle: "إدارة خدمات متجرك وأسعارها وباقاتها" },
  "/dashboard/reports": { title: "التقارير", subtitle: "أداء المبيعات والمنتجات الأكثر طلباً" },
  "/dashboard/settings": { title: "الإعدادات", subtitle: "بيانات حسابك وكلمة المرور" },
};

export function DashboardShell({
  user,
  stores,
  children,
}: {
  user: { name: string; email: string; role: string; permissions?: string[] };
  stores: Array<{ id: number; name: string; storeType: string }>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const requestedStoreId = searchParams.get("storeId");
  const selectedStoreId = requestedStoreId && stores.some((store) => String(store.id) === requestedStoreId)
    ? requestedStoreId
    : String(stores[0]?.id ?? "");
  const selectedStore = stores.find((store) => String(store.id) === selectedStoreId);
  const isSlaughterhouseStore = selectedStore?.storeType === "SLAUGHTERHOUSE";

  const meta =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/dashboard/orders/")
      ? { title: "تفاصيل الطلب", subtitle: "بيانات العميل والمنتجات والدفع" }
      : PAGE_TITLES["/dashboard"]);
  const pageMeta =
    pathname === "/dashboard/reports" && !isSlaughterhouseStore
      ? { title: "التقارير", subtitle: "أداء المبيعات والمنتجات الأكثر طلباً" }
      : meta;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  function withSelectedStore(href: string) {
    if (!selectedStoreId || !href.startsWith("/dashboard")) return href;
    const [path, query] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("storeId", selectedStoreId);
    return `${path}?${params.toString()}`;
  }

  function selectStore(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("storeId", storeId);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 text-white">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/40">
            <Icon name="box" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-extrabold leading-tight">Waleedex</span>
            <span className="block text-[10px] font-semibold text-white/40">إدارة المتاجر</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 lg:hidden"
          aria-label="إغلاق القائمة"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-4 mb-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500/20 text-brand-300">
            <Icon name="pin" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{selectedStore?.name ?? "المتاجر"}</p>
            <p className="text-[10px] text-white/40">إدارة المنتجات والطلبات والعملاء</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) =>
              (!item.permission || roleCan(user.role, user.permissions ?? [], item.permission)) &&
              (!item.storeType || item.storeType === selectedStore?.storeType),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-bold tracking-wider text-white/30">{group.title}</p>
            <ul className="space-y-1">
              {visibleItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={withSelectedStore(item.href)}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition",
                        active
                          ? "bg-gradient-to-l from-brand-500/25 to-brand-500/5 text-white ring-1 ring-brand-400/30"
                          : "text-white/55 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-lg transition",
                          active ? "bg-brand-500 text-white shadow-md shadow-brand-900/40" : "bg-white/5 text-white/60 group-hover:text-white",
                        )}
                      >
                        <Icon name={item.icon} className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                      {active ? <span className="h-1.5 w-1.5 rounded-full bg-brand-300" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            </div>
          );
        })}

        {isSlaughterhouseStore ? (
          <div className="mt-2 rounded-2xl bg-gradient-to-br from-brand-600/25 to-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-brand-200">
              <Icon name="sparkles" className="h-4 w-4" />
              <p className="text-[11px] font-bold">الخدمات والتكاملات</p>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-white/50">
              أدر خدمات متجرك، اربط قنوات البيع والدفع، ووسّع نشاطك وقتما تريد.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Link
                href={withSelectedStore("/dashboard/services")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/20"
              >
                إدارة الباقات
                <Icon name="chevronLeft" className="h-3 w-3" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-brand-400"
              >
                عرض المتجر
              </Link>
            </div>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-extrabold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{user.name}</p>
            <p className="truncate text-[10px] text-white/40">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 transition hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50"
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-cream">
        <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 lg:block xl:w-72">{sidebar}</aside>

        {open ? (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <button
              type="button"
              aria-label="إغلاق"
              className="animate-fade absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="animate-rise absolute inset-y-0 start-0 w-72 shadow-2xl">{sidebar}</div>
          </div>
        ) : null}

        <div className="flex min-h-screen w-full flex-1 flex-col lg:ps-64 xl:ps-72">
          <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-cream/85 backdrop-blur-lg">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-ink-600 ring-1 ring-stone-200 lg:hidden"
                aria-label="فتح القائمة"
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-extrabold text-ink-900 sm:text-lg">{pageMeta.title}</h1>
                <p className="hidden truncate text-[11px] text-ink-400 sm:block">{pageMeta.subtitle}</p>
              </div>

              <div className="flex items-center gap-2">
                {stores.length > 1 ? (
                  <select
                    aria-label="اختر المتجر لإدارته"
                    value={selectedStoreId}
                    onChange={(event) => selectStore(event.target.value)}
                    className="h-10 max-w-36 rounded-xl border border-stone-200 bg-white px-2 text-[11px] font-bold text-ink-700 sm:max-w-52 sm:px-3"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                ) : null}
                <span className="hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-ink-500 ring-1 ring-stone-200 md:flex">
                  <Icon name="calendar" className="h-4 w-4 text-brand-600" />
                  {new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long" }).format(
                    new Date(),
                  )}
                </span>
                {roleCan(user.role, user.permissions ?? [], "orders.create") ? (
                  <Link
                    href={withSelectedStore("/dashboard/orders/new")}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-3 text-[13px] font-bold text-white shadow-sm shadow-brand-900/20 transition hover:from-brand-500 hover:to-brand-700 sm:px-4"
                  >
                    <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} />
                    <span className="hidden sm:inline">طلب جديد</span>
                  </Link>
                ) : null}
                <Link
                  href="/dashboard/settings/profile"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-xs font-extrabold text-white"
                  aria-label="الإعدادات"
                  title={user.name}
                >
                  {initials}
                </Link>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7">{children}</main>

          <footer className="border-t border-stone-200/60 px-6 py-4 text-center text-[11px] text-ink-300">
            Waleedex · المنتجات والطلبات والعملاء
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
