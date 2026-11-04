import type { Metadata } from "next";
import { PaymentsSettingsView } from "@/components/admin/payments-settings-view";
import { getStoreSettings } from "@/lib/admin-data";
import { getPaymentCredentialStatus } from "@/lib/payment-credentials";
import { getGlobalPaymentMethods } from "@/lib/payment-methods";
import { requirePermission } from "@/lib/require-permission";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الدفع والبوابات | أهل الكرم" };

export default async function PaymentsSettingsPage({ searchParams }: { searchParams: Promise<{ storeId?: string }> }) {
  await requirePermission("settings.write");
  const [{ storeId: storeIdParam }, storeRows, credentialStatus, methods] = await Promise.all([
    searchParams,
    db.select().from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
    getPaymentCredentialStatus(),
    getGlobalPaymentMethods(),
  ]);
  const requestedId = Number(storeIdParam);
  const selectedStore = storeRows.find((store) => store.id === requestedId)
    ?? storeRows[0];
  if (!selectedStore) throw new Error("لا توجد متاجر لإدارة إعدادات الدفع");
  const settings = await getStoreSettings(selectedStore.id);
  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h1 className="text-sm font-extrabold text-ink-900">الدفع المركزي لجميع المتاجر</h1>
        <p className="mt-1 text-[10px] text-ink-400">طرق الدفع ومفاتيح الشركات مشتركة وتُدار من هنا؛ بيانات التحويل والضريبة تبقى مرتبطة بالمتجر المختار.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {storeRows.map((store) => (
            <Link key={store.id} href={`/dashboard/settings/payments?storeId=${store.id}`} className={`rounded-xl px-3 py-2 text-[11px] font-bold ${store.id === selectedStore.id ? "bg-ink-900 text-white" : "bg-stone-100 text-ink-600"}`}>
              {store.name}
            </Link>
          ))}
        </div>
      </section>
      <PaymentsSettingsView
        key={selectedStore.id}
        initialSettings={settings}
        initialMethods={methods}
        initialStatus={credentialStatus}
        storeId={selectedStore.id}
      />
    </div>
  );
}
