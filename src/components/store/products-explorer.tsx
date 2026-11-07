"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { ProductCard } from "@/components/store/product-card";
import { useCart } from "@/components/store/cart-provider";
import { KIND_META, cn } from "@/lib/format";
import type { ProductDTO } from "@/lib/types";

export function ProductsExplorer({
  products,
  initialCategory = "الكل",
  initialQuery = "",
}: {
  products: ProductDTO[];
  initialCategory?: string;
  initialQuery?: string;
}) {
  const { favorites } = useCart();
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState("featured");
  const categories = useMemo(
    () => ["الكل", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean))), "العروض الأكثر مبيعاً"],
    [products],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = products.filter((product) => {
      if (onlyFavorites && !favorites.includes(product.id)) return false;
      if (kind !== "all" && product.kind !== kind) return false;
      if (category === "العروض الأكثر مبيعاً" && !product.isFeatured) return false;
      if (category !== "الكل" && category !== "العروض الأكثر مبيعاً" && product.category !== category) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    });

    if (sort === "priceAsc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "newest") list = [...list].sort((a, b) => b.id - a.id);
    else list = [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.id - a.id);

    return list;
  }, [products, category, query, kind, onlyFavorites, favorites, sort]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[var(--store-line)] bg-white p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[var(--store-faint)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن منتج..."
              className="h-10 w-full rounded-xl border border-[var(--store-line)] bg-[var(--store-bg)] pr-10 pl-4 text-xs outline-none focus:border-[var(--store-accent)]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className="h-10 rounded-xl border border-[var(--store-line)] bg-[var(--store-bg)] px-3 text-[12px] font-bold text-[var(--store-ink)] outline-none"
            >
              <option value="all">كل الأنواع</option>
              {Object.entries(KIND_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-10 rounded-xl border border-[var(--store-line)] bg-[var(--store-bg)] px-3 text-[12px] font-bold text-[var(--store-ink)] outline-none"
            >
              <option value="featured">الأكثر مبيعاً</option>
              <option value="newest">الأحدث</option>
              <option value="priceAsc">السعر: الأقل أولاً</option>
              <option value="priceDesc">السعر: الأعلى أولاً</option>
            </select>
            <button
              type="button"
              onClick={() => setOnlyFavorites((value) => !value)}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold transition",
                onlyFavorites
                  ? "bg-[var(--store-primary)] text-white"
                  : "bg-[var(--store-bg)] text-[var(--store-body)] ring-1 ring-[var(--store-line)] hover:bg-[var(--store-surface)]",
              )}
            >
              ♡ المفضلة ({favorites.length})
            </button>
          </div>
        </div>

        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto border-t border-[var(--store-line)] pt-3">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold transition",
                category === item
                  ? "bg-[var(--store-primary)]/10 text-[var(--store-primary)]"
                  : "text-[var(--store-muted)] hover:bg-[var(--store-bg)] hover:text-[var(--store-primary)]",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p className="px-1 text-[12px] font-semibold text-[var(--store-muted)]">{visible.length} منتج متاح</p>

      {visible.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-[var(--store-line)] bg-white px-6 py-14 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--store-surface)] text-3xl">🐐</span>
          <p className="mt-4 text-sm font-semibold text-[var(--store-ink)]">لا توجد منتجات مطابقة</p>
          <p className="mt-1 max-w-sm text-[12px] leading-6 text-[var(--store-muted)]">
            جرّب تغيير القسم أو كلمة البحث، أو تواصل معنا على واتساب لتجهيز طلب خاص.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory("الكل");
              setQuery("");
              setKind("all");
              setOnlyFavorites(false);
            }}
            className="mt-4 rounded-xl bg-[var(--store-primary)] px-4 py-2 text-xs font-bold text-white"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
