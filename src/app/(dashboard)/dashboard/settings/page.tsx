import Link from "next/link";
import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/icons";
import { SettingsSearch } from "@/components/admin/settings-search";
import { Badge } from "@/components/ui";
import { getCoupons, getStoreCategories, getStaff, getStoreSettings } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";

import { requirePermission } from "@/lib/require-permission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مركز التحكم | أهل الكرم" };

type Section = {
  title: string;
  items: { label: string; href?: string; icon: IconName; note?: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "الحساب",
    items: [
      { label: "الملف الشخصي", href: "/dashboard/settings/profile", icon: "customers" },
      { label: "كلمة المرور", href: "/dashboard/settings/profile", icon: "settings" },
      { label: "الموظفون والأدوار", href: "/dashboard/employees", icon: "customers" },
      { label: "الإشعارات", icon: "phone", note: "قريباً" },
    ],
  },
  {
    title: "عام",
    items: [
      { label: "إدارة المتاجر", href: "/dashboard/stores", icon: "box" },
      { label: "الرصيد والفواتير", icon: "wallet", note: "قريباً" },
      { label: "الدفع والبوابات", href: "/dashboard/settings/payments", icon: "wallet" },
      { label: "نطاق المتجر", href: "/dashboard/settings/domain", icon: "pin" },
      { label: "صفحة إتمام الطلب", href: "/dashboard/settings/store", icon: "orders" },
      { label: "الضرائب", href: "/dashboard/settings/payments", icon: "reports" },
      { label: "قنوات البيع", href: "/dashboard/settings/integrations", icon: "truck" },
    ],
  },
  {
    title: "الطلبات",
    items: [
      { label: "إدارة الطلبات", href: "/dashboard/orders", icon: "orders" },
      { label: "حالات الطلب", href: "/dashboard/orders", icon: "filter" },
      { label: "تحديث حالة مجموعة طلبات", href: "/dashboard/orders", icon: "check" },
      { label: "الحجوزات", href: "/dashboard/services", icon: "calendar" },
      { label: "الحقول المخصصة", icon: "edit", note: "قريباً" },
      { label: "خيارات الطلب", icon: "settings", note: "قريباً" },
      { label: "قوالب التصدير", icon: "reports", note: "قريباً" },
    ],
  },
  {
    title: "المنتجات والمخزون",
    items: [
      { label: "إدارة المنتجات", href: "/dashboard/products", icon: "products" },
      { label: "إضافة منتج جديد", href: "/dashboard/products", icon: "plus" },
      { label: "التصنيفات والخيارات", href: "/dashboard/categories", icon: "box" },
      { label: "إدارة المخزون", href: "/dashboard/products", icon: "box" },
      { label: "الخدمات والطبخ", href: "/dashboard/services", icon: "services" },
      { label: "جرد المخزون", icon: "reports", note: "قريباً" },
      { label: "الاستيراد والتصدير", icon: "filter", note: "قريباً" },
    ],
  },
  {
    title: "التسويق",
    items: [
      { label: "الكوبونات", href: "/dashboard/coupons", icon: "sparkles" },
      { label: "العروض الترويجية", href: "/dashboard/coupons", icon: "star" },
      { label: "برنامج الولاء", icon: "crown", note: "قريباً" },
      { label: "السلات المتروكة", icon: "clock", note: "قريباً" },
      { label: "أدوات التتبع", icon: "reports", note: "قريباً" },
      { label: "تحسين محركات البحث", href: "/dashboard/settings/integrations", icon: "search" },
      { label: "أدوات التتبع والتحليلات", href: "/dashboard/settings/integrations", icon: "reports" },
    ],
  },
  {
    title: "المتجر والواجهة",
    items: [
      { label: "إدارة المتاجر", href: "/dashboard/stores", icon: "box" },
      { label: "ابدأ البيع", href: "/", icon: "arrowLeft" },
      { label: "اسم المتجر والهوية", href: "/dashboard/settings/store", icon: "edit" },
      { label: "الثيمات وتصميم المتجر", href: "/dashboard/settings/store", icon: "sparkles" },
      { label: "إعدادات المتجر والخلفية", href: "/dashboard/settings/store", icon: "sparkles" },
      { label: "تصميم المتجر", href: "/dashboard/settings/store", icon: "edit" },
      { label: "الشريط العلوي والنصوص", href: "/dashboard/settings/store", icon: "edit" },
      { label: "صفحة إتمام الطلب", href: "/dashboard/settings/store", icon: "wallet" },
      { label: "نطاق المتجر (الدومين)", href: "/dashboard/settings/domain", icon: "pin" },
      { label: "التكاملات والمواقع المفيدة", href: "/dashboard/settings/integrations", icon: "search" },
      { label: "تطبيق الجوال (PWA)", href: "/dashboard/settings/domain", icon: "box" },
      { label: "قنوات البيع", href: "/dashboard/services", icon: "truck" },
    ],
  },
  {
    title: "العملاء والفريق",
    items: [
      { label: "إدارة العملاء", href: "/dashboard/customers", icon: "customers" },
      { label: "إدارة الموظفين", href: "/dashboard/employees", icon: "customers" },
      { label: "الأدوار الوظيفية", href: "/dashboard/employees", icon: "settings" },
      { label: "الملف الشخصي", href: "/dashboard/settings/profile", icon: "customers" },
      { label: "أهداف الموظفين", icon: "reports", note: "قريباً" },
    ],
  },
  {
    title: "الشحن والدفع",
    items: [
      { label: "إعدادات الشحن والتوصيل", href: "/dashboard/settings/store", icon: "truck" },
      { label: "الدفع والبوابات والضرائب", href: "/dashboard/settings/payments", icon: "wallet" },
      { label: "شركات الشحن", icon: "truck", note: "قريباً" },
      { label: "مواد التغليف", icon: "box", note: "قريباً" },
    ],
  },
  {
    title: "التقارير والسجلات",
    items: [
      { label: "أداء المتجر", href: "/dashboard/reports", icon: "reports" },
      { label: "التحليلات الذكية", href: "/dashboard", icon: "reports" },
      { label: "سجل العمليات", href: "/dashboard/logs", icon: "clock" },
      { label: "سجل المخزون", href: "/dashboard/logs", icon: "box" },
      { label: "سجل الطلبات المحذوفة", href: "/dashboard/logs", icon: "trash" },
      { label: "سجل الرسائل النصية", icon: "phone", note: "قريباً" },
    ],
  },
  {
    title: "الأدوات والدعم",
    items: [
      { label: "مركز الدعم", icon: "phone", note: "قريباً" },
      { label: "الأسئلة والتقييمات", icon: "star", note: "قريباً" },
      { label: "الشكاوى", icon: "edit", note: "قريباً" },
      { label: "متجر التطبيقات", icon: "box", note: "قريباً" },
    ],
  },
];

