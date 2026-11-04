import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import StoreLayout from "@/app/(store)/layout";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";
import { roleCan } from "@/lib/roles";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getStoreSettings } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const { store: slug } = await params;
  await ensureSeeded();
  const [store] = await db
    .select({ id: stores.id, name: stores.name, logoUrl: stores.logoUrl })
    .from(stores)
    .where(eq(stores.slug, slug.toLowerCase()))
    .limit(1);
  if (!store) return {};

  const settings = await getStoreSettings(store.id);
  return {
    applicationName: store.name,
    title: `${store.name} | ${settings.tagline}`,
    description: settings.about,
    manifest: `/${slug}/manifest.webmanifest`,
    icons: {
      icon: settings.faviconUrl || store.logoUrl || settings.logoUrl || "/icon.svg",
      apple: store.logoUrl || settings.logoUrl || settings.faviconUrl || "/icon.svg",
    },
  };
}

export default async function StoreSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  await ensureSeeded();
  const [storeRow] = await db.select().from(stores).where(eq(stores.slug, store.toLowerCase())).limit(1);

  if (!storeRow) {
    notFound();
  }

  if (storeRow.status !== "PUBLISHED") {
    const user = await getCurrentUser();
    if (!user || !roleCan(user.role, user.permissions, "settings.write")) notFound();
  }

  return (
    <StoreLayout
      storeId={storeRow.id}
      storeName={storeRow.name}
      logoUrl={storeRow.logoUrl}
      storeSlug={storeRow.slug}
    >
      {children}
    </StoreLayout>
  );
}
