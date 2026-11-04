/**
 * admin-data.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. getStoreCategories يستخدم db.select + count() بدل raw SQL (يمنع
 *      bug: productCount = 0 عند تغير شكل نتيجة db.execute).
 *   2. getStoreSettings: إعادة SELECT بعد onConflictDoNothing (اتساق الطلبات المتزامنة).
 *   3. getStaff: اختيار أعمدة محددة (لا load لـ passwordHash).
 *   4. تحذير واضح عند فشل تحميل الإعدادات (عودة DEFAULT_SETTINGS خطيرة).
 */

import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, categories, coupons, integrations, products, stores, storeSettings, users } from "@/db/schema";
import { DEFAULT_SETTINGS, normalizeAppDownloadSettings, type StoreSettings } from "./store-defaults";
import { normalizeHomepageSections, type ThemePresetId } from "./theme-config";
import { getGlobalPaymentMethods } from "./payment-methods";

const num = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export type StoreCategoryDTO = {
  id: number;
  storeId: number;
  name: string;
  slug: string;
  blurb: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  isHighlight: boolean;
  productCount: number;
};

export type CouponDTO = {
  id: number;
  code: string;
  type: "percent" | "fixed" | "freeShipping";
  value: number;
  minOrder: number;
  usageLimit: number;
  usedCount: number;
  description: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type StaffDTO = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  permissions: string[];
  allowedCategories: string[];
  createdAt: string;
};

export type ActivityLogDTO = {
  id: number;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string;
  createdAt: string;
};

/* ───────────── Settings ───────────── */

export async function getDefaultStoreId(): Promise<number> {
  const [store] = await db.select({ id: stores.id }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)).limit(1);
  if (!store) throw new Error("No stores are available");
  return store.id;
}

