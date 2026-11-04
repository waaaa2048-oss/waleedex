import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerAuthForm } from "@/components/store/customer-auth-form";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";

type Props = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: slug } = await params;
  const [store] = await db.select({ name: stores.name }).from(stores).where(eq(stores.slug, slug.toLowerCase())).limit(1);
  return { title: store ? `حساب العميل | ${store.name}` : "حساب العميل" };
}

export default async function StoreCustomerLoginPage({ params }: Props) {
  const { store: slug } = await params;
  const [store] = await db.select({ name: stores.name, slug: stores.slug }).from(stores).where(eq(stores.slug, slug.toLowerCase())).limit(1);
  if (!store) notFound();
  return <CustomerAuthForm initialMode="login" storeName={store.name} storeSlug={store.slug} />;
}
