import Link from "next/link";
import { Icon } from "@/components/icons";
import { ProductsExplorer } from "@/components/store/products-explorer";
import { ensureSeeded } from "@/db/seed";
import { getProductsByStore } from "@/lib/data";
import { getDefaultStoreId, getStoreSettings } from "@/lib/admin-data";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  await ensureSeeded();
  const { category, q } = await searchParams;
  const storeId = await getDefaultStoreId();
  const [store, settings, storeProducts] = await Promise.all([
    db.select({ id: stores.id, name: stores.name, slug: stores.slug }).from(stores).where(eq(stores.id, storeId)).limit(1).then(([row]) => row),
    getStoreSettings(storeId),
    getProductsByStore(storeId),
  ]);
  if (!store) throw new Error(`Default store ${storeId} is unavailable`);
  const products = storeProducts.filter((product) => product.isActive);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[var(--store-primary)] px-5 py-7 text-white shadow-[0_24px_60px_-40px_rgba(37,27,17,.65)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -end-16 -top-24 h-64 w-64 rounded-full border-[28px] border-white/[.06]" />
        <nav className="relative flex items-center gap-2 text-[10px] font-bold text-white/65">
          <Link href={`/${store.slug}`} className="transition hover:text-white">الرئيسية</Link>
          <Icon name="chevronLeft" className="h-3 w-3" />
          <span className="text-[var(--store-accent)]">كل المنتجات</span>
        </nav>
        <div className="relative mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-[var(--store-accent)]">{store.name}</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">اكتشف منتجات المتجر</h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/75">
              تصفح منتجات {settings.storeName} واختر ما يناسبك.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-[10px] font-bold text-white backdrop-blur">
            <Icon name="truck" className="h-4 w-4 text-[var(--store-accent)]" />
            توصيل فوري أو مجدول داخل الرياض
          </div>
        </div>
      </section>

      <div className="mt-5">
        <ProductsExplorer
          products={products}
          initialCategory={category ?? "الكل"}
          initialQuery={q ?? ""}
        />
      </div>
    </div>
  );
}