export function toStoreSettings(row: typeof storeSettings.$inferSelect): StoreSettings {
  return {
    appDownloadSettings: normalizeAppDownloadSettings(row.appDownloadSettings),
    storeName: row.storeName,
    tagline: row.tagline,
    announcement: row.announcement,
    heroTitle: row.heroTitle,
    heroSubtitle: row.heroSubtitle,
    heroImageUrl: row.heroImageUrl,
    backgroundColor: row.backgroundColor,
    backgroundImageUrl: row.backgroundImageUrl,
    backgroundPattern: row.backgroundPattern,
    surfaceColor: row.surfaceColor,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    phone: row.phone,
    email: row.email,
    whatsapp: row.whatsapp,
    address: row.address,
    workingHours: row.workingHours,
    about: row.about,
    freeDocNumber: row.freeDocNumber,
    instagram: row.instagram,
    snapchat: row.snapchat,
    tiktok: row.tiktok,
    freeDelivery: row.freeDelivery,
    minOrder: num(row.minOrder),
    deliveryFee: num(row.deliveryFee),
    prepHours: row.prepHours,
    taxRate: num(row.taxRate),
    codEnabled: row.codEnabled,
    applePayEnabled: row.applePayEnabled,
    moyasarEnabled: row.moyasarEnabled,
    bankTransferEnabled: row.bankTransferEnabled,
    bankName: row.bankName,
    bankAccountName: row.bankAccountName,
    bankIban: row.bankIban,
    madaEnabled: row.madaEnabled,
    tabbyEnabled: row.tabbyEnabled,
    tamaraEnabled: row.tamaraEnabled,
    showReviews: row.showReviews,
    showFeatured: row.showFeatured,
    themePreset: (row.themePreset as ThemePresetId) || "store-emerald",
    logoUrl: row.logoUrl,
    faviconUrl: row.faviconUrl,
    fontFamily: row.fontFamily,
    fontUrl: row.fontUrl,
    fontWeight: row.fontWeight,
    useArabicNumbers: row.useArabicNumbers,
    showBreadcrumbs: row.showBreadcrumbs,
    uniformProductHeights: row.uniformProductHeights,
    autoPlayCarousel: row.autoPlayCarousel,
    enhancedCartToast: row.enhancedCartToast,
    autoLoadMore: row.autoLoadMore,
    themeAnimations: row.themeAnimations,
    loadingPageEnabled: row.loadingPageEnabled,
    loaderImageUrl: row.loaderImageUrl,
    loaderBackgroundColor: row.loaderBackgroundColor,
    loaderLogoSize: row.loaderLogoSize,
    loaderDuration: row.loaderDuration,
    loaderSkipButton: row.loaderSkipButton,
    loaderAllPages: row.loaderAllPages,
    topBarDark: row.topBarDark,
    mobileSidebarDark: row.mobileSidebarDark,
    footerDark: row.footerDark,
    headerMobileLogoRight: row.headerMobileLogoRight,
    mobileBackButton: row.mobileBackButton,
    enlargedHeaderIcons: row.enlargedHeaderIcons,
    bottomNavEnabled: row.bottomNavEnabled,
    sidebarBackground: row.sidebarBackground,
    hideUsefulLinks: row.hideUsefulLinks,
    hideCustomerService: row.hideCustomerService,
    announcementAutoHide: row.announcementAutoHide,
    announcementSlide: row.announcementSlide,
    floatingAnnouncement: row.floatingAnnouncement,
    announcementIcon: row.announcementIcon,
    announcementTextColor: row.announcementTextColor,
    customerChannelsEnabled: row.customerChannelsEnabled,
    freeDocVisible: row.freeDocVisible,
    storeAppVisible: row.storeAppVisible,
    productCardBackground: row.productCardBackground,
    productCardBorder: row.productCardBorder,
    promoTitleBackground: row.promoTitleBackground,
    productImageRatio: row.productImageRatio,
    productCardRadius: row.productCardRadius,
    customCss: row.customCss,
    productAddIcon: row.productAddIcon,
    quickProductView: row.quickProductView,
    wishlistVisible: row.wishlistVisible,
    hideProductFrame: row.hideProductFrame,
    hideDiscountBadge: row.hideDiscountBadge,
    hideProductBackground: row.hideProductBackground,
    boldProductTitle: row.boldProductTitle,
    oneLineProductTitle: row.oneLineProductTitle,
    centeredProductText: row.centeredProductText,
    hideOutOfStockButton: row.hideOutOfStockButton,
    hideAddToCart: row.hideAddToCart,
    hideWishlistButton: row.hideWishlistButton,
    hideProductRatings: row.hideProductRatings,
    hideProductCategory: row.hideProductCategory,
    shineProductCard: row.shineProductCard,
    homepageSections: normalizeHomepageSections(row.homepageSections),
    customDomain: row.customDomain,
    domainStatus: row.domainStatus,
    maintenanceMode: row.maintenanceMode,
    maintenanceMessage: row.maintenanceMessage,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getStoreSettings(requestedStoreId?: number): Promise<StoreSettings> {
  try {
    const storeId = requestedStoreId ?? await getDefaultStoreId();
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store) throw new Error(`Store ${storeId} was not found while loading its settings`);

    const [existing] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.storeId, storeId))
      .limit(1);
    if (existing) {
      const paymentMethods = await getGlobalPaymentMethods();
      return {
        ...toStoreSettings(existing),
        ...paymentMethods,
        storeName: store.name,
        logoUrl: store.logoUrl ?? existing.logoUrl,
      };
    }

    const typeLabel = store.storeType === "CLOTHING"
      ? "الملابس والأحذية"
      : store.storeType === "GROCERY"
        ? "المواد الغذائية"
        : store.storeType === "FROZEN"
          ? "المنتجات المجمدة"
          : "الذبائح واللحوم";
    const isSlaughterhouse = store.storeType === "SLAUGHTERHOUSE";

    const [created] = await db
      .insert(storeSettings)
      .values({
        storeId,
        storeName: store.name,
        logoUrl: store.logoUrl,
        tagline: isSlaughterhouse ? DEFAULT_SETTINGS.tagline : "تسوق بسهولة وثقة",
        heroTitle: isSlaughterhouse ? DEFAULT_SETTINGS.heroTitle : `تسوق ${typeLabel} من ${store.name}`,
        about: isSlaughterhouse ? DEFAULT_SETTINGS.about : `مرحباً بك في ${store.name}، وجهتك المميزة لـ${typeLabel}.`,
        heroSubtitle: isSlaughterhouse ? DEFAULT_SETTINGS.heroSubtitle : `تصفح منتجات ${typeLabel} واختر ما يناسبك.`,
        heroImageUrl: isSlaughterhouse ? DEFAULT_SETTINGS.heroImageUrl : null,
        instagram: isSlaughterhouse ? DEFAULT_SETTINGS.instagram : null,
      })
      .onConflictDoUpdate({
        target: storeSettings.storeId,
        set: { storeId },
      })
      .returning();

    if (created) return { ...toStoreSettings(created), ...(await getGlobalPaymentMethods()) };

    const [row] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.storeId, storeId))
      .limit(1);
    if (!row) throw new Error(`Could not initialize settings for store ${storeId}`);
    return { ...toStoreSettings(row), ...(await getGlobalPaymentMethods()) };
  } catch (error) {
    // ⚠️ Falling back to DEFAULT_SETTINGS when the DB is unreachable is risky:
    //    - maintenanceMode reverts to false (store becomes live)
    //    - freeDelivery reverts to true (free shipping)
    // Log clearly so operators can act.
    console.error(
      "[settings] Failed to load store settings from DB — falling back to DEFAULT_SETTINGS. " +
        "Warning: maintenanceMode and freeDelivery may be incorrect until the DB is reachable.",
      error,
    );
    return DEFAULT_SETTINGS;
  }
}

