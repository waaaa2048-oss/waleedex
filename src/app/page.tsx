import Link from "next/link";
import { Icon } from "@/components/icons";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STORE_TYPE_LABELS: Record<string, string> = {
  SLAUGHTERHOUSE: "ذبائح ولحوم",
  CLOTHING: "ملابس وأحذية",
  GROCERY: "مواد غذائية",
  FROZEN: "منتجات مجمدة",
};

export default async function StoreDirectoryPage() {
  await ensureSeeded();
  const publishedStores = await db
    .select({
      name: stores.name,
      slug: stores.slug,
      storeType: stores.storeType,
      logoUrl: stores.logoUrl,
    })
    .from(stores)
    .where(eq(stores.status, "PUBLISHED"))
    .orderBy(asc(stores.createdAt), asc(stores.id));

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-10 sm:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-800">WALEEDEx</p>
        <h1 className="mt-3 text-3xl font-black text-gray-900 sm:text-4xl">متاجرنا</h1>
        <p className="mt-3 text-sm leading-7 text-gray-600">اختر متجرك وتصفح المنتجات المتاحة.</p>
      </header>

      {publishedStores.length > 0 ? (
        <section aria-label="المتاجر المنشورة" className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishedStores.map((store) => (
            <Link
              key={store.slug}
              href={`/${store.slug}`}
              className="group flex min-h-40 items-center gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gray-50 text-emerald-800">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logoUrl} alt="" className="h-full w-full object-contain p-2" />
                ) : (
                  <Icon name="box" className="h-8 w-8" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-extrabold text-gray-900">{store.name}</span>
                <span className="mt-1 block text-xs font-semibold text-gray-500">
                  {STORE_TYPE_LABELS[store.storeType] ?? "تسوق الآن"}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800">
                  دخول المتجر <Icon name="arrowLeft" className="h-3.5 w-3.5 transition group-hover:-translate-x-1" />
                </span>
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <Icon name="box" className="mx-auto h-8 w-8 text-emerald-800" />
          <h2 className="mt-3 text-base font-extrabold text-gray-900">لا توجد متاجر متاحة حالياً</h2>
          <p className="mt-1 text-xs text-gray-500">ستظهر هنا المتاجر المنشورة عند توفرها.</p>
        </div>
      )}
    </main>
  );
}
