import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { BuyBar } from "@/components/store/add-to-cart";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getProductsByStore } from "@/lib/data";
import { formatMoney, publicProductDescription } from "@/lib/format";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StoreProductDetailPage({ params }: { params: Promise<{ store: string; id: string }> }) {
  const { store, id } = await params;
  await ensureSeeded();

  const [storeRow] = await db.select().from(stores).where(eq(stores.slug, store.toLowerCase())).limit(1);
  if (!storeRow) notFound();
  const productRow = (await getProductsByStore(storeRow.id)).find((item) => item.id === Number(id) && item.isActive);

  if (!productRow) {
    notFound();
  }
  const product = { ...productRow, storeType: storeRow.storeType };

  const paragraphs = publicProductDescription(product.description)
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <nav className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[var(--store-faint)]">
        <Link href={`/${storeRow.slug}`} className="hover:text-[var(--store-primary)]">الرئيسية</Link>
        <Icon name="chevronLeft" className="h-3 w-3" />
        <Link href={`/${storeRow.slug}/products`} className="hover:text-[var(--store-primary)]">المنتجات</Link>
        <Icon name="chevronLeft" className="h-3 w-3" />
        <span className="text-[var(--store-primary)]">{product.name}</span>
      </nav>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1.06fr_.94fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-[var(--store-surface)] shadow-[0_26px_70px_-42px_rgba(43,30,16,.65)]">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-[320px] w-full object-cover sm:h-[500px]" />
          ) : (
            <div className="grid h-[320px] w-full place-items-center bg-[var(--store-surface)] text-6xl sm:h-[500px]">🛍️</div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-semibold text-[var(--store-primary)]">{product.category}</p>
          <h1 className="mt-2 text-2xl font-bold leading-9 text-[var(--store-ink)] sm:text-3xl">{product.name}</h1>
          <div className="mt-4 rounded-3xl border border-[var(--store-line)] bg-white p-5 shadow-[0_12px_35px_-30px_rgba(43,30,16,.5)] sm:p-6">
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-[var(--store-primary)]">{formatMoney(product.price)}</p>
            </div>
          </div>
          <div className="mt-3"><BuyBar product={product} /></div>
          <div className="mt-4 rounded-2xl border border-[var(--store-line)] bg-white p-4">
            <h2 className="text-sm font-semibold text-[var(--store-ink)]">الوصف</h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-[12px] leading-6 text-[var(--store-body)]">{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
