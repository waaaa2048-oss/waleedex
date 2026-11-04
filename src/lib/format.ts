/**
 * format.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. formatDate / formatDateTime تعرض الآن الهجري + الميلادي معًا.
 *   2. إضافة formatHijri / formatGregorian للاستخدام المنفصل.
 *   3. إضافة FormatDateOptions (calendar / numerals / compact).
 * كل ما تبقّى من الملف لم يتغيّر.
 */

export const CURRENCY = "ر.س";

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatMoney(value: number): string {
  return `${formatNumber(Math.round(value * 100) / 100, value % 1 === 0 ? 0 : 2)} ${CURRENCY}`;
}

export function publicProductDescription(description: string): string {
  return description.replace(
    /تقسيط مريح على ٤ دفعات عبر تابي أو تمارا بدون أي فوائد|تقسيط على ٤ دفعات عبر تابي(?: أو| و)تمارا|دفع كاش أو شبكة أو تقسيط عبر تابي وتمارا|دفع كاش أو شبكة أو تقسيط|تقسيط عبر تابي(?: أو| و)تمارا|خيارات دفع متعددة/g,
    "طرق الدفع المتاحة تظهر عند إتمام الطلب",
  );
}

export function formatWeight(value: number): string {
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} كجم`;
}

/* ───────────── Dates (Hijri + Gregorian) ───────────── */

export type DateCalendar = "both" | "hijri" | "gregory";

export type FormatDateOptions = {
  calendar?: DateCalendar;        // default: "both"
  numerals?: "latn" | "arab";     // default: "arab" (نفس أرقام formatNumber)
  compact?: boolean;              // default: false
};

const HIJRI_CALENDAR = "islamic-umalqura";
const GREGORIAN_CALENDAR = "gregory";

function dateLocale(calendar: string, numerals: "latn" | "arab"): string {
  return `ar-SA-u-ca-${calendar}-nu-${numerals}`;
}

function safeFormat(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    // Fallback إن لم يدعم نظام التشغيل تقويم أم القرى.
    const base = locale.split("-u-")[0] || "ar-SA";
    return new Intl.DateTimeFormat(base, options).format(date);
  }
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatHijri(
  value: string | Date | null | undefined,
  options: FormatDateOptions = {},
): string {
  const { numerals = "arab", compact = false } = options;
  const date = toDate(value);
  if (!date) return "—";
  const dateOpts = compact
    ? ({ day: "2-digit", month: "2-digit", year: "numeric" } as const)
    : ({ day: "numeric", month: "long", year: "numeric" } as const);
  return `${safeFormat(date, dateLocale(HIJRI_CALENDAR, numerals), dateOpts)} هـ`;
}

export function formatGregorian(
  value: string | Date | null | undefined,
  options: FormatDateOptions = {},
): string {
  const { numerals = "arab", compact = false } = options;
  const date = toDate(value);
  if (!date) return "—";
  const dateOpts = compact
    ? ({ day: "2-digit", month: "2-digit", year: "numeric" } as const)
    : ({ day: "numeric", month: "long", year: "numeric" } as const);
  return `${safeFormat(date, dateLocale(GREGORIAN_CALENDAR, numerals), dateOpts)} م`;
}

export function formatDate(
  value: string | Date | null | undefined,
  options: FormatDateOptions = {},
): string {
  const { calendar = "both" } = options;
  if (calendar === "hijri") return formatHijri(value, options);
  if (calendar === "gregory") return formatGregorian(value, options);
  const hijri = formatHijri(value, options);
  const gregory = formatGregorian(value, options);
  if (hijri === "—" || gregory === "—") return "—";
  return `${hijri} · ${gregory}`;
}

export function formatDateTime(
  value: string | Date | null | undefined,
  options: FormatDateOptions = {},
): string {
  const { calendar = "both", numerals = "arab" } = options;
  const date = toDate(value);
  if (!date) return "—";
  const time = safeFormat(date, `ar-SA-u-nu-${numerals}`, {
    hour: "numeric",
    minute: "2-digit",
  });
  const shortOpts = { day: "numeric", month: "short" } as const;
  const hijri = safeFormat(date, dateLocale(HIJRI_CALENDAR, numerals), shortOpts);
  const gregory = safeFormat(date, dateLocale(GREGORIAN_CALENDAR, numerals), shortOpts);
  if (calendar === "hijri") return `${hijri} هـ · ${time}`;
  if (calendar === "gregory") return `${gregory} م · ${time}`;
  return `${hijri} هـ · ${gregory} م · ${time}`;
}

/* ───────────── Relative Time ───────────── */

export function relativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.round(hours / 24);
  if (days < 30) return `قبل ${days} يوم`;
  const months = Math.round(days / 30);
  return `قبل ${months} شهر`;
}

/* ───────────── Order Statuses ───────────── */

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "cooking",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

type StatusMeta = {
  label: string;
  short: string;
  badge: string;
  dot: string;
  icon: string;
  description: string;
};

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  new: {
    label: "طلب جديد",
    short: "جديد",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    icon: "✦",
    description: "بانتظار التأكيد من فريق المبيعات",
  },
  confirmed: {
    label: "مؤكد",
    short: "مؤكد",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    icon: "✓",
    description: "تم تأكيد الطلب وبدء التجهيز",
  },
  preparing: {
    label: "قيد التجهيز",
    short: "تجهيز",
    badge: "bg-violet-50 text-violet-800 ring-violet-200",
    dot: "bg-violet-500",
    icon: "◐",
    description: "جاري الذبح والتقطيع حسب الطلب",
  },
  cooking: {
    label: "على النار",
    short: "طبخ",
    badge: "bg-orange-50 text-orange-800 ring-orange-200",
    dot: "bg-orange-500",
    icon: "🔥",
    description: "الطلب في المطبخ للطبخ والعشاء",
  },
  ready: {
    label: "جاهز",
    short: "جاهز",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    icon: "◉",
    description: "جاهز للاستلام أو التوصيل",
  },
  delivered: {
    label: "تم التسليم",
    short: "مكتمل",
    badge: "bg-teal-50 text-teal-800 ring-teal-200",
    dot: "bg-teal-500",
    icon: "✓",
    description: "تم تسليم الطلب للعميل",
  },
  cancelled: {
    label: "ملغي",
    short: "ملغي",
    badge: "bg-stone-100 text-stone-600 ring-stone-200",
    dot: "bg-stone-400",
    icon: "✕",
    description: "تم إلغاء الطلب",
  },
};

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[(status as OrderStatus) ?? "new"] ?? STATUS_META.new;
}

/* ───────────── Catalog Constants ───────────── */

export const ANIMAL_TYPES = ["عام", "خروف", "تيس", "حاشي", "لحم مفروم"] as const;
export type AnimalType = (typeof ANIMAL_TYPES)[number];

export const STORE_CATEGORIES = [
  "النعيمي الكشميري",
  "التيس الكشميري",
  "الخروف البربري",
  "الحاشي واللحوم",
  "العروض الأكثر مبيعاً",
] as const;

export const PRODUCT_KINDS = ["ready", "custom", "booking"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const KIND_META: Record<ProductKind, { label: string; hint: string; badge: string }> = {
  ready: {
    label: "منتج جاهز",
    hint: "يُحضّر ويوصل في نفس اليوم",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  custom: {
    label: "خدمة حسب الطلب",
    hint: "يُجهّز حسب طلبك وموعدك",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  booking: {
    label: "حجوزات",
    hint: "حجز مسبق للمناسبات الكبيرة",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
  },
};

export const ANIMAL_META: Record<string, { emoji: string; chip: string; ring: string }> = {
  عام: { emoji: "📦", chip: "bg-sky-50 text-sky-800", ring: "ring-sky-200" },
  خروف: { emoji: "🐑", chip: "bg-amber-50 text-amber-800", ring: "ring-amber-200" },
  تيس: { emoji: "🐐", chip: "bg-lime-50 text-lime-800", ring: "ring-lime-200" },
  حاشي: { emoji: "🐪", chip: "bg-orange-50 text-orange-800", ring: "ring-orange-200" },
  "لحم مفروم": { emoji: "🥩", chip: "bg-rose-50 text-rose-800", ring: "ring-rose-200" },
};

export function animalMeta(type: string) {
  return ANIMAL_META[type] ?? ANIMAL_META["عام"];
}

export const SERVICE_TYPES = ["عام", "خدمة", "اشتراك", "صيانة", "تركيب", "استشارة", "طبخ", "عشاء", "تقطيع", "توصيل"] as const;

export const SERVICE_META: Record<string, { emoji: string; tint: string }> = {
  عام: { emoji: "✦", tint: "from-sky-500/15 to-blue-500/5" },
  خدمة: { emoji: "◈", tint: "from-violet-500/15 to-indigo-500/5" },
  اشتراك: { emoji: "↻", tint: "from-indigo-500/15 to-sky-500/5" },
  صيانة: { emoji: "⚙️", tint: "from-stone-500/15 to-slate-500/5" },
  تركيب: { emoji: "🛠️", tint: "from-amber-500/15 to-orange-500/5" },
  استشارة: { emoji: "💬", tint: "from-cyan-500/15 to-blue-500/5" },
  طبخ: { emoji: "🔥", tint: "from-orange-500/15 to-amber-500/5" },
  عشاء: { emoji: "🍽️", tint: "from-emerald-500/15 to-teal-500/5" },
  تقطيع: { emoji: "🔪", tint: "from-stone-500/15 to-stone-400/5" },
  توصيل: { emoji: "🚚", tint: "from-sky-500/15 to-indigo-500/5" },
};

/* ───────────── Payment / Fulfillment ───────────── */

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "نقدي",
  transfer: "تحويل بنكي",
  tabby: "تابي",
  card: "شبكة / بطاقة",
  online: "دفع إلكتروني",
};

export const FULFILLMENT_META: Record<string, { label: string; emoji: string }> = {
  delivery: { label: "توصيل", emoji: "🚚" },
  pickup: { label: "استلام من المحل", emoji: "🏬" },
};

/* ───────────── Utilities ───────────── */

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}