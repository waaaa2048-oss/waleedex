import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { CartProvider } from "@/components/store/cart-provider";
import { CartDrawer } from "@/components/store/cart-drawer";
import { StoreFooter, WhatsAppFloat } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { CartQuickBar } from "@/components/store/cart-quick-bar";
import { ThemeLoader } from "@/components/store/theme-loader";
import { ToastProvider } from "@/components/toast";
import { getDefaultStoreId, getStoreCategories, getStoreSettings } from "@/lib/admin-data";
import { ensureSeeded } from "@/db/seed";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { STORE_THEMES, withModernDefaults } from "@/lib/theme-config";
import { Icon, type IconName } from "@/components/icons";
import { isTabbyConfigured } from "@/lib/tabby";
import { getPaymentCredentials } from "@/lib/payment-credentials";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const storeId = await getDefaultStoreId();
  const settings = await getStoreSettings(storeId);
  return {
    applicationName: settings.storeName,
    title: `${settings.storeName} | ${settings.tagline}`,
    description: settings.about,
    icons: {
      icon: settings.faviconUrl || "/icon.svg",
      apple: settings.logoUrl || settings.faviconUrl || "/icon.svg",
    },
  };
}

const PATTERN_STYLES: Record<string, string> = {
  dots: "radial-gradient(rgba(18,33,28,0.10) 1px, transparent 1px)",
  grid:
    "linear-gradient(to right, rgba(18,33,28,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(18,33,28,0.06) 1px, transparent 1px)",
  diagonal:
    "repeating-linear-gradient(45deg, rgba(18,33,28,0.05) 0 1px, transparent 1px 14px)",
};

