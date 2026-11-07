/**
 * theme-config.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. normalizeHomepageSections يُرجع نسخة جديدة (clone) بدل المرجع المشترك.
 *   2. Object.freeze على STORE_THEMES / SECTION_KIND_META / DEFAULT_HOMEPAGE_SECTIONS.
 *   3. تحقق من imageUrl (http/https/relative/data:image فقط).
 *   4. تحقق من href (لا javascript: / لا data:).
 *   5. Dedupe section ids.
 *   6. item id fallback: ${sectionId}-${itemIndex} بدل ${index}-${itemIndex}.
 */

export type ThemePresetId = "store-emerald" | "store-wine" | "store-sand" | "store-dark" | "store-royal";

export type ThemePreset = {
  id: ThemePresetId;
  name: string;
  subtitle: string;
  version: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    card: string;
    border: string;
    dark: string;
  };
};

export const STORE_THEMES: readonly ThemePreset[] = Object.freeze([
  {
    id: "store-emerald",
    name: "ثيم · أخضر عصري",
    subtitle: "نظيف وواضح",
    version: "Store Modern",
    colors: {
      primary: "#12503a",
      accent: "#e2b04a",
      background: "#ffffff",
      surface: "#f4f6f4",
      card: "#ffffff",
      border: "#e3e8e4",
      dark: "#14201b",
    },
  },
  {
    id: "store-wine",
    name: "ثيم · عنابي فاخر",
    subtitle: "مظهر احتفالي للمناسبات",
    version: "Store Wine",
    colors: {
      primary: "#5c1329",
      accent: "#d5a33b",
      background: "#fcf6f3",
      surface: "#f7eae7",
      card: "#ffffff",
      border: "#ecd8d3",
      dark: "#2b1119",
    },
  },
  {
    id: "store-sand",
    name: "ثيم · رملي نجد",
    subtitle: "دفء الضيافة النجدية",
    version: "Store Sand",
    colors: {
      primary: "#7a4a1f",
      accent: "#bd8b2c",
      background: "#fdf9f0",
      surface: "#faf0df",
      card: "#ffffff",
      border: "#eadbc1",
      dark: "#332519",
    },
  },
  {
    id: "store-dark",
    name: "ثيم · ليلي داكن",
    subtitle: "واجهة أنيقة داكنة",
    version: "Store Charcoal",
    colors: {
      primary: "#292929",
      accent: "#d6ae49",
      background: "#202020",
      surface: "#303030",
      card: "#292929",
      border: "#454545",
      dark: "#ffffff",
    },
  },
  {
    id: "store-royal",
    name: "ثيم · ملكي",
    subtitle: "أزرق ملكي وذهبي",
    version: "Store Royal",
    colors: {
      primary: "#183b68",
      accent: "#d6b35e",
      background: "#f5f7fb",
      surface: "#e9eff8",
      card: "#ffffff",
      border: "#d8e1ef",
      dark: "#102440",
    },
  },
] as ThemePreset[]);

/**
 * ألوان الثيم القديم (الترابي). أي متجر لم يُغيّر ألوانه يُعرض تلقائياً بالثيم
 * العصري الجديد دون لمس قاعدة البيانات. المتجر الذي خصّص ألوانه يبقى كما هو.
 */
const LEGACY_EMERALD = Object.freeze({ primary: "#6b3e26", background: "#fdfbf7" });

export const MODERN_FONT_FAMILY = "IBM Plex Sans Arabic";

export function withModernDefaults<
  T extends {
    themePreset: string;
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    productCardBackground: string;
    productCardBorder: string;
    sidebarBackground: string;
    fontFamily: string;
  },
>(settings: T): T {
  const untouched =
    settings.themePreset === "store-emerald" &&
    settings.primaryColor.toLowerCase() === LEGACY_EMERALD.primary &&
    settings.backgroundColor.toLowerCase() === LEGACY_EMERALD.background;
  if (!untouched) return settings;
  const modern = STORE_THEMES[0].colors;
  return {
    ...settings,
    primaryColor: modern.primary,
    accentColor: modern.accent,
    backgroundColor: modern.background,
    surfaceColor: modern.surface,
    productCardBackground: modern.card,
    productCardBorder: modern.border,
    sidebarBackground: modern.background,
    fontFamily: settings.fontFamily === "Tajawal" ? MODERN_FONT_FAMILY : settings.fontFamily,
  };
}

/* ───────────── Homepage sections ───────────── */

export type HomepageSectionKind =
  | "carousel"
  | "squareBanners"
  | "quickLinks"
  | "brands"
  | "reviews"
  | "featured"
  | "categories"
  | "productTabs"
  | "latest"
  | "trust"
  | "about"
  | "wideBanner"
  | "customReviews"
  | "enhancedCarousel"
  | "animatedProducts"
  | "animatedProductsBg"
  | "storeFeatures"
  | "fixedProducts"
  | "itemList";

export type HomepageSectionItem = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mediaType: "image" | "video";
  href: string;
};

export type HomepageSection = {
  id: string;
  kind: HomepageSectionKind;
  title: string;
  subtitle: string;
  enabled: boolean;
  items: HomepageSectionItem[];
};

