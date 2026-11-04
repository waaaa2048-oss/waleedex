"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/icons";

const STORAGE_KEY = "ahlalkaram.dashboard.welcome.v1";
const CHANGE_EVENT = "welcome-banner-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getVisibleSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "closed";
  } catch {
    return true;
  }
}

const STEPS: { title: string; text: string; href: string; icon: IconName }[] = [
  { title: "عدّل هوية متجرك", text: "الخلفية والألوان والنصوص", href: "/dashboard/settings/store", icon: "sparkles" },
  { title: "أضف منتجاتك", text: "منتجات وأسعار ومخزون", href: "/dashboard/products", icon: "products" },
  { title: "أضف موظفيك", text: "حساب لكل فرد من الفريق", href: "/dashboard/employees", icon: "customers" },
  { title: "اربط دومينك", text: "موقع + تطبيق على جوالك", href: "/dashboard/settings/domain", icon: "pin" },
];

export function WelcomeBanner({ ownerName, storeId }: { ownerName: string; storeId: number }) {
  const visible = useSyncExternalStore(subscribe, getVisibleSnapshot, () => true);
  const withStore = (href: string) => `${href}${href.includes("?") ? "&" : "?"}storeId=${storeId}`;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "closed");
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  if (!visible) return null;

  return (
    <section className="animate-rise relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-l from-brand-50 via-white to-brand-50/40 p-5">
      <div className="pointer-events-none absolute -top-10 -start-10 h-32 w-32 rounded-full bg-brand-200/40 blur-2xl" />
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 end-3 grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-white hover:text-ink-700"
        aria-label="إغلاق الترحيب"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>

      <div className="relative flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-900/20">
          <Icon name="crown" className="h-5 w-5" />
        </span>
        <div className="min-w-0 pe-8">
          <h2 className="text-base font-extrabold text-ink-900">أهلاً بك في لوحة التحكم، {ownerName} 👋</h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-6 text-ink-500">
            هذه لوحة صاحب المتجر: من هنا تعدّل كل شيء — الخلفية والألوان، المنتجات، الأقسام، الكوبونات،
            الموظفين، الدومين والتكاملات. ابدأ بالخطوات الأربع التالية ثم أغلق هذه الرسالة.
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={withStore(step.href)}
            className="group flex items-center gap-2.5 rounded-2xl bg-white p-3 ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:ring-brand-300"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon name={step.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-extrabold text-ink-900">
                {index + 1}. {step.title}
              </span>
              <span className="block truncate text-[9px] text-ink-400">{step.text}</span>
            </span>
            <Icon name="chevronLeft" className="h-3 w-3 shrink-0 text-ink-300 transition group-hover:text-brand-600" />
          </Link>
        ))}
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={withStore("/dashboard/settings")}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-900 px-3.5 text-[11px] font-bold text-white transition hover:bg-ink-800"
        >
          <Icon name="settings" className="h-3.5 w-3.5" />
          مركز التحكم الكامل
        </Link>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[11px] font-bold text-ink-700 ring-1 ring-stone-200 transition hover:bg-stone-50"
        >
          <Icon name="box" className="h-3.5 w-3.5" />
          عرض المتجر
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-9 items-center rounded-xl px-3 text-[11px] font-semibold text-ink-400 transition hover:text-ink-700"
        >
          تم، أخفِ الرسالة
        </button>
      </div>
    </section>
  );
}
