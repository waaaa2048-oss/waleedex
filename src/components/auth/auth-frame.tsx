import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { FEAST_IMAGE, HERO_IMAGE } from "@/lib/media";

export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-cream">
      <div className="relative hidden w-[46%] shrink-0 overflow-hidden bg-ink-900 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMAGE} alt="ذبائح وطبخ" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/60 to-ink-900/20" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Icon name="fire" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-extrabold">ذبيحتي</span>
              <span className="block text-[10px] font-semibold tracking-wide text-brand-200">لحوم · ذبايح · طبخ وعشاء</span>
            </span>
          </Link>

          <div>
            <p className="max-w-sm text-2xl leading-[1.5] font-extrabold">
              «كل ذبيحة تُحضّر بعناية، وكل عزيمة لها طعم يذكره الضيوف.»
            </p>
            <div className="mt-7 flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FEAST_IMAGE} alt="مندي" className="h-20 w-28 rounded-2xl border-2 border-white/20 object-cover" />
              <div className="flex flex-col justify-center rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <span className="text-xl font-extrabold">+٣٫٢ ألف</span>
                <span className="text-[11px] text-white/70">ذبيحة سُلّمت هذا العام</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/50">إدارة الطلبات · الطبخ والعشاء · التوصيل المبرد</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <Icon name="fire" className="h-5 w-5" />
              </span>
              <span className="text-lg font-extrabold text-ink-900">ذبيحتي</span>
            </Link>
            <Link href="/" className="text-xs font-bold text-brand-700">
              الرئيسية
            </Link>
          </div>

          <div className="animate-rise">
            <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-ink-400">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-6 text-center text-sm text-ink-400">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
