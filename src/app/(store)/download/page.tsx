import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { PWAControls } from "@/components/admin/pwa-controls";
import { getStoreSettings } from "@/lib/admin-data";
import type { AppDownloadSettings } from "@/lib/store-defaults";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return { title: `تنزيل تطبيق ${settings.storeName}` };
}

function AppIdentity({ settings, caption, directUrl }: {
  settings: Awaited<ReturnType<typeof getStoreSettings>>;
  caption: string;
  directUrl: string;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-center text-white backdrop-blur">
      {settings.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={settings.logoUrl} alt="" className="mx-auto h-20 w-20 rounded-3xl bg-white object-contain p-2 shadow-lg" />
      ) : (
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white text-4xl shadow-lg">🐑</span>
      )}
      <p className="mt-3 text-sm font-semibold">{settings.storeName} | {settings.tagline}</p>
      <p className="mt-1 text-[11px] text-white/60">{caption}</p>
      <a href={directUrl} className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[11px] font-bold text-white ring-1 ring-white/20">
        <span className="truncate" dir="ltr">{directUrl}</span>
        <Icon name="arrowLeft" className="h-3 w-3 shrink-0" />
      </a>
    </div>
  );
}

export default function DownloadPage() {
  return <StoreDownloadPage />;
}

export async function StoreDownloadPage({ storeId, storeSlug = "" }: { storeId?: number; storeSlug?: string } = {}) {
  const [headerList, settings] = await Promise.all([headers(), getStoreSettings(storeId)]);
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const storePath = storeSlug ? `/${storeSlug}` : "/";
  const directUrl = host ? `${proto}://${host}${storePath}` : storePath;
  const page: AppDownloadSettings = settings.appDownloadSettings;
  const heroTitle = page.heroTitle.replaceAll("{storeName}", settings.storeName);
  const platforms = (["android", "ios", "windows"] as const)
    .map((key) => page.platforms[key])
    .filter((platform) => platform.visible);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7">
      {page.showHero ? (
        <div className="relative overflow-hidden rounded-3xl bg-[var(--store-primary)] px-5 py-8 text-white sm:px-9 sm:py-10">
          <div className="absolute -top-16 -start-10 h-56 w-56 rounded-full bg-[var(--store-accent)]/25 blur-3xl" />
          <div className={`relative grid items-center gap-6 ${page.showIdentity ? "lg:grid-cols-[1.2fr_0.8fr]" : ""}`}>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/15">
                <Icon name="box" className="h-3.5 w-3.5" /> {page.heroBadge}
              </span>
              <h1 className="mt-3 text-2xl font-bold leading-9 sm:text-3xl">{heroTitle}</h1>
              <p className="mt-2 max-w-xl text-[12px] leading-7 text-white/70">{page.heroDescription}</p>
              {page.showControls ? <div className="mt-5"><PWAControls settings={page} /></div> : null}
            </div>
            {page.showIdentity ? <AppIdentity settings={settings} caption={page.identityCaption} directUrl={directUrl} /> : null}
          </div>
        </div>
      ) : (
        <>
          {page.showIdentity ? (
            <div className="mx-auto max-w-md rounded-3xl bg-[var(--store-primary)] p-5">
              <AppIdentity settings={settings} caption={page.identityCaption} directUrl={directUrl} />
            </div>
          ) : null}
          {page.showControls ? (
            <section className="mt-5 rounded-3xl border border-[var(--store-line)] bg-[var(--store-card)] p-5">
              <PWAControls settings={page} />
            </section>
          ) : null}
        </>
      )}

      {page.showSingleApp ? (
        <section className="mt-5 rounded-3xl border border-[var(--store-line)] bg-[var(--store-card)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--store-ink)]">{page.singleAppTitle}</h2>
              <p className="mt-1 text-[11px] leading-5 text-[var(--store-muted)]">{page.singleAppDescription}</p>
            </div>
            <Badge tone="brand">{page.platformsBadge}</Badge>
          </div>
          {page.showManagementCard ? (
            <div className="mt-4 rounded-2xl bg-[var(--store-surface)] p-4">
              <p className="text-xs font-semibold text-[var(--store-ink)]">{page.managementTitle}</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--store-muted)]">{page.managementDescription}</p>
              <Link href="/dashboard/settings/store" className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--store-primary)] px-3 text-[11px] font-bold text-white">
                <Icon name="settings" className="h-3.5 w-3.5" /> {page.managementLinkText}
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {page.showPlatformGuide && platforms.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {platforms.map((platform) => (
            <article key={platform.title} className="rounded-2xl border border-[var(--store-line)] bg-[var(--store-card)] p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{platform.icon}</span>
                <h2 className="text-sm font-semibold text-[var(--store-ink)]">{platform.title}</h2>
              </div>
              <ol className="mt-3 space-y-2">
                {platform.steps.map((step, index) => (
                  <li key={`${index}-${step}`} className="flex gap-2 text-[11px] leading-5 text-[var(--store-body)]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--store-surface)] text-[11px] font-bold text-[var(--store-primary)]">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      ) : null}

      {page.showUpdates ? (
        <section className="mt-5 rounded-2xl border border-[var(--store-line)] bg-[var(--store-surface)] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[var(--store-primary)]"><Icon name="sparkles" className="h-4 w-4" /></span>
            <div>
              <h2 className="text-xs font-semibold text-[var(--store-ink)]">{page.updatesTitle}</h2>
              <p className="mt-1 text-[11px] leading-5 text-[var(--store-body)]">{page.updatesDescription}</p>
            </div>
          </div>
        </section>
      ) : null}

      {page.showFooterLinks ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-[var(--store-primary)] ring-1 ring-[var(--store-line)]">
            <Icon name="arrowLeft" className="h-3.5 w-3.5" /> {page.homeLinkText}
          </Link>
          <Link href="/products" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--store-primary)] px-4 text-xs font-bold text-white">تسوق الآن</Link>
        </div>
      ) : null}
    </div>
  );
}
