"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductCard } from "@/components/store/product-card";
import { KIND_TABS } from "@/lib/storefront";
import { cn } from "@/lib/format";
import type { ProductDTO } from "@/lib/types";

export function ProductTabs({ products }: { products: ProductDTO[] }) {
  const [tab, setTab] = useState<ProductDTO["kind"]>("ready");
  const visible = products.filter((product) => product.kind === tab);

  return (
    <div className="rounded-3xl border border-[var(--store-line)] bg-[var(--store-bg)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {KIND_TABS.map((item) => {
            const count = products.filter((product) => product.kind === item.value).length;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-extrabold transition",
                  tab === item.value
                    ? "bg-[var(--store-primary)] text-white shadow-sm shadow-[var(--store-primary)]/30"
                    : "bg-white text-[#5d5245] ring-1 ring-[var(--store-line)] hover:bg-[var(--store-surface)]",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-extrabold",
                    tab === item.value ? "bg-white/20 text-white" : "bg-[var(--store-surface)] text-[#a3862f]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <Link href="/products" className="text-[11px] font-extrabold text-[var(--store-primary)] hover:text-[#a3862f]">
          عرض الكل ←
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 grid place-items-center rounded-2xl bg-white px-4 py-10 text-center ring-1 ring-[var(--store-line)]">
          <span className="text-3xl">🍽️</span>
          <p className="mt-3 text-sm font-extrabold text-[var(--store-ink)]">لا توجد منتجات في هذا القسم حالياً</p>
          <p className="mt-1 text-[11px] text-[#8a7f70]">تابعنا قريباً، نضيف عروض جديدة كل أسبوع.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visible.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      )}
    </div>
  );
}
