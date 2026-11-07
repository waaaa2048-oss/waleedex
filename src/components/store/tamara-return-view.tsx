"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useCart } from "@/components/store/cart-provider";
import { formatMoney } from "@/lib/format";

export function TamaraReturnView({
  paid,
  status,
  error,
  orderCode,
  totalAmount,
  result,
}: {
  paid: boolean;
  status: string | null;
  error: string | null;
  orderCode: string;
  totalAmount: number;
  result?: string;
}) {
  const { clear } = useCart();
  useEffect(() => {
    if (paid) clear();
  }, [clear, paid]);

  const pendingMessage = status === "approved" || status === "authorised" || status === "authorized"
    ? "وافقت تمارا على الطلب، وهو بانتظار تأكيد التحصيل. ستظهر حالة الدفع بعد اكتمال التحصيل."
    : "لم نتلقَّ تأكيد التحصيل الكامل بعد. لا يُعتبر الطلب مدفوعاً حتى يتم التحقق من تمارا.";

  return (
    <section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center px-4 py-12">
      <div className="w-full rounded-[2rem] border border-[var(--store-line)] bg-[var(--store-card)] p-7 text-center shadow-sm sm:p-10">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl ${paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
          {paid ? "✓" : <Icon name="wallet" className="h-7 w-7" />}
        </span>
        <h1 className="mt-5 text-2xl font-bold text-[var(--store-ink)]">
          {paid ? "تم تأكيد الدفع والطلب" : result === "cancel" ? "لم يكتمل الدفع" : "الطلب بانتظار تأكيد الدفع"}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#756858]">
          {error ?? (paid
            ? "تحقّق المتجر من اكتمال تحصيل تمارا. سيبدأ فريق المتجر تجهيز طلبك."
            : pendingMessage)}
        </p>
        <div className="mx-auto mt-5 w-fit rounded-xl bg-[var(--store-surface)] px-5 py-3 text-sm font-bold text-[var(--store-primary)]">
          رقم الطلب: <span dir="ltr" className="font-mono">{orderCode}</span>
          <span className="mx-2">·</span>
          {formatMoney(totalAmount)}
        </div>
        <Link href="/products" className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--store-primary)] px-5 text-sm font-semibold text-white">
          متابعة التسوق <Icon name="arrowLeft" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