export const SECTION_KIND_META: Readonly<
  Record<HomepageSectionKind, { label: string; icon: string; description: string }>
> = Object.freeze({
  carousel: { label: "صور متحركة", icon: "▣", description: "سلايدر صور رئيسية مع رابط لكل بانر" },
  squareBanners: { label: "صور مربعة", icon: "▦", description: "شبكة بانرات مربعة قابلة للنقر" },
  quickLinks: { label: "روابط سريعة", icon: "↗", description: "اختصارات لأقسام وصفحات المتجر" },
  brands: { label: "الماركات التجارية", icon: "◇", description: "شريط شعارات وروابط الماركات" },
  reviews: { label: "آراء العملاء", icon: "★", description: "آراء وتقييمات العملاء" },
  featured: { label: "العروض الأكثر مبيعاً", icon: "🔥", description: "منتجات مميزة من الكتالوج" },
  categories: { label: "أقسام المتجر", icon: "▤", description: "أقسام منتجات المتجر" },
  productTabs: { label: "منتجات جاهزة وحسب الطلب", icon: "☷", description: "تبويبات المنتجات والحجوزات" },
  latest: { label: "أحدث المنتجات", icon: "✦", description: "آخر المنتجات التي أضيفت" },
  trust: { label: "مميزات المتجر", icon: "✓", description: "التوصيل، خدمة العملاء، والدفع الآمن" },
  about: { label: "هوية المتجر", icon: "♥", description: "نبذة المتجر والوثيقة وبيانات التواصل" },
  wideBanner: { label: "بانر عريض", icon: "▰", description: "صورة عريضة أو فيديو مع رابط" },
  customReviews: { label: "آراء عملاء مخصصة", icon: "★", description: "أضف أسماء العملاء وآراءهم وتقييمهم" },
  enhancedCarousel: { label: "صور متحركة (محسنة)", icon: "▣", description: "سلايدر محسّن مع صور وروابط" },
  animatedProducts: { label: "منتجات متحركة", icon: "▤", description: "شريط منتجات أفقي متحرك" },
  animatedProductsBg: { label: "منتجات متحركة مع خلفية", icon: "▧", description: "شريط منتجات على خلفية ملونة" },
  storeFeatures: { label: "مميزات المتجر", icon: "✓", description: "مزايا وشارات الثقة للمتجر" },
  fixedProducts: { label: "منتجات ثابتة", icon: "▦", description: "شبكة منتجات ثابتة في الصفحة الرئيسية" },
  itemList: { label: "قائمة عناصر", icon: "☷", description: "قائمة روابط أو عناصر مخصصة" },
});

export const DEFAULT_HOMEPAGE_SECTIONS: readonly HomepageSection[] = Object.freeze([
  { id: "hero", kind: "carousel", title: "صور متحركة", subtitle: "عشاك جاهز من أهل الكرم", enabled: true, items: [] },
  { id: "trust", kind: "trust", title: "مميزات المتجر", subtitle: "تسوق آمن وخدمة تليق بك", enabled: true, items: [] },
  { id: "bestsellers", kind: "featured", title: "العروض الأكثر مبيعاً", subtitle: "اللي الكل يطلبه من أهل الكرم", enabled: true, items: [] },
  { id: "categories", kind: "categories", title: "أقسام المتجر", subtitle: "اختر قسمك المفضل", enabled: true, items: [] },
  { id: "product-tabs", kind: "productTabs", title: "منتجاتنا", subtitle: "جاهز، حسب الطلب، أو حجز لمناسبتك", enabled: true, items: [] },
  { id: "reviews", kind: "reviews", title: "آراء العملاء", subtitle: "كلامهم يكفي", enabled: true, items: [] },
  { id: "latest", kind: "latest", title: "أحدث المنتجات", subtitle: "جديد مطابخ أهل الكرم", enabled: true, items: [] },
  { id: "about", kind: "about", title: "أهل الكرم | عشاك جاهز", subtitle: "كرم كامل لجميع ضيوفك… وعشاك دائم جاهز", enabled: true, items: [] },
  { id: "quick-links", kind: "quickLinks", title: "روابط سريعة", subtitle: "", enabled: false, items: [] },
  { id: "square-banners", kind: "squareBanners", title: "صور مربعة", subtitle: "أقسام أهل الكرم", enabled: false, items: [] },
  { id: "brands", kind: "brands", title: "الماركات التجارية", subtitle: "", enabled: false, items: [] },
  { id: "wide-banner", kind: "wideBanner", title: "بانر عريض", subtitle: "", enabled: false, items: [] },
  { id: "custom-reviews", kind: "customReviews", title: "آراء عملاء مخصصة", subtitle: "آراء عملائنا", enabled: false, items: [] },
  { id: "enhanced-carousel", kind: "enhancedCarousel", title: "صور متحركة (محسنة)", subtitle: "", enabled: false, items: [] },
  { id: "animated-products", kind: "animatedProducts", title: "منتجات متحركة", subtitle: "", enabled: false, items: [] },
  { id: "animated-products-bg", kind: "animatedProductsBg", title: "منتجات متحركة مع خلفية", subtitle: "", enabled: false, items: [] },
  { id: "store-features", kind: "storeFeatures", title: "مميزات المتجر", subtitle: "", enabled: false, items: [] },
  { id: "fixed-products", kind: "fixedProducts", title: "منتجات ثابتة", subtitle: "", enabled: false, items: [] },
  { id: "item-list", kind: "itemList", title: "قائمة عناصر", subtitle: "", enabled: false, items: [] },
] as HomepageSection[]);

