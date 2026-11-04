import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { AppReleasesView } from "@/components/admin/app-releases-view";
import { db } from "@/db";
import { appReleases, type AppReleaseRow } from "@/db/schema";
import { getStoreSettings } from "@/lib/admin-data";
import { requirePermission } from "@/lib/require-permission";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إدارة التطبيقات | أهل الكرم" };

export default async function AppsPage({ searchParams }: { searchParams: Promise<{ storeId?: string }> }) {
  await requirePermission("settings.write");
  const [{ storeId: storeIdParam }, releases, storeRows] = await Promise.all([
    searchParams,
    db.select().from(appReleases).orderBy(desc(appReleases.createdAt), desc(appReleases.id)),
    db.select().from(stores).orderBy(asc(stores.name)),
  ]);
  const requestedId = Number(storeIdParam);
  const selectedStore = storeRows.find((store) => store.id === requestedId)
    ?? storeRows[0];
  if (!selectedStore) throw new Error("لا توجد متاجر لإدارة إعدادات التطبيق");
  const settings = await getStoreSettings(selectedStore.id);

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h1 className="text-sm font-extrabold text-ink-900">إعدادات تطبيق المتجر</h1>
        <p className="mt-1 text-[10px] text-ink-400">اختر المتجر لتخصيص صفحة تنزيل تطبيقه.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {storeRows.map((store) => (
            <Link key={store.id} href={`/dashboard/apps?storeId=${store.id}`} className={`rounded-xl px-3 py-2 text-[11px] font-bold ${store.id === selectedStore.id ? "bg-ink-900 text-white" : "bg-stone-100 text-ink-600"}`}>
              {store.name}
            </Link>
          ))}
        </div>
      </section>
      <AppReleasesView
        downloadSettings={settings.appDownloadSettings}
        storeName={settings.storeName}
        storeId={selectedStore.id}
        initial={releases.map((release: AppReleaseRow) => ({
          ...release,
          createdAt: release.createdAt.toISOString(),
          updatedAt: release.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