export default async function ControlCenterPage() {
  await requirePermission("settings.write");

  const [user, settings, categories, coupons, staff] = await Promise.all([
    requireUser(),
    getStoreSettings(),
    getStoreCategories(),
    getCoupons(),
    getStaff(),
  ]);

  const ownerEmail = user.email;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-5 text-white sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(207,120,48,0.4),transparent_50%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-brand-200">مركز تحكم المالك</p>
            <h2 className="mt-1 text-lg font-extrabold sm:text-xl">{user.name}</h2>
            <p className="mt-1.5 max-w-xl text-[11px] leading-6 text-white/60">
              كل إعدادات المتجر من مكان واحد: الخلفية والألوان، المنتجات، الأقسام، الكوبونات، الموظفون والسجلات.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/settings/store" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-[11px] font-bold text-ink-900">
              <Icon name="sparkles" className="h-4 w-4" />
              تغيير خلفية المتجر
            </Link>
            <Link href="/dashboard/settings/integrations" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-4 text-[11px] font-bold text-white ring-1 ring-white/15">
              <Icon name="search" className="h-4 w-4" />
              التكاملات
            </Link>
            <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-4 text-[11px] font-bold text-white ring-1 ring-white/15">
              عرض المتجر
              <Icon name="arrowLeft" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["المنتجات", categories.reduce((sum, category) => sum + category.productCount, 0)],
            ["الأقسام", categories.length],
            ["الكوبونات المفعّلة", coupons.filter((coupon) => coupon.isActive).length],
            ["فريق العمل", staff.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
              <p className="text-[9px] text-white/50">{label}</p>
              <p className="text-base font-extrabold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Icon name="sparkles" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-ink-900">هوية المتجر الحالية</p>
            <p className="text-[10px] text-ink-400">{settings.storeName} | {settings.tagline} · {settings.backgroundPattern === "none" ? "بدون نقشة" : settings.backgroundPattern}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[settings.backgroundColor, settings.primaryColor, settings.accentColor, settings.surfaceColor].map((color, index) => (
            <span key={`${color}-${index}`} className="h-7 w-7 rounded-lg ring-1 ring-stone-200" style={{ background: color }} />
          ))}
          <Link href="/dashboard/settings/store" className="ms-2 text-[11px] font-bold text-brand-700">
            تعديل ←
          </Link>
        </div>
      </div>

      <SettingsSearch sections={SECTIONS} />

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-extrabold text-brand-900">
            {user.name.slice(0, 2)}
          </span>
          <div>
            <p className="text-xs font-bold text-ink-900">حساب المالك — {user.name}</p>
            <p className="text-[10px] text-ink-400" dir="ltr">{ownerEmail}</p>
          </div>
          <Badge tone="brand">المالك</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/settings/profile"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 px-3 text-[11px] font-bold text-brand-800 ring-1 ring-brand-200"
          >
            تعديل الاسم والبريد وكلمة المرور
          </Link>
          <Link
            href="/dashboard/employees"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-900 px-3 text-[11px] font-bold text-white"
          >
            إدارة الموظفين
          </Link>
        </div>
      </section>
    </div>
  );
}