const LEGACY_DEFAULT_SECTION_IDS = [
  "hero", "trust", "quick-links", "square-banners", "brands", "bestsellers", "categories", "product-tabs", "reviews", "latest", "about", "wide-banner", "custom-reviews", "enhanced-carousel", "animated-products", "animated-products-bg", "store-features", "fixed-products", "item-list",
];
const LEGACY_DEFAULT_ENABLED_IDS = new Set([
  "hero", "trust", "quick-links", "square-banners", "bestsellers", "categories", "product-tabs", "reviews", "latest", "about",
]);

/* ───────────── URL validation ───────────── */

const MAX_IMAGE_URL_LENGTH = 12_000_000; // allows base64 data URLs
const MAX_HREF_LENGTH = 1000;

/**
 * Allowed: http(s)://, /path, data:image/<type>;base64,...
 * Rejected: javascript:, data:text/html, data:application/... (XSS vectors).
 */
function sanitizeImageUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, MAX_IMAGE_URL_LENGTH);
  if (trimmed === "") return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(trimmed)) return trimmed;
  return "";
}

/**
 * Allowed: http(s)://, /path, #anchor, empty.
 * Rejected: javascript:, data:, vbscript:.
 */
function sanitizeHref(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, MAX_HREF_LENGTH);
  if (trimmed === "") return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("#")) return trimmed;
  return "";
}

/* ───────────── Normalizer ───────────── */

function cloneDefaults(): HomepageSection[] {
  // Return a fresh deep copy every time — callers must not share references
  // with DEFAULT_HOMEPAGE_SECTIONS.
  return DEFAULT_HOMEPAGE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item })),
  }));
}

export function normalizeHomepageSections(input: unknown): HomepageSection[] {
  if (!Array.isArray(input)) return cloneDefaults();

  const validKinds = Object.keys(SECTION_KIND_META) as HomepageSectionKind[];
  const seenSectionIds = new Set<string>();

  const parsed = input.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const kind = String(item.kind ?? "") as HomepageSectionKind;
    if (!validKinds.includes(kind)) return [];

    // Ensure section id is unique.
    let sectionId = typeof item.id === "string" && item.id.trim() !== ""
      ? item.id.trim()
      : `section-${index}`;
    let suffix = 1;
    while (seenSectionIds.has(sectionId)) {
      sectionId = `section-${index}-${suffix++}`;
    }
    seenSectionIds.add(sectionId);

    const items = Array.isArray(item.items)
      ? item.items.flatMap((rawItem, itemIndex) => {
          if (!rawItem || typeof rawItem !== "object") return [];
          const sub = rawItem as Record<string, unknown>;
          const subId = typeof sub.id === "string" && sub.id.trim() !== ""
            ? sub.id.trim()
            : `${sectionId}-${itemIndex}`;
          return [{
            id: subId,
            title: typeof sub.title === "string" ? sub.title.slice(0, 100) : "",
            subtitle: typeof sub.subtitle === "string" ? sub.subtitle.slice(0, 180) : "",
            imageUrl: sanitizeImageUrl(sub.imageUrl),
            mediaType: sub.mediaType === "video" ? ("video" as const) : ("image" as const),
            href: sanitizeHref(sub.href),
          }];
        })
      : [];

    return [{
      id: sectionId,
      kind,
      title: typeof item.title === "string" ? item.title.slice(0, 100) : SECTION_KIND_META[kind].label,
      subtitle: typeof item.subtitle === "string" ? item.subtitle.slice(0, 180) : "",
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      items,
    }];
  });

  if (!parsed.length) return cloneDefaults();

  // One-time migration: legacy default layout that had quick-links & square-banners
  // mistakenly enabled. Preserve user's custom edits by only applying when the
  // layout exactly matches the legacy default.
  const isLegacyDefault =
    parsed.length === LEGACY_DEFAULT_SECTION_IDS.length &&
    parsed.every((section, index) => section.id === LEGACY_DEFAULT_SECTION_IDS[index]) &&
    parsed.every((section) => section.enabled === LEGACY_DEFAULT_ENABLED_IDS.has(section.id));

  if (!isLegacyDefault) return parsed;

  const defaultOrder = new Map(DEFAULT_HOMEPAGE_SECTIONS.map((section, index) => [section.id, index]));
  return parsed
    .map((section) =>
      section.id === "quick-links" || section.id === "square-banners"
        ? { ...section, enabled: false }
        : section,
    )
    .sort((left, right) => (defaultOrder.get(left.id) ?? 0) - (defaultOrder.get(right.id) ?? 0));
}