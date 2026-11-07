"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { useCart } from "@/components/store/cart-provider";
import { useToast } from "@/components/toast";
import { cn, formatMoney } from "@/lib/format";
import { getStoreProductPath, whatsappLink } from "@/lib/storefront";
import type { ProductDTO } from "@/lib/types";

export function AddToCartButton({
  product,
  label = "أضف للسلة",
  className,
  variant = "solid",
}: {
  product: ProductDTO;
  label?: string;
  className?: string;
  variant?: "solid" | "gold" | "outline";
}) {
  const { addItem, openCart } = useCart();
  const { toast } = useToast();
  const pathname = usePathname();
  const soldOut = product.stock === 0;
  const classNames = cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
    variant === "solid" && "bg-[var(--store-accent)] text-[var(--store-ink)] hover:brightness-95",
    variant === "gold" && "bg-[var(--store-accent)] text-[var(--store-ink)] hover:brightness-95",
    variant === "outline" && "bg-[var(--store-card)] text-[var(--store-primary)] ring-1 ring-[var(--store-line)] hover:bg-[var(--store-bg)]",
    className,
  );

  if (product.modifiers?.length) {
    return (
      <Link href={getStoreProductPath(pathname, product.id)} className={classNames}>
        <Icon name="settings" className="h-4 w-4" strokeWidth={2.6} />
        اختيار الخيارات
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => {
        addItem(product);
        toast("تمت إضافة المنتج إلى السلة");
        openCart();
      }}
      className={classNames}
    >
      <Icon name={soldOut ? "close" : "plus"} className="h-4 w-4" strokeWidth={2.6} />
      {soldOut ? "غير متوفر حالياً" : label}
    </button>
  );
}

export function BuyBar({ product }: { product: ProductDTO }) {
  const { addItem, openCart } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const soldOut = product.stock === 0;
  const selectedOptions = (product.modifiers ?? []).flatMap((modifier) => {
    const value = selectedValues[modifier.name];
    const option = modifier.options.find((item) => item.value === value);
    return option ? [{ modifierName: modifier.name, ...option }] : [];
  });
  const missingRequired = (product.modifiers ?? []).some((modifier) => modifier.required && !selectedValues[modifier.name]);
  const selectedPrice = product.price + selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);

  return (
    <div className="rounded-2xl border border-[var(--store-line)] bg-[var(--store-card)] p-4">
      {product.modifiers?.length ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {product.modifiers.map((modifier) => (
            <label key={modifier.id ?? modifier.name} className="space-y-1.5">
              <span className="block text-xs font-bold text-[var(--store-ink)]">
                {modifier.name}{modifier.required ? " *" : ""}
              </span>
              <select
                value={selectedValues[modifier.name] ?? ""}
                onChange={(event) => setSelectedValues((current) => ({ ...current, [modifier.name]: event.target.value }))}
                required={modifier.required}
                className="h-10 w-full rounded-xl border border-[var(--store-line)] bg-white px-3 text-xs font-semibold"
              >
                <option value="">اختر {modifier.name}</option>
                {modifier.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}{option.priceDelta ? ` (${option.priceDelta > 0 ? "+" : ""}${formatMoney(option.priceDelta)})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-[var(--store-faint)]">الإجمالي</p>
          <p className="text-xl font-semibold text-[var(--store-primary)]">{formatMoney(selectedPrice * quantity)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--store-surface)] text-sm font-bold text-[var(--store-ink)]"
            aria-label="تقليل"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(20, value + 1))}
            className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--store-primary)] text-sm font-bold text-white"
            aria-label="زيادة"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={soldOut || missingRequired}
          onClick={() => {
            addItem(product, quantity, selectedOptions);
            toast(`تمت إضافة ${quantity} × ${product.name} إلى السلة`);
            openCart();
          }}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--store-accent)] text-sm font-semibold text-[var(--store-ink)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="box" className="h-4 w-4" />
          {soldOut ? "غير متوفر" : missingRequired ? "اختر الخيارات المطلوبة" : "أضف للسلة"}
        </button>
        <a
          href={whatsappLink(
            `السلام عليكم، أبغى أطلب: ${product.name} — الكمية ${quantity} — الإجمالي ${formatMoney(selectedPrice * quantity)}`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--store-surface)] text-sm font-semibold text-[var(--store-primary)] transition hover:bg-[var(--store-line)]"
        >
          <Icon name="phone" className="h-4 w-4" />
          تواصل معنا عبر واتساب
        </a>
      </div>
    </div>
  );
}