export default async function StoreLayout({
  children,
  storeId,
  storeName,
  logoUrl,
  storeSlug = "",
}: {
  children: ReactNode;
  storeId?: number;
  storeName?: string;
  logoUrl?: string | null;
  storeSlug?: string;
}) {
  await ensureSeeded();
  const resolvedStoreId = storeId ?? await getDefaultStoreId();
  const [resolvedStore] = await db
    .select({ id: stores.id, name: stores.name, slug: stores.slug })
    .from(stores)
    .where(eq(stores.id, resolvedStoreId))
    .limit(1);
  if (!resolvedStore) throw new Error(`Store ${resolvedStoreId} is unavailable for storefront layout`);
  const resolvedStoreSlug = storeSlug || resolvedStore.slug;
  const [baseSettings, allCategories, tabbyConfigured, paymentCredentials] = await Promise.all([
    getStoreSettings(resolvedStoreId),
    getStoreCategories(resolvedStoreId),
    isTabbyConfigured(),
    getPaymentCredentials(),
  ]);
  const categories = allCategories.filter((category) => category.isActive);
  const displaySettings = withModernDefaults({
    ...baseSettings,
    storeName: storeName ?? resolvedStore.name,
    logoUrl: logoUrl ?? baseSettings.logoUrl,
  });
  const isDarkTheme = displaySettings.themePreset === "store-dark";
  const settings = displaySettings;
  const preset = STORE_THEMES.find((theme) => theme.id === displaySettings.themePreset) ?? STORE_THEMES[0];
  const pattern = displaySettings.backgroundPattern;
  const storeTexture: string[] = [];
  const backgroundLayers = [
    displaySettings.backgroundImageUrl ? `url("${displaySettings.backgroundImageUrl}")` : "",
    pattern !== "none" ? PATTERN_STYLES[pattern] ?? "" : "",
    ...storeTexture,
  ].filter(Boolean);
  const patternSize = pattern === "dots" ? "18px 18px" : pattern === "grid" ? "26px 26px" : "auto";
  const themeStyle: CSSProperties & Record<`--${string}`, string> = {
    "--store-primary": displaySettings.primaryColor,
    "--store-accent": displaySettings.accentColor,
    "--store-bg": displaySettings.backgroundColor,
    "--store-surface": displaySettings.surfaceColor,
    "--store-card": displaySettings.productCardBackground,
    "--store-line": displaySettings.productCardBorder,
    "--store-card-border": displaySettings.productCardBorder,
    "--store-card-radius": displaySettings.productCardRadius === "square" ? "0.375rem" : displaySettings.productCardRadius === "round" ? "1.5rem" : "0.875rem",
    "--store-product-ratio": String(displaySettings.productImageRatio),
    "--store-product-aspect": displaySettings.productImageRatio <= 9 ? "1 / 1" : `9 / ${displaySettings.productImageRatio}`,
    "--store-ink": preset.colors.dark,
    "--store-body": isDarkTheme ? "#dcdcdc" : "#3b4640",
    "--store-muted": isDarkTheme ? "#c7c7c7" : "#5e6a64",
    "--store-faint": isDarkTheme ? "#a8a8a8" : "#7c8780",
    "--store-accent-text": isDarkTheme ? displaySettings.accentColor : "#8a6212",
    "--store-font-weight": displaySettings.fontWeight,
    "--store-announcement-text": displaySettings.announcementTextColor,
    "--store-font": `"${displaySettings.fontFamily}", Tajawal, ui-sans-serif, system-ui, sans-serif`,
    backgroundColor: displaySettings.backgroundColor,
    backgroundImage: backgroundLayers.join(", "),
    backgroundSize: [
      displaySettings.backgroundImageUrl ? "cover" : "",
      pattern !== "none" ? patternSize : "",
      ...storeTexture.map(() => "auto"),
    ].filter(Boolean).join(", "),
    backgroundPosition: "center top",
    backgroundAttachment: displaySettings.backgroundImageUrl ? "fixed" : "scroll",
    fontFamily: `"${displaySettings.fontFamily}", Tajawal, ui-sans-serif, system-ui, sans-serif`,
  };

  return (
    <ToastProvider>
      <CartProvider key={resolvedStoreSlug} storeId={resolvedStoreId} storeSlug={resolvedStoreSlug}>
        <div
          className="min-h-screen text-[var(--store-ink)]"
          style={themeStyle}
          data-theme-dark={settings.themePreset === "store-dark" ? "true" : "false"}
          data-hide-add-to-cart={settings.hideAddToCart ? "true" : "false"}
          data-hide-wishlist={settings.hideWishlistButton || !settings.wishlistVisible ? "true" : "false"}
          data-hide-product-category={settings.hideProductCategory ? "true" : "false"}
          data-hide-product-frame={settings.hideProductFrame ? "true" : "false"}
          data-hide-product-background={settings.hideProductBackground ? "true" : "false"}
          data-hide-product-ratings={settings.hideProductRatings ? "true" : "false"}
          data-hide-discount-badge={settings.hideDiscountBadge ? "true" : "false"}
          data-hide-out-of-stock={settings.hideOutOfStockButton ? "true" : "false"}
          data-product-add-icon={settings.productAddIcon}
          data-product-title-bold={settings.boldProductTitle ? "true" : "false"}
          data-product-title-one-line={settings.oneLineProductTitle ? "true" : "false"}
          data-product-text-center={settings.centeredProductText ? "true" : "false"}
          data-product-shine={settings.shineProductCard ? "true" : "false"}
          data-uniform-product-heights={settings.uniformProductHeights ? "true" : "false"}
          data-theme-animations={settings.themeAnimations ? "true" : "false"}
          data-quick-product-view={settings.quickProductView ? "true" : "false"}
        >
          <ThemeLoader
            enabled={settings.loadingPageEnabled}
            allPages={settings.loaderAllPages}
            duration={settings.loaderDuration}
            background={settings.loaderBackgroundColor}
            image={settings.loaderImageUrl ?? settings.heroImageUrl}
            logo={settings.logoUrl}
            logoSize={settings.loaderLogoSize}
            skip={settings.loaderSkipButton}
            storeName={settings.storeName}
            tagline={settings.tagline}
          />
          <meta name="theme-color" content={settings.primaryColor} />
          <meta name="apple-mobile-web-app-title" content={settings.storeName} />
          <link rel="apple-touch-icon" href={settings.logoUrl ?? "/icon.svg"} />
          {settings.faviconUrl ? <link rel="icon" href={settings.faviconUrl} /> : null}
          {settings.fontUrl && /^https:\/\//i.test(settings.fontUrl) ? <link rel="stylesheet" href={settings.fontUrl} /> : null}
          {settings.customCss ? <style dangerouslySetInnerHTML={{ __html: settings.customCss.replace(/<\/?style/gi, "") }} /> : null}
          <StoreHeader
            storeName={settings.storeName}
            storeSlug={resolvedStoreSlug}
            tagline={settings.tagline}
            announcement={settings.announcement}
            announcementIcon={settings.announcementIcon}
            announcementTextColor={settings.announcementTextColor}
            phone={settings.phone}
            workingHours={settings.workingHours}
            logoUrl={settings.logoUrl}
            sidebarBackground={settings.sidebarBackground}
            topBarDark={settings.topBarDark}
            mobileSidebarDark={settings.mobileSidebarDark}
            headerMobileLogoRight={settings.headerMobileLogoRight}
            enlargedHeaderIcons={settings.enlargedHeaderIcons}
            mobileBackButton={settings.mobileBackButton}
            announcementAutoHide={settings.announcementAutoHide}
            announcementSlide={settings.announcementSlide}
            categories={categories.map((category) => ({ name: category.name, slug: category.slug, highlight: category.isHighlight }))}
          />
          {settings.floatingAnnouncement ? (
            <Link
              href={`${resolvedStoreSlug ? `/${resolvedStoreSlug}` : ""}/products`}
              className="fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-xl items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center text-[12px] font-semibold shadow-xl md:bottom-5"
              style={{ backgroundColor: settings.primaryColor, color: settings.announcementTextColor }}
            >
              <span>{settings.announcementIcon}</span>{settings.announcement}
            </Link>
          ) : null}
          <main className="relative">
            {settings.maintenanceMode ? (
              <div className="border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-center text-[12px] font-semibold text-amber-900">
                🛠️ {settings.maintenanceMessage}
              </div>
            ) : null}
            {children}
          </main>
          <StoreFooter
            storeName={settings.storeName}
            storeSlug={resolvedStoreSlug}
            tagline={settings.tagline}
            about={settings.about}
            phone={settings.phone}
            email={settings.email}
            address={settings.address}
            freeDocNumber={settings.freeDocNumber}
            logoUrl={settings.logoUrl}
            whatsapp={settings.whatsapp}
            categories={categories.map((category) => ({ name: category.name, slug: category.slug }))}
            payments={
              settings.bankTransferEnabled && /^SA\d{22}$/.test(settings.bankIban.replace(/\s/g, "").toUpperCase())
                ? ["تحويل بنكي"]
                : []
            }
            instagram={settings.instagram}
            snapchat={settings.snapchat}
            tiktok={settings.tiktok}
            freeDocVisible={settings.freeDocVisible}
            customerChannelsEnabled={settings.customerChannelsEnabled}
            storeAppVisible={settings.storeAppVisible}
            hideUsefulLinks={settings.hideUsefulLinks}
            hideCustomerService={settings.hideCustomerService}
            footerDark={settings.footerDark}
          />
          {settings.bottomNavEnabled ? (
            <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--store-line)] bg-[var(--store-card)]/95 px-2 py-2 text-center text-[11px] font-bold text-[var(--store-primary)] shadow-xl backdrop-blur md:hidden">
              {[{ href: resolvedStoreSlug ? `/${resolvedStoreSlug}` : "/", label: "الرئيسية", icon: "dashboard" }, { href: `${resolvedStoreSlug ? `/${resolvedStoreSlug}` : ""}/products`, label: "المنتجات", icon: "products" }, { href: `tel:${settings.phone}`, label: "تواصل", icon: "phone" }, { href: `${resolvedStoreSlug ? `/${resolvedStoreSlug}` : ""}/products`, label: "التصنيفات", icon: "box" }].map((item) => (
                <a key={item.label} href={item.href} className="flex flex-col items-center gap-1 py-1"><Icon name={item.icon as IconName} className="h-5 w-5" />{item.label}</a>
              ))}
            </nav>
          ) : null}
          <CartQuickBar lifted={settings.bottomNavEnabled || settings.floatingAnnouncement} />
          <CartDrawer
            tabbyPromo={
              settings.tabbyEnabled && tabbyConfigured
                ? {
                    publicKey: paymentCredentials.tabbyPublicKey,
                    merchantCode: paymentCredentials.tabbyMerchantCode,
                  }
                : null
            }
          />
          <WhatsAppFloat whatsapp={settings.whatsapp} storeName={settings.storeName} />
        </div>
      </CartProvider>
    </ToastProvider>
  );
}
