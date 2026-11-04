"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { useCart } from "@/components/store/cart-provider";
import { useToast } from "@/components/toast";
import { KIND_META, cn, formatMoney, publicProductDescription } from "@/lib/format";
import { getStoreProductPath } from "@/lib/storefront";
import type { ProductDTO } from "@/lib/types";

export function ProductCard({ product, compact = false }: { product: ProductDTO; compact?: boolean }) {
  const { addItem, toggleFavorite, isFavorite, openCart, lastAdded } = useCart();
  const { toast } = useToast();
  const pathname = usePathname();
  const productPath = getStoreProductPath(pathname, product.id);
  const favorite = isFavorite(product.id);
  const kind = KIND_META[product.kind];
  const soldOut = product.stock === 0;

  return (
    <article className="store-product-card group relative flex flex-col overflow-hidden rounded-[1.4rem] border bg-white shadow-[0_10px_35px_-28px_rgba(40,28,16,.6)] transition duration-300 hover:-translate-y-1 hover:border-[var(--store-accent)] hover:shadow-[0_22px_48px_-30px_rgba(40,28,16,.55)]">
      <div className="store-product-image relative block overflow-hidden bg-[var(--store-surface)]">
        <Link href={productPath} aria-label={`عرض ${product.name}`} className="absolute inset-0">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={480}
              height={360}
              unoptimized
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-4xl">🍖</span>
          )}
        </Link>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <span className={cn("rounded-full bg-white/95 px-2 py-1 text-[9px] font-extrabold ring-1 ring-inset", kind.badge)}>
            {kind.label}
          </span>
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
            {product.isFeatured ? (
              <span className="product-card-discount rounded-full bg-[var(--store-accent)] px-2 py-1 text-[9px] font-extrabold text-[var(--store-ink)]">الأكثر مبيعاً</span>
            ) : null}
            <button
              type="button"
              aria-pressed={favorite}
              className={cn(
                "product-card-wish grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/95 shadow-sm ring-1 ring-[var(--store-line)] transition hover:scale-105",
                favorite ? "text-rose-600" : "text-[#a1958a]",
              )}
              onClick={() => {
                toggleFavorite(product.id);
                toast(favorite ? "أُزيل من المفضلة" : "أُضيف إلى المفضلة", favorite ? "info" : "success");
              }}
              aria-label={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            >
              <Icon name="star" className="h-4 w-4" strokeWidth={favorite ? 2.4 : 1.8} />
            </button>
          </div>
        </div>
        {soldOut ? (
          <div className="product-card-out-of-stock absolute inset-0 grid place-items-center bg-[var(--store-ink)]/55">
            <span className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-[var(--store-ink)]">نفد المخزون</span>
          </div>
        ) : null}
      </div>

      <Link href={productPath} className="product-card-quick-view absolute top-2 start-2 z-10 hidden h-8 items-center gap-1 rounded-full bg-white/95 px-2.5 text-[9px] font-bold text-[var(--store-primary)] shadow-sm ring-1 ring-[var(--store-line)]">
        <Icon name="search" className="h-3.5 w-3.5" /> عرض سريع
      </Link>

      <div className="product-card-info flex flex-1 flex-col p-3 sm:p-4">
        <span className="product-card-category text-[9px] font-extrabold text-[#98713a]">{product.category}</span>
        <Link href={productPath} className="product-card-title mt-1.5 line-clamp-2 min-h-10 text-[13px] font-extrabold leading-5 text-[var(--store-ink)] transition hover:text-[var(--store-primary)] sm:text-sm">
          {product.name}
        </Link>
        {!compact ? (
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#8a7f70]">{publicProductDescription(product.description)}</p>
        ) : null}

        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-base font-extrabold text-[var(--store-primary)]">{formatMoney(product.price)}</p>
              <p className="text-[9px] font-semibold text-[#a1958a]">
                {product.fixedPrice ? "سعر الوجبة كاملة" : `${formatMoney(product.pricePerKg)} / كجم`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (soldOut) {
                  toast("هذا المنتج غير متوفر حالياً", "error");
                  return;
                }
                if (product.modifiers?.length) {
                  window.location.assign(productPath);
                  return;
                }
                addItem(product);
                toast("تمت إضافة المنتج إلى السلة");
                openCart();
              }}
              className={cn(
                "product-card-add flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-extrabold transition",
                soldOut
                  ? "cursor-not-allowed bg-[var(--store-surface)] text-[#a1958a]"
                  : lastAdded === product.id
                    ? "bg-[var(--store-accent)] text-[var(--store-ink)]"
                    : "bg-[var(--store-accent)] text-[var(--store-ink)] hover:bg-[#c58f47]",
              )}
              disabled={soldOut}
            >
              <Icon name={lastAdded === product.id ? "check" : "plus"} className="h-3.5 w-3.5" strokeWidth={2.6} />
              {product.modifiers?.length ? "خيارات" : lastAdded === product.id ? "تمت" : "أضف"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
