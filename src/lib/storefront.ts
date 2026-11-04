/**
 * storefront.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. Object.freeze على كل الثوابت (يمنع التعديل العرضي).
 *   2. whatsappLink يُنظّف رقم الجوال (يحذف +/مسافات/رموز).
 *   3. sortForStore بأقواس صريحة (وضوح بدون تغيير سلوك).
 *
 * ⚠️ ملاحظة معمارية:
 *   BRAND / STORE_CATEGORY_LINKS / TESTIMONIALS هي قيم *hardcoded* تكرّر
 *   بيانات موجودة أيضاً في storeSettings و categories و showReviews (DB).
 *   أي تعديل من لوحة التحكم لا ينعكس على هذه الثوابت. الحل الأمثل مستقبلاً:
 *   جعلها دوال async تقرأ من admin-data.getStoreSettings() / getStoreCategories().
 *   لم يُفعَّل الآن لأنه يتطلب تعديل كل من يستورد BRAND.
 */

import type { ProductDTO } from "./types";

/* ───────────── Brand ───────────── */

export const BRAND = Object.freeze({
  name: "أهل الكرم",
  tagline: "عشاك جاهز",
  phone: "+966500748221",
  phoneDisplay: "+966 50 074 8221",
  email: "waaaa2048@gmail.com",
  freeDoc: "FL-621217211",
  whatsapp: "966500748221",
  address: "الرياض · حي الملقا · طريق الأمير محمد بن سلمان",
  hours: "يومياً ٩:٠٠ ص — ١٢:٠٠ م",
  about:
    "نختصر عليك مشوار الملحمة والمطبخ! أجود الذبائح الطازجة نختارها بعناية، ونطبخها لك على أصولها، وتجيك لحدك حارة وجاهزة تبيّض وجهك قدام ضيوفك.",
});

/* ───────────── Categories ───────────── */

export type StoreCategory = {
  label: string;
  slug: string;
  image: string;
  blurb: string;
  highlight?: boolean;
};

export const STORE_CATEGORY_LINKS: readonly StoreCategory[] = Object.freeze([
  {
    label: "العروض الأكثر مبيعاً",
    slug: "العروض الأكثر مبيعاً",
    image:
      "https://images.pexels.com/photos/4899799/pexels-photo-4899799.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=900",
    blurb: "الوجبات اللي الكل يطلبها",
    highlight: true,
  },
  {
    label: "قسم النعيمي الكشميري",
    slug: "النعيمي الكشميري",
    image:
      "https://images.pexels.com/photos/34951088/pexels-photo-34951088.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=900",
    blurb: "نعيمي كشميري طازج ١٠٠٪",
  },
  {
    label: "قسم التيس الكشميري",
    slug: "التيس الكشميري",
    image:
      "https://images.pexels.com/photos/16015723/pexels-photo-16015723.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=900",
    blurb: "تيس كشميري خفيف الهضم",
  },
  {
    label: "قسم الخروف البربري",
    slug: "الخروف البربري",
    image:
      "https://images.pexels.com/photos/20150381/pexels-photo-20150381.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=900",
    blurb: "لحم أحمر غني النكهة",
  },
]);

/* ───────────── Social proof ───────────── */

export const TESTIMONIALS = Object.freeze([
  {
    name: "ندى الحسيني",
    initials: "ن ح",
    quote: "الذبيحة وصلت حارة والرز ما شاء الله عليه، ضيوفي ما صدقوا إنها طلبية!",
    role: "عميلة · الرياض",
  },
  {
    name: "خالد الأحمد",
    initials: "خ أ",
    quote: "اشتريت من هنا لعيالي وصراحة شئ لا يعلى عليه",
    role: "عميل · الرياض",
  },
  {
    name: "خالد المسعودي",
    initials: "خ م",
    quote: "طلبت مفطح لعزيمة العائلة، التوصيل قبل الموعد والطعم ممتاز والله يبارك.",
    role: "عميل · الرياض",
  },
  {
    name: "عبدالعزيز اليامي",
    initials: "ع ي",
    quote: "التعامل راقي والتقطيع والتغليف نظيف جداً، صار بيتنا الأول للذبائح.",
    role: "عميل · الرياض",
  },
]);

/* ───────────── Trust + features ───────────── */

export const TRUST_ITEMS = Object.freeze([
  { title: "تسوق آمن", text: "استمتع بتجربة آمنة وخصوصية تامة", icon: "shield" },
  { title: "خدمة العملاء", text: "تواصل معنا في أي وقت", icon: "headset" },
  { title: "شحن سريع", text: "استلم طلبك في وقت قياسي", icon: "truck" },
  { title: "دفع مرن", text: "تابي · تمارا · كاش · شبكة", icon: "wallet" },
] as const);

export const PRODUCT_FEATURES = Object.freeze([
  { emoji: "🚚", title: "خيارات توصيل", text: "فوري أو مجدول داخل الرياض" },
  { emoji: "🩺", title: "ضمان صحي", text: "فحص بيطري دقيق لكل ذبيحة قبل الطبخ" },
  { emoji: "⏱️", title: "طلب مسبق", text: "اطلب قبل موعد عزيمتك بـ ٣ — ٤ ساعات" },
  { emoji: "💳", title: "قسّطها براحتك", text: "٤ دفعات عبر تابي أو تمارا بدون فوائد" },
]);

export const PAYMENT_BADGES = Object.freeze([
  "مدى",
  "فيزا",
  "ماستركارد",
  "تابي",
  "تمارا",
  "Apple Pay",
]);

export const KIND_TABS = Object.freeze([
  { value: "ready", label: "منتج جاهز" },
  { value: "custom", label: "خدمة حسب الطلب" },
  { value: "booking", label: "حجوزات" },
] as const);

/* ───────────── Helpers ───────────── */

/**
 * Sorts products for the storefront:
 *   1. Featured products first.
 *   2. In-stock before out-of-stock.
 *   3. Newest first (higher id).
 *
 * Returns a NEW array — never mutates the input.
 */
export function sortForStore(products: ProductDTO[]): ProductDTO[] {
  return [...products].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;

    const aOutOfStock = a.stock === 0;
    const bOutOfStock = b.stock === 0;
    if (aOutOfStock !== bOutOfStock) return aOutOfStock ? 1 : -1;

    return b.id - a.id;
  });
}

export function getStoreProductPath(pathname: string, productId: number): string {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const rootRoutes = new Set([
    "products",
    "checkout",
    "account",
    "customer",
    "admin",
    "dashboard",
    "download",
    "staff",
    "register",
  ]);
  return firstSegment && !rootRoutes.has(firstSegment)
    ? `/${firstSegment}/products/${productId}`
    : `/products/${productId}`;
}

/**
 * Builds a WhatsApp click-to-chat link.
 * Sanitizes the phone number (wa.me requires digits only — no +, spaces, or dashes).
 */
export function whatsappLink(message: string): string {
  const digits = BRAND.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}