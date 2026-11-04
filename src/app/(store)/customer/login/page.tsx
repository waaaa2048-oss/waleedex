import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/store/customer-auth-form";
import { getDefaultStoreId } from "@/lib/admin-data";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateMetadata(): Promise<Metadata> {
  const storeId = await getDefaultStoreId();
  const [store] = await db.select({ name: stores.name }).from(stores).where(eq(stores.id, storeId)).limit(1);
  return { title: `حساب العميل | ${store?.name ?? "المتجر"}` };
}

export default async function CustomerLoginPage() {
  const storeId = await getDefaultStoreId();
  const [store] = await db.select({ name: stores.name, slug: stores.slug }).from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) throw new Error(`Default store ${storeId} is unavailable`);
  return <CustomerAuthForm initialMode="login" storeName={store.name} storeSlug={store.slug} />;
}
