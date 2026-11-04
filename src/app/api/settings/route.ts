import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings, stores } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";
import { getDefaultStoreId, getStoreSettings, toStoreSettings } from "@/lib/admin-data";
import { logActivity } from "@/lib/log";
import { STORE_THEMES, normalizeHomepageSections, type ThemePresetId } from "@/lib/theme-config";

export const dynamic = "force-dynamic";

const str = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
const optStr = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);
const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const numStr = (value: unknown, fallback: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : fallback;
};

function requestedStoreId(request: Request): number | null | undefined {
  const raw = new URL(request.url).searchParams.get("storeId");
  if (raw === null) return undefined;
  const storeId = Number(raw);
  if (!Number.isInteger(storeId) || storeId <= 0) return null;
  return storeId;
}

export async function GET(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const storeId = requestedStoreId(request);
    if (storeId === null) return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    return NextResponse.json({ settings: await getStoreSettings(storeId) });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await permissionGuard("settings.write");
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    const requestedId = requestedStoreId(request);
    if (requestedId === null) return NextResponse.json({ error: "معرّف المتجر غير صالح" }, { status: 400 });
    const storeId = requestedId ?? await getDefaultStoreId();
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store) return NextResponse.json({ error: "المتجر المحدد غير موجود" }, { status: 404 });
    if (body.taxRate !== undefined) {
      const taxRate = Number(body.taxRate);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        return NextResponse.json({ error: "يجب أن تكون ضريبة القيمة المضافة بين 0 و100%" }, { status: 400 });
      }
    }

    const current = await getStoreSettings(storeId);
    const values = {
      storeName: str(body.storeName, current.storeName),
      tagline: str(body.tagline, current.tagline),
      announcement: str(body.announcement, current.announcement),
      heroTitle: str(body.heroTitle, current.heroTitle),
      heroSubtitle: str(body.heroSubtitle, current.heroSubtitle),
      heroImageUrl: body.heroImageUrl === undefined ? current.heroImageUrl : optStr(body.heroImageUrl),
      backgroundColor: str(body.backgroundColor, current.backgroundColor),
      backgroundImageUrl:
        body.backgroundImageUrl === undefined ? current.backgroundImageUrl : optStr(body.backgroundImageUrl),
      backgroundPattern: str(body.backgroundPattern, current.backgroundPattern),
      surfaceColor: str(body.surfaceColor, current.surfaceColor),
      primaryColor: str(body.primaryColor, current.primaryColor),
      accentColor: str(body.accentColor, current.accentColor),
      phone: str(body.phone, current.phone),
      email: str(body.email, current.email),
      whatsapp: str(body.whatsapp, current.whatsapp),
      address: typeof body.address === "string" ? body.address.trim() : current.address,
      workingHours: str(body.workingHours, current.workingHours),
      about: str(body.about, current.about),
      freeDocNumber: str(body.freeDocNumber, current.freeDocNumber),
      instagram: body.instagram === undefined ? current.instagram : optStr(body.instagram),
      snapchat: body.snapchat === undefined ? current.snapchat : optStr(body.snapchat),
      tiktok: body.tiktok === undefined ? current.tiktok : optStr(body.tiktok),
      freeDelivery: bool(body.freeDelivery, current.freeDelivery),
      minOrder: numStr(body.minOrder, String(current.minOrder)),
      deliveryFee: numStr(body.deliveryFee, String(current.deliveryFee)),
      prepHours: Math.max(1, Math.min(72, Math.round(Number(body.prepHours ?? current.prepHours) || current.prepHours))),
      taxRate: numStr(body.taxRate, String(current.taxRate)),
      codEnabled: current.codEnabled,
      applePayEnabled: current.applePayEnabled,
      moyasarEnabled: current.moyasarEnabled,
      bankTransferEnabled: current.bankTransferEnabled,
      bankName: typeof body.bankName === "string" ? body.bankName.slice(0, 100) : current.bankName,
      bankAccountName: typeof body.bankAccountName === "string" ? body.bankAccountName.slice(0, 120) : current.bankAccountName,
      bankIban: typeof body.bankIban === "string" ? body.bankIban.replace(/\s/g, "").slice(0, 34) : current.bankIban,
      madaEnabled: current.madaEnabled,
      tabbyEnabled: current.tabbyEnabled,
      tamaraEnabled: current.tamaraEnabled,
      showReviews: bool(body.showReviews, current.showReviews),
      showFeatured: bool(body.showFeatured, current.showFeatured),
      themePreset: STORE_THEMES.some((theme) => theme.id === body.themePreset)
        ? (body.themePreset as ThemePresetId)
        : current.themePreset,
      logoUrl: body.logoUrl === undefined ? current.logoUrl : optStr(body.logoUrl),
      faviconUrl: body.faviconUrl === undefined ? current.faviconUrl : optStr(body.faviconUrl),
      fontFamily: str(body.fontFamily, current.fontFamily),
      fontUrl: body.fontUrl === undefined ? current.fontUrl : optStr(body.fontUrl),
      fontWeight: str(body.fontWeight, current.fontWeight),
      useArabicNumbers: bool(body.useArabicNumbers, current.useArabicNumbers),
      showBreadcrumbs: bool(body.showBreadcrumbs, current.showBreadcrumbs),
      uniformProductHeights: bool(body.uniformProductHeights, current.uniformProductHeights),
      autoPlayCarousel: bool(body.autoPlayCarousel, current.autoPlayCarousel),
      enhancedCartToast: bool(body.enhancedCartToast, current.enhancedCartToast),
      autoLoadMore: bool(body.autoLoadMore, current.autoLoadMore),
      themeAnimations: bool(body.themeAnimations, current.themeAnimations),
      loadingPageEnabled: bool(body.loadingPageEnabled, current.loadingPageEnabled),
      loaderImageUrl: body.loaderImageUrl === undefined ? current.loaderImageUrl : optStr(body.loaderImageUrl),
      loaderBackgroundColor: str(body.loaderBackgroundColor, current.loaderBackgroundColor),
      loaderLogoSize: Math.max(0, Math.min(300, Math.round(Number(body.loaderLogoSize ?? current.loaderLogoSize) || 0))),
      loaderDuration: Math.max(1, Math.min(10, Math.round(Number(body.loaderDuration ?? current.loaderDuration) || 2))),
      loaderSkipButton: bool(body.loaderSkipButton, current.loaderSkipButton),
      loaderAllPages: bool(body.loaderAllPages, current.loaderAllPages),
      topBarDark: bool(body.topBarDark, current.topBarDark),
      mobileSidebarDark: bool(body.mobileSidebarDark, current.mobileSidebarDark),
      footerDark: bool(body.footerDark, current.footerDark),
      headerMobileLogoRight: bool(body.headerMobileLogoRight, current.headerMobileLogoRight),
      mobileBackButton: bool(body.mobileBackButton, current.mobileBackButton),
      enlargedHeaderIcons: bool(body.enlargedHeaderIcons, current.enlargedHeaderIcons),
      bottomNavEnabled: bool(body.bottomNavEnabled, current.bottomNavEnabled),
      sidebarBackground: str(body.sidebarBackground, current.sidebarBackground),
      hideUsefulLinks: bool(body.hideUsefulLinks, current.hideUsefulLinks),
      hideCustomerService: bool(body.hideCustomerService, current.hideCustomerService),
      announcementAutoHide: bool(body.announcementAutoHide, current.announcementAutoHide),
      announcementSlide: bool(body.announcementSlide, current.announcementSlide),
      floatingAnnouncement: bool(body.floatingAnnouncement, current.floatingAnnouncement),
      announcementIcon: str(body.announcementIcon, current.announcementIcon),
      announcementTextColor: str(body.announcementTextColor, current.announcementTextColor),
      customerChannelsEnabled: bool(body.customerChannelsEnabled, current.customerChannelsEnabled),
      freeDocVisible: bool(body.freeDocVisible, current.freeDocVisible),
      storeAppVisible: bool(body.storeAppVisible, current.storeAppVisible),
      productCardBackground: str(body.productCardBackground, current.productCardBackground),
      productCardBorder: str(body.productCardBorder, current.productCardBorder),
      promoTitleBackground: str(body.promoTitleBackground, current.promoTitleBackground),
      productImageRatio: Math.max(4, Math.min(20, Math.round(Number(body.productImageRatio ?? current.productImageRatio) || 9))),
      productCardRadius: str(body.productCardRadius, current.productCardRadius),
      customCss: typeof body.customCss === "string"
        ? body.customCss.slice(0, 20000).replace(/<\/?style/gi, "")
        : current.customCss,
      productAddIcon: str(body.productAddIcon, current.productAddIcon),
      quickProductView: bool(body.quickProductView, current.quickProductView),
      wishlistVisible: bool(body.wishlistVisible, current.wishlistVisible),
      hideProductFrame: bool(body.hideProductFrame, current.hideProductFrame),
      hideDiscountBadge: bool(body.hideDiscountBadge, current.hideDiscountBadge),
      hideProductBackground: bool(body.hideProductBackground, current.hideProductBackground),
      boldProductTitle: bool(body.boldProductTitle, current.boldProductTitle),
      oneLineProductTitle: bool(body.oneLineProductTitle, current.oneLineProductTitle),
      centeredProductText: bool(body.centeredProductText, current.centeredProductText),
      hideOutOfStockButton: bool(body.hideOutOfStockButton, current.hideOutOfStockButton),
      hideAddToCart: bool(body.hideAddToCart, current.hideAddToCart),
      hideWishlistButton: bool(body.hideWishlistButton, current.hideWishlistButton),
      hideProductRatings: bool(body.hideProductRatings, current.hideProductRatings),
      hideProductCategory: bool(body.hideProductCategory, current.hideProductCategory),
      shineProductCard: bool(body.shineProductCard, current.shineProductCard),
      homepageSections: body.homepageSections === undefined
        ? current.homepageSections
        : normalizeHomepageSections(body.homepageSections),
      customDomain: current.customDomain,
      domainStatus: current.domainStatus,
      maintenanceMode: bool(body.maintenanceMode, current.maintenanceMode),
      maintenanceMessage: str(body.maintenanceMessage, current.maintenanceMessage),
      updatedAt: new Date(),
    };

    await db.insert(storeSettings).values({ storeId, ...values }).onConflictDoUpdate({
      target: storeSettings.storeId,
      set: values,
    });
    await db.update(stores).set({
      name: values.storeName,
      logoUrl: values.logoUrl,
      updatedAt: new Date(),
    }).where(eq(stores.id, storeId));
    const [row] = await db.select().from(storeSettings).where(eq(storeSettings.storeId, storeId)).limit(1);
    await logActivity("تحديث إعدادات المتجر", "الإعدادات", storeId, `تم تحديث إعدادات ${values.storeName}`);
    return NextResponse.json({ settings: toStoreSettings(row) });
  } catch (error) {
    return serverError(error, "تعذر حفظ الإعدادات");
  }
}
