"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/store/cart-provider";
import { BRAND } from "@/lib/storefront";
import { cn, formatMoney } from "@/lib/format";
import { TabbyPromo } from "@/components/store/tabby-promo";

export function CartDrawer({
  tabbyPromo,
}: {
  tabbyPromo: { publicKey: string; merchantCode: string } | null;
}) {
  const { isOpen, closeCart, lines, setQuantity, removeItem, subtotal, count, clear } = useCart();
  const pathname = usePathname();
  const firstPathSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  const rootRoutes = new Set(["products", "checkout", "customer", "account", "download", "orders", "wishlist"]);
  const storeSlug = lines[0]?.storeSlug ?? (rootRoutes.has(firstPathSegment) ? "" : firstPathSegment);
  const productsHref = `${storeSlug ? `/${storeSlug}` : ""}/products`;

  return (
    <div className={cn("fixed inset-0 z-[95]", isOpen ? "pointer-events-auto" : "pointer-events-none")}>
      <button
        type="button"
        aria-label="إغلاق السلة"
        onClick={closeCart}
        className={cn(
          "absolute inset-0 bg-[#21180f]/65 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        aria-label="سلة الطلبات"
        aria-modal="true"
        role="dialog"
        className={cn(
          "absolute inset-y-0 start-0 flex w-full max-w-md flex-col border-e border-[var(--store-line)] bg-[var(--store-bg)] shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-[var(--store-line)] bg-[var(--store-card)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--store-accent)]">متجر Waleedex</p>
            <h2 className="mt-1 text-lg font-black text-[var(--store-ink)]">سلة الطلبات</h2>
            <p className="mt-0.5 text-[11px] text-[#8a7f70]">{count} منتج · رسوم التوصيل تُحدد عند الإتمام</p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--store-bg)] text-[var(--store-ink)] ring-1 ring-[var(--store-line)] transition hover:bg-[var(--store-surface)]"
            aria-label="إغلاق"
          >
            <Icon name="close" className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--store-line)] bg-[var(--store-card)]/85 px-6 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--store-surface)] text-3xl">🛍️</span>
              <p className="mt-4 text-base font-black text-[var(--store-ink)]">سلتك بانتظار اختيارك</p>
              <p className="mt-2 max-w-[17rem] text-xs leading-6 text-[#8a7f70]">
                تصفح منتجات المتجر وأضف ما يناسبك إلى السلة.
              </p>
              <Link
                href={productsHref}
                onClick={closeCart}
                className="mt-5 inline-flex h-11 items-center rounded-xl bg-[var(--store-primary)] px-5 text-xs font-extrabold text-white transition hover:opacity-90"
              >
                تصفح المنتجات
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li key={line.key ?? line.id} className="flex gap-3 rounded-2xl border border-[var(--store-line)] bg-[var(--store-card)] p-3 shadow-[0_8px_24px_-22px_rgba(35,25,14,.4)]">
                  <div className="h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-xl bg-[var(--store-surface)]">
                    {line.imageUrl ? (
                      <Image src={line.imageUrl} alt={line.name} width={84} height={84} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-2xl">🍖</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-extrabold leading-5 text-[var(--store-ink)]">{line.name}</p>
                        <p className="mt-1 text-[10px] text-[#8a7f70]">{line.category}</p>
                        {line.selectedOptions?.length ? (
                          <p className="mt-1 text-[10px] leading-5 text-[#6b5e51]">
                            {line.selectedOptions.map((option) => `${option.modifierName}: ${option.label}`).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(line.key ?? line.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#a1958a] transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`إزالة ${line.name}`}
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 rounded-lg bg-[var(--store-bg)] p-1">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.key ?? line.id, line.quantity - 1)}
                          className="grid h-7 w-7 place-items-center rounded-md bg-[var(--store-card)] text-sm font-bold text-[var(--store-ink)] ring-1 ring-[var(--store-line)]"
                          aria-label="تقليل الكمية"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.key ?? line.id, line.quantity + 1)}
                          className="grid h-7 w-7 place-items-center rounded-md bg-[var(--store-primary)] text-sm font-bold text-white"
                          aria-label="زيادة الكمية"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-black text-[var(--store-primary)]">{formatMoney(line.price * line.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <footer className="border-t border-[var(--store-line)] bg-[var(--store-card)] px-5 py-5">
            <div className="flex items-center justify-between text-xs text-[#8a7f70]">
              <span>المجموع الفرعي</span>
              <span className="text-xl font-black text-[var(--store-ink)]">{formatMoney(subtotal)}</span>
            </div>
            {tabbyPromo ? <TabbyPromo {...tabbyPromo} price={subtotal} source="cart" /> : null}
            <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--store-surface)] px-3 py-2 text-[11px]">
              <span className="text-[#6b5e51]">رسوم التوصيل</span>
              <span className="font-extrabold text-[var(--store-primary)]">تُحدد عند الإتمام</span>
            </div>
            <Link
              href={lines[0]?.storeSlug ? `/${lines[0].storeSlug}/checkout` : "/checkout"}
              onClick={closeCart}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--store-primary)] text-sm font-extrabold text-white shadow-lg shadow-[var(--store-primary)]/15 transition hover:-translate-y-0.5 hover:opacity-95"
            >
              إتمام الطلب
              <Icon name="arrowLeft" className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={clear}
              className="mt-2 w-full rounded-xl py-2 text-[11px] font-semibold text-[#9a8f81] transition hover:text-rose-600"
            >
              إفراغ السلة
            </button>
            <p className="mt-2 text-center text-[10px] text-[#9a8f81]">
              تحتاج مساعدة؟ <a href={`tel:${BRAND.phone}`} className="font-bold text-[var(--store-primary)]" dir="ltr">{BRAND.phoneDisplay}</a>
            </p>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

export function FavoritesBar() {
  const { favorites, count, openCart } = useCart();
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/wishlist"
        className="relative hidden h-10 items-center gap-1.5 rounded-xl bg-[var(--store-card)] px-3 text-[11px] font-bold text-[var(--store-ink)] ring-1 ring-[var(--store-line)] transition hover:bg-[var(--store-bg)] sm:flex"
      >
        <span className="text-sm">♡</span>
        المفضلة
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--store-primary)] px-1 text-[10px] font-extrabold text-white">
          {favorites.length}
        </span>
      </Link>
      <button
        type="button"
        onClick={openCart}
        aria-label={`فتح السلة، ${count} منتجات`}
        className="relative flex h-10 items-center gap-2 rounded-xl bg-[var(--store-primary)] px-3 text-[11px] font-bold text-white transition hover:opacity-90 sm:px-4"
      >
        <Icon name="box" className="h-4 w-4" />
        <span className="hidden sm:inline">السلة</span>
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--store-accent)] px-1 text-[10px] font-extrabold text-[var(--store-ink)]">
          {count}
        </span>
      </button>
    </div>
  );
}
