import { notFound } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import { StoreDownloadPage } from "@/app/(store)/download/page";

export const dynamic = "force-dynamic";

export default async function StoreSpecificDownloadPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store: slug } = await params;
  await ensureSeeded();
  const [store] = await db.select().from(stores).where(eq(stores.slug, slug.toLowerCase())).limit(1);
  if (!store) notFound();

  return <StoreDownloadPage storeId={store.id} storeSlug={store.slug} />;
}
