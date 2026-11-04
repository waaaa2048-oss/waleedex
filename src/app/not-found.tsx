import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-5">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/20">
          <Icon name="fire" className="h-7 w-7" />
        </span>
        <p className="mt-6 text-5xl font-extrabold text-ink-900">٤٠٤</p>
        <h1 className="mt-2 text-xl font-extrabold text-ink-900">هذه الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          ربما تم نقل الطلب أو حذفه. عد إلى لوحة التحكم لمتابعة الذبائح والطلبات.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-5 text-sm font-bold text-white transition hover:bg-ink-800"
          >
            لوحة التحكم
            <Icon name="arrowLeft" className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-ink-700 ring-1 ring-stone-200 transition hover:bg-stone-50"
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
