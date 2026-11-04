import { notFound } from "next/navigation";
import { ThemeHomeSections } from "@/components/store/theme-home-sections";
import { ensureSeeded } from "@/db/seed";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { getStoreCategories, getStoreSettings } from "@/lib/admin-data";
import { getProductsByStore } from "@/lib/data";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StoreSlugPage({ params }: { params: Promise<{ store: string }> }) {
  const { store } = await params;
  await ensureSeeded();

  const [storeRow] = await db.select().from(stores).where(eq(stores.slug, store.toLowerCase())).limit(1);
  if (!storeRow) notFound();

  const [settings, categories, products] = await Promise.all([
    getStoreSettings(storeRow.id),
    getStoreCategories(storeRow.id),
    getProductsByStore(storeRow.id),
  ]);

  const brandedSettings = {
    ...settings,
    storeName: storeRow.name,
    logoUrl: storeRow.logoUrl ?? settings.logoUrl,
  } as typeof settings;

  return (
    <ThemeHomeSections
      sections={settings.homepageSections ?? []}
      settings={brandedSettings}
      categories={categories.filter((category) => category.isActive)}
      products={products.filter((product) => product.isActive).map((product) => ({ ...product, storeType: storeRow.storeType }))}
    />
  );
}
