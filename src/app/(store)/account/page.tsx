import { db } from '@/db';
import { stores } from '@/db/schema';
import { getDefaultStoreId } from '@/lib/admin-data';
import { eq } from 'drizzle-orm';
import { CustomerAccountPage } from '@/components/store/customer-account-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const storeId = await getDefaultStoreId();
  const [store] = await db.select({ name: stores.name }).from(stores).where(eq(stores.id, storeId)).limit(1);
  return { title: store ? `حساب العميل | ${store.name}` : 'حساب العميل' };
}

export default async function CustomerAccountRoute() {
  const storeId = await getDefaultStoreId();
  const [store] = await db.select({ name: stores.name, slug: stores.slug }).from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) throw new Error(`Default store ${storeId} is unavailable`);
  return <CustomerAccountPage storeId={storeId} storeName={store.name} storeSlug={store.slug} />;
}