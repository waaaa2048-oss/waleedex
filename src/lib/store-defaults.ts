/**
 * store-defaults.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. DEFAULT_SETTINGS.appDownloadSettings = structuredClone(...)
 *      (إصلاح bug: مشاركة المراجع مع DEFAULT_APP_DOWNLOAD_SETTINGS).
 *   2. DEFAULT_SETTINGS.homepageSections = structuredClone(...).
 *   3. Object.freeze على DEFAULT_APP_DOWNLOAD_SETTINGS.
 *   4. TEXT_LIMITS map بدل ternary متسلسل.
 *   5. updatedAt = "1970-01-01T00:00:00.000Z" (كان new Date() عند تحميل الوحدة).
 */

import {
  STORE_THEMES,
  DEFAULT_HOMEPAGE_SECTIONS,
  type HomepageSection,
  type ThemePresetId,
} from "./theme-config";

/* ───────────── App Download Settings ───────────── */

export type DownloadPlatformSettings = {
  visible: boolean;
  title: string;
  icon: string;
  steps: string[];
};

export type AppDownloadSettings = {
  showHero: boolean;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  showControls: boolean;
  showInstallButton: boolean;
  showUpdateButton: boolean;
  installButtonText: string;
  updateButtonText: string;
  updateReadyText: string;
  showControlsDescription: boolean;
  controlsDescription: string;
  showIdentity: boolean;
  identityCaption: string;
  showSingleApp: boolean;
  singleAppTitle: string;
  singleAppDescription: string;
  platformsBadge: string;
  showManagementCard: boolean;
  managementTitle: string;
  managementDescription: string;
  managementLinkText: string;
  showPlatformGuide: boolean;
  platforms: Record<"android" | "ios" | "windows", DownloadPlatformSettings>;
  showUpdates: boolean;
  updatesTitle: string;
  updatesDescription: string;
  showFooterLinks: boolean;
  homeLinkText: string;
  accountLinkText: string;
};

type DownloadTextKey = {
  [K in keyof AppDownloadSettings]: AppDownloadSettings[K] extends string ? K : never;
}[keyof AppDownloadSettings];

/**
 * Max length per text field. Long-form descriptions get more room.
 * Any field not listed here uses DEFAULT_TEXT_LIMIT.
 */
const DEFAULT_TEXT_LIMIT = 240;
const TEXT_LIMITS: Partial<Record<DownloadTextKey, number>> = {
  heroDescription: 1500,
  singleAppDescription: 1500,
  managementDescription: 1500,
  updatesDescription: 1500,
  controlsDescription: 1500,
};

export const DEFAULT_APP_DOWNLOAD_SETTINGS: AppDownloadSettings = Object.freeze({
  showHero: true,
  heroBadge: "تطبيق متجر ويب قابل للتثبيت",
  heroTitle: "ثبّت تطبيق {storeName} على جهازك",
  heroDescription:
    "تطبيق واحد قابل للتثبيت على Android وiPhone وWindows. يتصل مباشرة بمتجرك، وتصل إليه تغييرات المنتجات والتصميم بعد حفظها ونشرها.",
  showControls: true,
  showInstallButton: true,
  showUpdateButton: true,
  installButtonText: "تثبيت التطبيق على الجهاز",
  updateButtonText: "التحقق من وجود تحديثات",
  updateReadyText: "تحديث متاح — طبّق الآن",
  showControlsDescription: true,
  controlsDescription:
    "التطبيق يُثبّت على الكمبيوتر أو الجوال كتطبيق ويب، والتحديثات تصل تلقائياً بعد النشر.",
  showIdentity: true,
  identityCaption: "متجر · تطبيق · حساب موحد",
  showSingleApp: true,
  singleAppTitle: "تطبيق واحد لكل الأجهزة",
  singleAppDescription:
    "لا تحتاج إلى ملفات APK أو EXE منفصلة؛ ثبّت نسخة المتجر نفسها من المتصفح على جهازك.",
  platformsBadge: "Android · iPhone · Windows",
  showManagementCard: true,
  managementTitle: "تتحكم بالتطبيق من لوحة المتجر",
  managementDescription:
    "عدّل الاسم والشعار والألوان والأقسام والمنتجات من إعدادات المتجر؛ ستظهر تغييرات المتجر داخل التطبيق. قد يتطلب تحديث الاسم أو الأيقونة على شاشة الجهاز إزالة التطبيق وإعادة تثبيته.",
  managementLinkText: "إدارة التطبيق والمتجر",
  showPlatformGuide: true,
  platforms: {
    android: {
      visible: true,
      title: "Android",
      icon: "📱",
      steps: [
        "افتح رابط التنزيل في Chrome.",
        "اضغط «تثبيت التطبيق» أو القائمة ⋮ ثم «تثبيت التطبيق».",
        "سيظهر رمز التطبيق على الشاشة الرئيسية.",
      ],
    },
    ios: {
      visible: true,
      title: "iPhone / iPad",
      icon: "🍎",
      steps: [
        "افتح الرابط في Safari.",
        "اضغط زر المشاركة ⬆ ثم «إضافة إلى الشاشة الرئيسية».",
        "اضغط «إضافة» لفتح التطبيق بملء الشاشة.",
      ],
    },
    windows: {
      visible: true,
      title: "Windows",
      icon: "💻",
      steps: [
        "افتح رابط المتجر في Edge أو Chrome.",
        "اضغط أيقونة التثبيت بجانب شريط العنوان، أو زر التثبيت أعلاه.",
        "سيظهر التطبيق في قائمة Start وسطح المكتب.",
      ],
    },
  },
  showUpdates: true,
  updatesTitle: "التحديثات",
  updatesDescription:
    "التطبيق يعرض المتجر مباشرة؛ تغييرات الإدارة تظهر بعد حفظها دون تنزيل APK أو EXE جديد. استخدم زر «التحقق من وجود تحديثات» لتحديث ملفات التطبيق المثبتة عند الحاجة.",
  showFooterLinks: true,
  homeLinkText: "العودة للمتجر",
  accountLinkText: "حسابي",
} as AppDownloadSettings);

