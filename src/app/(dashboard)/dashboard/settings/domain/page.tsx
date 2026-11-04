import type { Metadata } from "next";
import { headers } from "next/headers";
import { DomainForm } from "@/components/admin/domain-form";
import { requirePermission } from "@/lib/require-permission";
import { db, ensureDatabaseReady } from "@/db";
import { platformDomainSettings, stores } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "دومين المنصة | Waleedex" };

export default async function DomainPage() {
  await requirePermission("settings.write");
  await ensureDatabaseReady();
  const [storeRows, headerList, [domainSettings]] = await Promise.all([
    db.select({ id: stores.id, name: stores.name, slug: stores.slug }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
    headers(),
    db.select().from(platformDomainSettings).where(eq(platformDomainSettings.id, 1)).limit(1),
  ]);
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const appUrl = `${proto}://${host}`;
  const domain = domainSettings?.customDomain ?? "";
  const status = domainSettings?.domainStatus ?? "none";
  return (
    <DomainForm
      appUrl={appUrl}
      domain={domain}
      status={status}
      stores={storeRows}
    />
  );
}
