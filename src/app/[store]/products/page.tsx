import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { ProductsExplorer } from "@/components/store/products-explorer";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getProductsByStore } from "@/lib/data";
import { getStoreCategories } from "@/lib/admin-data";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StoreProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { store } = await params;
  const { category, q } = await searchParams;
  await ensureSeeded();

  const [storeRow] = await db.select().from(stores).where(eq(stores.slug, store.toLowerCase())).limit(1);
  if (!storeRow) notFound();
  const [categoryRows, productRows] = await Promise.all([
    getStoreCategories(storeRow.id),
    getProductsByStore(storeRow.id),
  ]);
  const products = productRows.filter((product) => product.isActive).map((product) => ({ ...product, storeType: storeRow.storeType }));
  const initialCategory = categoryRows.find((categoryRow) => categoryRow.slug === category)?.name ?? category ?? "الكل";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[var(--store-primary)] px-5 py-7 text-white shadow-[0_24px_60px_-40px_rgba(37,27,17,.65)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -end-16 -top-24 h-64 w-64 rounded-full border-[28px] border-white/[.06]" />
        <nav className="relative flex items-center gap-2 text-[11px] font-bold text-white/65">
          <Link href={`/${storeRow.slug}`} className="transition hover:text-white">الرئيسية</Link>
          <Icon name="chevronLeft" className="h-3 w-3" />
          <span className="text-[var(--store-accent)]">كل المنتجات</span>
        </nav>
        <div className="relative mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold text-[var(--store-accent)]">{storeRow.name}</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">اختر ما يناسب متجرك</h1>
          </div>
        </div>
      </section>

      <div className="mt-5">
        <ProductsExplorer products={products} initialCategory={initialCategory} initialQuery={q ?? ""} />
      </div>
    </div>
  );
}