/* ───────────── Normalizers ───────────── */

function normalizeDownloadPlatform(
  value: unknown,
  fallback: DownloadPlatformSettings,
): DownloadPlatformSettings {
  const item = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawSteps = Array.isArray(item.steps) ? item.steps : [];
  return {
    visible: typeof item.visible === "boolean" ? item.visible : fallback.visible,
    title: typeof item.title === "string" ? item.title.slice(0, 120) : fallback.title,
    icon: typeof item.icon === "string" ? item.icon.slice(0, 12) : fallback.icon,
    steps: fallback.steps.map((step, index) =>
      typeof rawSteps[index] === "string" ? (rawSteps[index] as string).slice(0, 500) : step,
    ),
  };
}

export function normalizeAppDownloadSettings(value: unknown): AppDownloadSettings {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const text = (key: DownloadTextKey): string => {
    const fallback = DEFAULT_APP_DOWNLOAD_SETTINGS[key];
    const limit = TEXT_LIMITS[key] ?? DEFAULT_TEXT_LIMIT;
    return typeof input[key] === "string" ? (input[key] as string).slice(0, limit) : fallback;
  };

  const platforms =
    input.platforms && typeof input.platforms === "object"
      ? (input.platforms as Record<string, unknown>)
      : {};

  return {
    showHero: typeof input.showHero === "boolean" ? input.showHero : DEFAULT_APP_DOWNLOAD_SETTINGS.showHero,
    heroBadge: text("heroBadge"),
    heroTitle: text("heroTitle"),
    heroDescription: text("heroDescription"),
    showControls:
      typeof input.showControls === "boolean" ? input.showControls : DEFAULT_APP_DOWNLOAD_SETTINGS.showControls,
    showInstallButton:
      typeof input.showInstallButton === "boolean"
        ? input.showInstallButton
        : DEFAULT_APP_DOWNLOAD_SETTINGS.showInstallButton,
    showUpdateButton:
      typeof input.showUpdateButton === "boolean"
        ? input.showUpdateButton
        : DEFAULT_APP_DOWNLOAD_SETTINGS.showUpdateButton,
    installButtonText: text("installButtonText"),
    updateButtonText: text("updateButtonText"),
    updateReadyText: text("updateReadyText"),
    showControlsDescription:
      typeof input.showControlsDescription === "boolean"
        ? input.showControlsDescription
        : DEFAULT_APP_DOWNLOAD_SETTINGS.showControlsDescription,
    controlsDescription: text("controlsDescription"),
    showIdentity:
      typeof input.showIdentity === "boolean" ? input.showIdentity : DEFAULT_APP_DOWNLOAD_SETTINGS.showIdentity,
    identityCaption: text("identityCaption"),
    showSingleApp:
      typeof input.showSingleApp === "boolean" ? input.showSingleApp : DEFAULT_APP_DOWNLOAD_SETTINGS.showSingleApp,
    singleAppTitle: text("singleAppTitle"),
    singleAppDescription: text("singleAppDescription"),
    platformsBadge: text("platformsBadge"),
    showManagementCard:
      typeof input.showManagementCard === "boolean"
        ? input.showManagementCard
        : DEFAULT_APP_DOWNLOAD_SETTINGS.showManagementCard,
    managementTitle: text("managementTitle"),
    managementDescription: text("managementDescription"),
    managementLinkText: text("managementLinkText"),
    showPlatformGuide:
      typeof input.showPlatformGuide === "boolean"
        ? input.showPlatformGuide
        : DEFAULT_APP_DOWNLOAD_SETTINGS.showPlatformGuide,
    platforms: {
      android: normalizeDownloadPlatform(platforms.android, DEFAULT_APP_DOWNLOAD_SETTINGS.platforms.android),
      ios: normalizeDownloadPlatform(platforms.ios, DEFAULT_APP_DOWNLOAD_SETTINGS.platforms.ios),
      windows: normalizeDownloadPlatform(platforms.windows, DEFAULT_APP_DOWNLOAD_SETTINGS.platforms.windows),
    },
    showUpdates:
      typeof input.showUpdates === "boolean" ? input.showUpdates : DEFAULT_APP_DOWNLOAD_SETTINGS.showUpdates,
    updatesTitle: text("updatesTitle"),
    updatesDescription: text("updatesDescription"),
    showFooterLinks:
      typeof input.showFooterLinks === "boolean"
        ? input.showFooterLinks
        : DEFAULT_APP_DOWNLOAD_SETTINGS.showFooterLinks,
    homeLinkText: text("homeLinkText"),
    accountLinkText: text("accountLinkText"),
  };
}

