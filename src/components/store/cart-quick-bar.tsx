"use client";

import { Icon } from "@/components/icons";
import { useCart } from "@/components/store/cart-provider";
import { formatMoney } from "@/lib/format";

export function CartQuickBar({ lifted = false }: { lifted?: boolean }) {
  const { count, subtotal, isOpen, openCart } = useCart();

  if (count === 0 || isOpen) return null;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`مراجعة السلة، ${count} منتجات، الإجمالي ${formatMoney(subtotal)}`}
      className={`fixed inset-x-3 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl bg-[var(--store-primary)] px-4 py-3 text-start text-white shadow-[0_12px_32px_-10px_rgba(0,0,0,0.45)] md:hidden ${lifted ? "bottom-[calc(5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
          <Icon name="box" className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-extrabold">مراجعة السلة</span>
          <span className="mt-0.5 block text-[10px] text-white/75">{count} {count === 1 ? "منتج" : "منتجات"}</span>
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold">{formatMoney(subtotal)}</span>
    </button>
  );
}