/* ───────────── Categories ───────────── */

export async function getStoreCategories(storeId?: number): Promise<StoreCategoryDTO[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(typeof storeId === "number" ? eq(categories.storeId, storeId) : undefined)
    .orderBy(categories.sortOrder, categories.id);

  const visibleNames = new Set(rows.map((row) => row.name));
  const counts = await db
    .select({ category: products.category, count: sql<number>`count(*)::int` })
    .from(products)
    .where(typeof storeId === "number" ? eq(products.storeId, storeId) : undefined)
    .groupBy(products.category);

  const byName = new Map(counts.map((row) => [row.category, Number(row.count)]));

  return rows.map((row) => ({
    id: row.id,
    storeId: row.storeId,
    name: row.name,
    slug: row.slug,
    blurb: row.blurb,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isHighlight: row.isHighlight,
    productCount: visibleNames.has(row.name) ? byName.get(row.name) ?? 0 : 0,
  }));
}

export async function getProductAnimalTypes(requestedStoreId?: number): Promise<string[]> {
  const storeId = requestedStoreId ?? await getDefaultStoreId();
  const [row] = await db
    .select({ types: storeSettings.productAnimalTypes })
    .from(storeSettings)
    .where(eq(storeSettings.storeId, storeId))
    .limit(1);
  return row?.types?.length ? row.types : ["عام", "خروف", "تيس", "لحم مفروم", "حاشي"];
}

/* ───────────── Coupons ───────────── */

export async function getCoupons(): Promise<CouponDTO[]> {
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt), desc(coupons.id));
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    type: (row.type === "fixed" || row.type === "freeShipping" ? row.type : "percent") as CouponDTO["type"],
    value: num(row.value),
    minOrder: num(row.minOrder),
    usageLimit: row.usageLimit,
    usedCount: row.usedCount,
    description: row.description,
    expiresAt: row.expiresAt,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  }));
}

/* ───────────── Staff ───────────── */

export async function getStaff(): Promise<StaffDTO[]> {
  // Don't load passwordHash — only the columns the DTO exposes.
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      permissions: users.permissions,
      allowedCategories: users.allowedCategories,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt), desc(users.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    permissions: row.permissions ?? [],
    allowedCategories: row.allowedCategories ?? [],
    createdAt: row.createdAt.toISOString(),
  }));
}

/* ───────────── Activity logs ───────────── */

export async function getActivityLogs(limit = 150): Promise<ActivityLogDTO[]> {
  const rows = await db
    .select({
      id: activityLogs.id,
      actorName: activityLogs.actorName,
      action: activityLogs.action,
      entity: activityLogs.entity,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    actorName: row.actorName,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
  }));
}

/* ───────────── Integrations ───────────── */

export type IntegrationDTO = {
  id: number;
  storeId: number;
  key: string;
  name: string;
  category: string;
  url: string;
  accountId: string | null;
  isEnabled: boolean;
  notes: string;
};

export async function getIntegrations(storeId: number): Promise<IntegrationDTO[]> {
  const rows = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.storeId, storeId), sql`${integrations.category} <> 'الدفع'`))
    .orderBy(integrations.category, integrations.id);
  return rows.map((row) => ({
    id: row.id,
    storeId: row.storeId,
    key: row.key,
    name: row.name,
    category: row.category,
    url: row.url,
    accountId: row.accountId,
    isEnabled: row.isEnabled,
    notes: row.notes,
  }));
}