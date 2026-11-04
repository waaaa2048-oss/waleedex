import type { Metadata } from "next";
import { StoreSettingsForm } from "@/components/admin/store-settings-form";
import { getStoreSettings } from "@/lib/admin-data";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}): Promise<Metadata> {
  const { storeId: storeIdParam } = await searchParams;
  const requestedId = Number(storeIdParam);
  const [store] = Number.isInteger(requestedId) && requestedId > 0
    ? await db.select({ name: stores.name }).from(stores).where(eq(stores.id, requestedId)).limit(1)
    : [];
  return { title: `إعدادات المتجر | ${store?.name ?? "Waleedex"}` };
}

export default async function StoreSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  await requirePermission("theme.write");
  const [{ storeId: storeIdParam }, storeRows] = await Promise.all([
    searchParams,
    db.select().from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
  ]);
  const requestedId = Number(storeIdParam);
  const selectedStore = storeRows.find((store) => store.id === requestedId)
    ?? storeRows[0];
  if (!selectedStore) throw new Error("لا توجد متاجر لإدارة إعداداتها");

  const settings = await getStoreSettings(selectedStore.id);
  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h1 className="text-sm font-extrabold text-ink-900">إعدادات المتجر</h1>
        <p className="mt-1 text-[10px] text-ink-400">إعدادات الهوية والتصميم والشحن مستقلة لكل متجر.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {storeRows.map((store) => (
            <Link
              key={store.id}
              href={`/dashboard/settings/store?storeId=${store.id}`}
              className={`rounded-xl px-3 py-2 text-[11px] font-bold ${store.id === selectedStore.id ? "bg-ink-900 text-white" : "bg-stone-100 text-ink-600"}`}
            >
              {store.name}
            </Link>
          ))}
        </div>
      </section>
      <StoreSettingsForm key={selectedStore.id} initial={settings} storeId={selectedStore.id} />
    </div>
  );
}
