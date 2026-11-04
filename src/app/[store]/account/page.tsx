import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CustomerAccountPage } from "@/components/store/customer-account-page";
import { db } from "@/db";
import { stores } from "@/db/schema";

type Props = { params: Promise<{ store: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: slug } = await params;
  const [store] = await db.select({ name: stores.name }).from(stores).where(eq(stores.slug, slug.toLowerCase())).limit(1);
  return { title: store ? `حساب العميل | ${store.name}` : "حساب العميل" };
}

export default async function StoreCustomerAccountRoute({ params }: Props) {
  const { store: slug } = await params;
  const [store] = await db
    .select({ id: stores.id, name: stores.name, slug: stores.slug })
    .from(stores)
    .where(eq(stores.slug, slug.toLowerCase()))
    .limit(1);
  if (!store) notFound();

  return (
    <CustomerAccountPage
      storeId={store.id}
      storeName={store.name}
      storeSlug={store.slug}
    />
  );
}