/* ───────────── Store Settings Type ───────────── */

export type StoreSettings = {
  appDownloadSettings: AppDownloadSettings;
  storeName: string;
  tagline: string;
  announcement: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  backgroundPattern: string;
  surfaceColor: string;
  primaryColor: string;
  accentColor: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  workingHours: string;
  about: string;
  freeDocNumber: string;
  instagram: string | null;
  snapchat: string | null;
  tiktok: string | null;
  freeDelivery: boolean;
  minOrder: number;
  deliveryFee: number;
  prepHours: number;
  taxRate: number;
  codEnabled: boolean;
  applePayEnabled: boolean;
  moyasarEnabled: boolean;
  bankTransferEnabled: boolean;
  bankName: string;
  bankAccountName: string;
  bankIban: string;
  madaEnabled: boolean;
  tabbyEnabled: boolean;
  tamaraEnabled: boolean;
  showReviews: boolean;
  showFeatured: boolean;
  themePreset: ThemePresetId;
  logoUrl: string | null;
  faviconUrl: string | null;
  fontFamily: string;
  fontUrl: string | null;
  fontWeight: string;
  useArabicNumbers: boolean;
  showBreadcrumbs: boolean;
  uniformProductHeights: boolean;
  autoPlayCarousel: boolean;
  enhancedCartToast: boolean;
  autoLoadMore: boolean;
  themeAnimations: boolean;
  loadingPageEnabled: boolean;
  loaderImageUrl: string | null;
  loaderBackgroundColor: string;
  loaderLogoSize: number;
  loaderDuration: number;
  loaderSkipButton: boolean;
  loaderAllPages: boolean;
  topBarDark: boolean;
  mobileSidebarDark: boolean;
  footerDark: boolean;
  headerMobileLogoRight: boolean;
  mobileBackButton: boolean;
  enlargedHeaderIcons: boolean;
  bottomNavEnabled: boolean;
  sidebarBackground: string;
  hideUsefulLinks: boolean;
  hideCustomerService: boolean;
  announcementAutoHide: boolean;
  announcementSlide: boolean;
  floatingAnnouncement: boolean;
  announcementIcon: string;
  announcementTextColor: string;
  customerChannelsEnabled: boolean;
  freeDocVisible: boolean;
  storeAppVisible: boolean;
  productCardBackground: string;
  productCardBorder: string;
  promoTitleBackground: string;
  productImageRatio: number;
  productCardRadius: string;
  customCss: string;
  productAddIcon: string;
  quickProductView: boolean;
  wishlistVisible: boolean;
  hideProductFrame: boolean;
  hideDiscountBadge: boolean;
  hideProductBackground: boolean;
  boldProductTitle: boolean;
  oneLineProductTitle: boolean;
  centeredProductText: boolean;
  hideOutOfStockButton: boolean;
  hideAddToCart: boolean;
  hideWishlistButton: boolean;
  hideProductRatings: boolean;
  hideProductCategory: boolean;
  shineProductCard: boolean;
  homepageSections: HomepageSection[];
  customDomain: string | null;
  domainStatus: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt: string;
};

/* ───────────── Default Settings ───────────── */

export const DEFAULT_SETTINGS: StoreSettings = {
  appDownloadSettings: structuredClone(DEFAULT_APP_DOWNLOAD_SETTINGS),
  storeName: "أهل الكرم",
  tagline: "عشاك جاهز",
  announcement:
    "توصيل داخل الرياض بخيارات تناسب موعدك · اطلب قبل عزيمتك بـ ٤ ساعات",
  heroTitle: "عشاك جاهز من أهل الكرم",
  heroSubtitle:
    "نختصر عليك مشوار الملحمة والمطبخ! أجود الذبائح الطازجة نختارها بعناية، ونطبخها لك على أصولها، وتجيك لحدك حارة وجاهزة تبيّض وجهك قدام ضيوفك.",
  heroImageUrl:
    "https://images.pexels.com/photos/36850048/pexels-photo-36850048.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1200",
  backgroundColor: "#fdfbf7",
  backgroundImageUrl: null,
  backgroundPattern: "none",
  surfaceColor: "#f8f5f0",
  primaryColor: "#6b3e26",
  accentColor: "#d4a359",
  phone: "+966500748221",
  email: "waaaa2048@gmail.com",
  whatsapp: "966500748221",
  address: "",
  workingHours: "يومياً ٩:٠٠ ص — ١٢:٠٠ م",
  about:
    "أهل الكرم | عشاك جاهز — نختار أجود الذبائح الطازجة ونطبخها على أصولها، ونوصلها لك حارة وجاهزة لتبيّض وجهك قدام ضيوفك.",
  freeDocNumber: "FL-621217211",
  instagram: "ahlalkaram",
  snapchat: null,
  tiktok: null,
  freeDelivery: true,
  minOrder: 0,
  deliveryFee: 0,
  prepHours: 4,
  taxRate: 15,
  codEnabled: false,
  applePayEnabled: false,
  moyasarEnabled: false,
  bankTransferEnabled: true,
  bankName: "",
  bankAccountName: "",
  bankIban: "",
  madaEnabled: false,
  tabbyEnabled: false,
  tamaraEnabled: false,
  showReviews: true,
  showFeatured: true,
  themePreset: "store-emerald",
  logoUrl: null,
  faviconUrl: null,
  fontFamily: "Tajawal",
  fontUrl: null,
  fontWeight: "400,500,700,800",
  useArabicNumbers: true,
  showBreadcrumbs: true,
  uniformProductHeights: true,
  autoPlayCarousel: true,
  enhancedCartToast: true,
  autoLoadMore: false,
  themeAnimations: true,
  loadingPageEnabled: true,
  loaderImageUrl: null,
  loaderBackgroundColor: "#ffffff",
  loaderLogoSize: 100,
  loaderDuration: 2,
  loaderSkipButton: true,
  loaderAllPages: false,
  topBarDark: false,
  mobileSidebarDark: false,
  footerDark: false,
  headerMobileLogoRight: true,
  mobileBackButton: false,
  enlargedHeaderIcons: false,
  bottomNavEnabled: false,
  sidebarBackground: "#fdfbf7",
  hideUsefulLinks: false,
  hideCustomerService: false,
  announcementAutoHide: false,
  announcementSlide: false,
  floatingAnnouncement: false,
  announcementIcon: "✦",
  announcementTextColor: "#ffffff",
  customerChannelsEnabled: true,
  freeDocVisible: true,
  storeAppVisible: true,
  productCardBackground: "#fdfbf7",
  productCardBorder: "#e8dfd5",
  promoTitleBackground: "#d4a359",
  productImageRatio: 9,
  productCardRadius: "rounded",
  customCss: "",
  productAddIcon: "plus",
  quickProductView: true,
  wishlistVisible: true,
  hideProductFrame: false,
  hideDiscountBadge: false,
  hideProductBackground: false,
  boldProductTitle: true,
  oneLineProductTitle: false,
  centeredProductText: false,
  hideOutOfStockButton: false,
  hideAddToCart: false,
  hideWishlistButton: false,
  hideProductRatings: false,
  hideProductCategory: false,
  shineProductCard: true,
  homepageSections: structuredClone(DEFAULT_HOMEPAGE_SECTIONS) as HomepageSection[],
  customDomain: null,
  domainStatus: "none",
  maintenanceMode: false,
  maintenanceMessage: "نعتذر، المتجر مغلق مؤقتاً للصيانة. نرجع لكم قريباً بإذن الله.",
  updatedAt: "1970-01-01T00:00:00.000Z",
};

/* ───────────── UI Constants ───────────── */

export const BACKGROUND_PATTERNS = [
  { value: "none", label: "بدون نقشة" },
  { value: "dots", label: "نقاط ناعمة" },
  { value: "grid", label: "شبكة خفيفة" },
  { value: "diagonal", label: "خطوط مائلة" },
] as const;

export const STORE_THEME_PRESETS = STORE_THEMES;