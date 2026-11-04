import "server-only";
import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import {
  activityLogs,
  categories,
  coupons,
  customers,
  integrations,
  orderItems,
  orderServices,
  orders,
  products,
  productModifiers,
  services,
  stores,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { OWNER_EMAIL, OWNER_NAME, OWNER_PHONE } from "@/lib/credentials";
import type { OrderStatus } from "@/lib/format";
import { MULTI_STORE_SEED } from "@/lib/multi-store";
import { getStoreDemoCatalog } from "@/lib/store-demo-catalog";

const IMAGES = {
  lambPrime:
    "https://images.pexels.com/photos/31120516/pexels-photo-31120516.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  lambHarri:
    "https://images.pexels.com/photos/37936224/pexels-photo-37936224.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  lambSmall:
    "https://images.pexels.com/photos/31647676/pexels-photo-31647676.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  goatBrown:
    "https://images.pexels.com/photos/16015723/pexels-photo-16015723.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  goatDry:
    "https://images.pexels.com/photos/31763367/pexels-photo-31763367.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  goatHerd:
    "https://images.pexels.com/photos/35532805/pexels-photo-35532805.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  camel:
    "https://images.pexels.com/photos/30688194/pexels-photo-30688194.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  roast:
    "https://images.pexels.com/photos/36850048/pexels-photo-36850048.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  grilled:
    "https://images.pexels.com/photos/5175620/pexels-photo-5175620.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  platter:
    "https://images.pexels.com/photos/20150381/pexels-photo-20150381.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
};

const PRODUCT_SEED = [
  {
    name: "خروف نجدي فاخر",
    animalType: "خروف",
    description: "خروف نجدي طازج، عمر ١٠ أشهر، مسمن على الشعير. مثالي للمناسبات والعزائم الكبيرة.",
    weightKg: "48.00",
    pricePerKg: "62.00",
    stock: 9,
    origin: "مزارع القصيم",
    isFeatured: true,
    imageUrl: IMAGES.lambPrime,
  },
  {
    name: "خروف حري بلدي",
    animalType: "خروف",
    description: "خروف حري بلدي بلحم طري ونكهة أصيلة، مع خدمة الذبح والتقطيع المجانية.",
    weightKg: "38.00",
    pricePerKg: "58.00",
    stock: 6,
    origin: "مزارع حائل",
    isFeatured: true,
    imageUrl: IMAGES.lambHarri,
  },
  {
    name: "خروف رومي صغير",
    animalType: "خروف",
    description: "خروف رومي صغير الحجم مناسب للعائلات الصغيرة، وزن مثالي للطبخ الكامل.",
    weightKg: "27.00",
    pricePerKg: "54.00",
    stock: 3,
    origin: "مزارع الرياض",
    isFeatured: false,
    imageUrl: IMAGES.lambSmall,
  },
  {
    name: "تيس عربي بريعي",
    animalType: "تيس",
    description: "تيس عربي بريعي مختار، لحم خفيف الهضم ومفضل للطبخ الحنيذ والمظبي.",
    weightKg: "32.00",
    pricePerKg: "48.00",
    stock: 7,
    origin: "مراعي الجنوب",
    isFeatured: true,
    imageUrl: IMAGES.goatBrown,
  },
  {
    name: "تيس حجازي",
    animalType: "تيس",
    description: "تيس حجازي مسمن، مناسب لطبخ المندي والحنيذ، مع شهادة فحص بيطري.",
    weightKg: "26.00",
    pricePerKg: "45.00",
    stock: 4,
    origin: "مراعي الطائف",
    isFeatured: false,
    imageUrl: IMAGES.goatDry,
  },
  {
    name: "جذع تيس بلدي",
    animalType: "تيس",
    description: "جذع تيس صغير بلدي، لحم صغير السن وعالي الطراوة للطلبات اليومية.",
    weightKg: "21.00",
    pricePerKg: "52.00",
    stock: 0,
    origin: "مراعي الباحة",
    isFeatured: false,
    imageUrl: IMAGES.goatHerd,
  },
  {
    name: "حاشي (جمل) صغير",
    animalType: "حاشي",
    description: "حاشي صغير مختار من أفضل المراعي، لحم أحمر غني النكهة لطبخ الكبسات الفاخرة.",
    weightKg: "120.00",
    pricePerKg: "38.00",
    stock: 3,
    origin: "مراعي الشمال",
    isFeatured: true,
    imageUrl: IMAGES.camel,
  },
  {
    name: "حاشي كبير للعزائم",
    animalType: "حاشي",
    description: "حاشي كبير يكفي ٤٠ شخصاً، مع خدمة الذبح والتقطيع والطبخ في التنور.",
    weightKg: "185.00",
    pricePerKg: "36.00",
    stock: 1,
    origin: "مراعي الجوف",
    isFeatured: false,
    imageUrl: IMAGES.roast,
  },
  {
    name: "ريش غنم طازجة",
    animalType: "خروف",
    description: "ريش غنم طازجة مقطعة بسماكة ٣ سم، جاهزة للشوي مباشرة من الثلاجة.",
    weightKg: "9.00",
    pricePerKg: "69.00",
    stock: 14,
    origin: "ثلاجة الرياض",
    isFeatured: false,
    imageUrl: IMAGES.grilled,
  },
  {
    name: "لحم مفروم بلدي",
    animalType: "لحم مفروم",
    description: "لحم مفروم طازج يومياً من لحم الغنم، مغلف بوزن نصف كيلو للاستخدام العائلي.",
    weightKg: "5.00",
    pricePerKg: "42.00",
    stock: 22,
    origin: "ثلاجة الرياض",
    isFeatured: false,
    imageUrl: IMAGES.platter,
  },
];

const STORE_SEED = MULTI_STORE_SEED;

const SERVICE_SEED = [
  {
    name: "طبخ مندي كامل",
    type: "طبخ",
    description: "طبخ الذبيحة مندي على الأرز مع قصدير وتقديم في صينية كبيرة وعدد ٣ سلطات.",
    price: "450.00",
    unit: "للطلب",
  },
  {
    name: "حنيذ في التنور",
    type: "طبخ",
    description: "حنيذ في تنور طيني لمدة ٦ ساعات مع أرز بخاري ومقبلات وشاي جمر.",
    price: "620.00",
    unit: "للطلب",
  },
  {
    name: "شوي وتقديم على الصينية",
    type: "طبخ",
    description: "شوي الذبيحة كاملة (ريش وكباب) وتقديمها على صينية ضيافة مع خبز طازج.",
    price: "520.00",
    unit: "للطلب",
  },
  {
    name: "عشاء كامل ١٥ شخص",
    type: "عشاء",
    description: "وجبة عشاء متكاملة: أرز، سلطات، مقبلات، حلويات، وقهوة عربية للضيوف.",
    price: "380.00",
    unit: "لـ ١٥ شخص",
  },
  {
    name: "خدمة الضيافة والقهوة",
    type: "عشاء",
    description: "فريق ضيافة كامل مع دلال قهوة، تمر فاخر، وأكواب تقديم لمدة ٣ ساعات.",
    price: "240.00",
    unit: "للطلب",
  },
  {
    name: "تقطيع وتغليف احترافي",
    type: "تقطيع",
    description: "تقطيع الذبيحة إلى ٨ أجزاء وتغليف مفرغ من الهواء مع ملصقات التعريف.",
    price: "120.00",
    unit: "للذبيحة",
  },
  {
    name: "توصيل مبرد داخل الرياض",
    type: "توصيل",
    description: "توصيل بنظام تبريد آمن داخل الرياض، مع تتبع مباشر وتأكيد موعد الوصول.",
    price: "90.00",
    unit: "للطلب",
  },
];

const CUSTOMER_SEED = [
  { name: "أبو عبدالله القحطاني", phone: "0551234567", city: "الرياض", address: "حي الملقا، شارع أنس بن مالك", isVip: true },
  { name: "أم محمد الشهري", phone: "0533219876", city: "جدة", address: "حي الشاطئ، شارع الأندلس", isVip: false },
  { name: "منصور العتيبي", phone: "0509988776", city: "الرياض", address: "حي النرجس، طريق أنس المالكي", isVip: true },
  { name: "فهد الدوسري", phone: "0561122334", city: "الدمام", address: "حي الفيصلية، شارع الملك فهد", isVip: false },
  { name: "نورة الحربي", phone: "0594455667", city: "مكة المكرمة", address: "حي العزيزية، شارع الحج", isVip: false },
  { name: "خالد الغامدي", phone: "0547788990", city: "الرياض", address: "حي قرطبة، شارع الشيخ حسن", isVip: false },
  { name: "شركة أفق العقارية", phone: "0112345678", city: "الرياض", address: "برج المملكة، الدور ١٢", isVip: true },
  { name: "عبدالعزيز السبيعي", phone: "0503344556", city: "بريدة", address: "حي الإسكان، شارع عمر بن الخطاب", isVip: false },
  { name: "لطيفة الزهراني", phone: "0578899001", city: "جدة", address: "حي الروضة، شارع الأمير سلطان", isVip: false },
  { name: "ماجد الشمري", phone: "0556677889", city: "الرياض", address: "حي الياسمين، شارع الوادي", isVip: false },
];

type OrderSeed = {
  customer: number;
  status: OrderStatus;
  fulfillment: "delivery" | "pickup";
  hoursAgo: number;
  deliveryInDays: number;
  items: { product: number; quantity: number }[];
  services: { service: number; quantity: number }[];
  notes?: string;
  paymentMethod: string;
  paidRatio: number;
};

const ORDER_SEED: OrderSeed[] = [
  {
    customer: 0,
    status: "new",
    fulfillment: "delivery",
    hoursAgo: 2,
    deliveryInDays: 1,
    items: [{ product: 0, quantity: 1 }],
    services: [{ service: 0, quantity: 1 }, { service: 3, quantity: 1 }],
    notes: "عزيمة عائلية، الطبخ مندي والتوصيل بعد صلاة العصر.",
    paymentMethod: "transfer",
    paidRatio: 0,
  },
  {
    customer: 2,
    status: "cooking",
    fulfillment: "delivery",
    hoursAgo: 7,
    deliveryInDays: 0,
    items: [{ product: 6, quantity: 1 }],
    services: [{ service: 1, quantity: 1 }, { service: 6, quantity: 1 }],
    notes: "حاشي صغير كامل مع حنيذ، إضافة دلال قهوة للضيوف.",
    paymentMethod: "card",
    paidRatio: 0.5,
  },
  {
    customer: 6,
    status: "preparing",
    fulfillment: "delivery",
    hoursAgo: 20,
    deliveryInDays: 1,
    items: [
      { product: 3, quantity: 3 },
      { product: 9, quantity: 4 },
    ],
    services: [{ service: 5, quantity: 3 }, { service: 6, quantity: 1 }],
    notes: "طلب شركة — ثلاث ذبائح تيوس مع تقطيع وتغليف وتسليم في المقر.",
    paymentMethod: "transfer",
    paidRatio: 0,
  },
  {
    customer: 1,
    status: "confirmed",
    fulfillment: "pickup",
    hoursAgo: 28,
    deliveryInDays: 2,
    items: [{ product: 1, quantity: 1 }],
    services: [{ service: 5, quantity: 1 }],
    notes: "تقطيع ٤ أجزاء وتغليف أكياس صغيرة.",
    paymentMethod: "cash",
    paidRatio: 0,
  },
  {
    customer: 4,
    status: "ready",
    fulfillment: "delivery",
    hoursAgo: 34,
    deliveryInDays: 0,
    items: [{ product: 4, quantity: 2 }],
    services: [{ service: 2, quantity: 2 }, { service: 4, quantity: 1 }],
    notes: "شوي كامل للتيوس، التوصيل إلى العزيزية قبل المغرب.",
    paymentMethod: "card",
    paidRatio: 1,
  },
  {
    customer: 3,
    status: "delivered",
    fulfillment: "delivery",
    hoursAgo: 50,
    deliveryInDays: -1,
    items: [{ product: 7, quantity: 1 }],
    services: [{ service: 1, quantity: 1 }, { service: 3, quantity: 1 }],
    notes: "مناسبة زواج، تم التسليم بالتنسيق مع المنسق.",
    paymentMethod: "transfer",
    paidRatio: 1,
  },
  {
    customer: 8,
    status: "delivered",
    fulfillment: "pickup",
    hoursAgo: 62,
    deliveryInDays: -2,
    items: [{ product: 2, quantity: 1 }, { product: 8, quantity: 2 }],
    services: [{ service: 5, quantity: 1 }],
    paymentMethod: "cash",
    paidRatio: 1,
  },
  {
    customer: 5,
    status: "delivered",
    fulfillment: "delivery",
    hoursAgo: 74,
    deliveryInDays: -3,
    items: [{ product: 9, quantity: 3 }],
    services: [{ service: 6, quantity: 1 }],
    paymentMethod: "online",
    paidRatio: 1,
  },
  {
    customer: 9,
    status: "delivered",
    fulfillment: "delivery",
    hoursAgo: 90,
    deliveryInDays: -4,
    items: [{ product: 0, quantity: 1 }],
    services: [{ service: 0, quantity: 1 }],
    notes: "خروف نجدي مندي مع أرز بخاري، كانت تجربة ممتازة.",
    paymentMethod: "card",
    paidRatio: 1,
  },
  {
    customer: 0,
    status: "delivered",
    fulfillment: "delivery",
    hoursAgo: 110,
    deliveryInDays: -5,
    items: [{ product: 3, quantity: 1 }, { product: 9, quantity: 2 }],
    services: [{ service: 2, quantity: 1 }, { service: 3, quantity: 1 }],
    paymentMethod: "transfer",
    paidRatio: 1,
  },
  {
    customer: 6,
    status: "delivered",
    fulfillment: "delivery",
    hoursAgo: 140,
    deliveryInDays: -7,
    items: [{ product: 6, quantity: 1 }, { product: 1, quantity: 2 }],
    services: [{ service: 1, quantity: 1 }, { service: 4, quantity: 1 }],
    notes: "حفل إفطار الشركة، تسليم في مقر الشركة بالملقا.",
    paymentMethod: "transfer",
    paidRatio: 1,
  },
  {
    customer: 7,
    status: "cancelled",
    fulfillment: "pickup",
    hoursAgo: 150,
    deliveryInDays: -6,
    items: [{ product: 4, quantity: 1 }],
    services: [],
    notes: "تم الإلغاء بناءً على طلب العميل لتغيير الموعد.",
    paymentMethod: "cash",
    paidRatio: 0,
  },
  {
    customer: 2,
    status: "delivered",
    fulfillment: "delivery",
    hoursAgo: 175,
    deliveryInDays: -9,
    items: [{ product: 7, quantity: 1 }],
    services: [{ service: 0, quantity: 1 }, { service: 3, quantity: 1 }],
    paymentMethod: "card",
    paidRatio: 1,
  },
  {
    customer: 1,
    status: "delivered",
    fulfillment: "delivery",
    hoursAgo: 210,
    deliveryInDays: -12,
    items: [{ product: 2, quantity: 2 }, { product: 8, quantity: 3 }],
    services: [{ service: 5, quantity: 2 }, { service: 6, quantity: 1 }],
    paymentMethod: "cash",
    paidRatio: 1,
  },
  {
    customer: 9,
    status: "delivered",
    fulfillment: "pickup",
    hoursAgo: 260,
    deliveryInDays: -16,
    items: [{ product: 3, quantity: 1 }],
    services: [{ service: 5, quantity: 1 }],
    paymentMethod: "online",
    paidRatio: 1,
  },
  {
    customer: 4,
    status: "delivered",
    fulfillment: "delivery",
    hoursAgo: 320,
    deliveryInDays: -20,
    items: [{ product: 1, quantity: 1 }, { product: 9, quantity: 2 }],
    services: [{ service: 2, quantity: 1 }, { service: 4, quantity: 1 }],
    paymentMethod: "transfer",
    paidRatio: 1,
  },
];

const P = (id: number, h = 700) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${Math.round((h * 4) / 3)}`;

const STOREFRONT_PRODUCTS = [
  {
    name: "ذبيحة كاملة نعيمي كشميري طازج (تُقدم على صحن أو صحنين حسب اختيارك)",
    animalType: "خروف",
    category: "النعيمي الكشميري",
    kind: "ready",
    description:
      "لعزائمك الكبيرة ومناسباتك السعيدة، نقدّم لك ذبيحة كاملة من اللحم النعيمي الكشميري الطازج والمختار بعناية فائقة. تُطهى على أصولها بالطريقة الشعبية الأصيلة لتضمن لحماً طرياً غنياً بالنكهة، وتُقدّم بكل فخامة فوق فرش راهي من الرز الشعبي النثري لتملأ مائدتك كرماً وتُبيّض وجهك قدام ضيوفك.\n\n🥩 تفاصيل الوجبة: لحم نعيمي كشميري طازج ومضمون ١٠٠٪ بدون أحشاء — طريقة التقديم مرنة على صحن واحد كبير أو صحنين حسب مجلسك — حبكة بهارات نجدية تقليدية تبرز الطعم الأصيل — الخيار الملكي للعزائم والاحتفالات والجمعات العائلية.\n\n🛡️ ميزات أهل الكرم: توصيل مجاني داخل الرياض بسيارات مجهزة — فحص بيطري دقيق لكل ذبيحة — اطلب قبل العزيمة بـ ٤ ساعات — الدفع متاح عبر التحويل البنكي المسبق.",
    weightKg: "18.00",
    pricePerKg: "66.61",
    fixedPrice: "1199.00",
    stock: 12,
    origin: "مطابخ أهل الكرم · الرياض",
    isFeatured: true,
    isActive: true,
    imageUrl: P(36850048),
  },
  {
    name: "مفطح أهل الكرم الفاخر - عشاء كامل يبيّض الوجه",
    animalType: "خروف",
    category: "النعيمي الكشميري",
    kind: "ready",
    description:
      "تبي عزيمة ترفع الراس؟ مفطح أهل الكرم هو الخيار الأول للمناسبات الكبيرة والاجتماعات الرسمية والعائلية. ذبيحة كاملة من اللحم الطري المختار، مطبوخة على أصولها بالطريقة النجدية ليذوب في الفم، وتُقدّم بشكل ملكي فوق فرش من الرز الشعبي النثري المزين بأجود المكونات.\n\n🥩 التفاصيل: لحم طازج مضمون ١٠٠٪ بدون أحشاء — تقديم على صحن كبير أو صحنين حسب رغبتك — بهارات شعبية سرية تمنحه رائحة زكية تشهّي المار.\n\n🛡️ الخدمات: توصيل مجاني داخل الرياض — فحص بيطري صارم قبل الطبخ — اطلب قبل المناسبة بـ ٣ ساعات — الدفع متاح عبر التحويل البنكي المسبق.",
    weightKg: "16.00",
    pricePerKg: "55.63",
    fixedPrice: "890.00",
    stock: 18,
    origin: "مطابخ أهل الكرم · الرياض",
    isFeatured: true,
    isActive: true,
    imageUrl: P(4899799),
  },
  {
    name: "نص ذبيحة نعيمي كشميري مع رز شعبي",
    animalType: "خروف",
    category: "النعيمي الكشميري",
    kind: "ready",
    description:
      "نصف خروف على الطريقة الشعبية — طعم يذكّرك بأيام الطيبين. لحم متبّل بخلطة بهاراتنا التقليدية الخاصة، ينطبخ بهدوء على نار هادئة ليحافظ على طراوته ومذاقه الأصلي، ويُقدّم فوق فرش فاخر من الرز الشعبي النثري. الخيار الأنسب للتجمعات العائلية — يكفي من ٦ إلى ٩ أشخاص براحة تامة.\n\n🛡️ الخدمات: توصيل مجاني داخل الرياض — فحص طبي لكل ذبيحة — اطلب قبل العزيمة بـ ٣ ساعات — الدفع متاح عبر التحويل البنكي المسبق.",
    weightKg: "9.00",
    pricePerKg: "66.56",
    fixedPrice: "599.00",
    stock: 22,
    origin: "مطابخ أهل الكرم · الرياض",
    isFeatured: true,
    isActive: true,
    imageUrl: P(5175620),
  },
  {
    name: "ربع ذبيحة مع رز شعبي",
    animalType: "خروف",
    category: "النعيمي الكشميري",
    kind: "ready",
    description:
      "إذا عندك جمعة أهل بسيطة أو عزيمة خفيفة تبيها تطلع على أصولها، ربع الذبيحة هو خيارك المضمون. لحم طري منتقى بعناية ومطبوخ على نار هادئة ببهاراتنا الشعبية السرية، مع رز شعبي نثري مطبوخ بحب. يكفي من ٤ إلى ٨ أشخاص.\n\n🛡️ الخدمات: توصيل سريع ومجاني داخل الرياض — فحص بيطري دقيق — اطلب قبل العزيمة بـ ٣ ساعات — الدفع متاح عبر التحويل البنكي المسبق.",
    weightKg: "5.00",
    pricePerKg: "86.60",
    fixedPrice: "433.00",
    stock: 26,
    origin: "مطابخ أهل الكرم · الرياض",
    isFeatured: true,
    isActive: true,
    imageUrl: P(20150381),
  },
  {
    name: "تيس كشميري كامل مطبوخ",
    animalType: "تيس",
    category: "التيس الكشميري",
    kind: "ready",
    description:
      "تيس كشميري كامل مختار من أفضل المراعي، لحمه خفيف الهضم وغني بالنكهة. يُطبخ مندي أو حنيذ في التنور على أصوله ويُقدّم مع الرز الشعبي والسلطات والمقبلات.\n\n🥩 التفاصيل: وزن تقريبي ١٤ كجم بعد الطبخ — بدون أحشاء — يقدم على صحن ضيافة كبير.\n\n🛡️ الخدمات: توصيل مجاني داخل الرياض — فحص بيطري — طبخ حسب طلبك (مندي / حنيذ / مظبي) — اطلب قبل الموعد بـ ٤ ساعات.",
    weightKg: "14.00",
    pricePerKg: "75.00",
    fixedPrice: "1050.00",
    stock: 8,
    origin: "مراعي الجنوب · مطابخ أهل الكرم",
    isFeatured: true,
    isActive: true,
    imageUrl: P(16015723),
  },
  {
    name: "مفطح تيس كشميري للعزائم",
    animalType: "تيس",
    category: "التيس الكشميري",
    kind: "custom",
    description:
      "مفطح تيس كشميري يُجهّز حسب طلبك بالطريقة الشعبية، مناسب للعزائم المتوسطة والجمعات العائلية. يتم التجهيز بعد تأكيد الموعد من فريقنا.\n\n🛡️ الخدمات: تجهيز حسب الطلب خلال ٦ ساعات — بهارات نجدية خاصة — توصيل مجاني داخل الرياض — إمكانية إضافة الضيافة والقهوة.",
    weightKg: "11.00",
    pricePerKg: "70.91",
    fixedPrice: "780.00",
    stock: 10,
    origin: "مطابخ أهل الكرم · الرياض",
    isFeatured: false,
    isActive: true,
    imageUrl: P(35532805),
  },
  {
    name: "حجز ذبيحة تيس كشميري للمناسبات",
    animalType: "تيس",
    category: "التيس الكشميري",
    kind: "booking",
    description:
      "خدمة حجز مسبق لذبيحة تيس كشميري كاملة لمناسبتك — زواج، عقد، أو تجمع كبير. نثبّت لك الموعد وننسّق معك التفاصيل قبل يوم الحدث، مع فريق طبخ وضيافة كامل.\n\n📅 الحجز: يفضّل الحجز قبل ٤٨ ساعة — إمكانية التوصيل أو التقديم في موقع المناسبة — دفعة تأكيد ٣٠٪ والباقي عند التسليم.",
    weightKg: "13.00",
    pricePerKg: "73.08",
    fixedPrice: "950.00",
    stock: 6,
    origin: "مطابخ أهل الكرم · الرياض",
    isFeatured: false,
    isActive: true,
    imageUrl: P(31763367),
  },
  {
    name: "خروف بربري كامل مع رز شعبي",
    animalType: "خروف",
    category: "الخروف البربري",
    kind: "ready",
    description:
      "خروف بربري كامل بلحم أحمر غني النكهة، يُختار بعناية ويُطبخ على نار هادئة حتى يذوب في الفم. يُقدّم على فرش من الرز الشعبي مع المقبلات والسلطات.\n\n🛡️ الخدمات: توصيل مجاني داخل الرياض — فحص بيطري — تجهيز خلال ٤ ساعات — الدفع متاح عبر التحويل البنكي المسبق.",
    weightKg: "20.00",
    pricePerKg: "62.50",
    fixedPrice: "1250.00",
    stock: 7,
    origin: "مراعي الشمال · مطابخ أهل الكرم",
    isFeatured: true,
    isActive: true,
    imageUrl: P(34951088),
  },
  {
    name: "نص خروف بربري مع رز شعبي",
    animalType: "خروف",
    category: "الخروف البربري",
    kind: "custom",
    description:
      "نصف خروف بربري يُجهّز حسب طلبك وموعدك، مناسب للعزائم الصغيرة والمتوسطة. لحم طري بنكهة أصيلة ورز شعبي نثري.\n\n🛡️ الخدمات: تجهيز حسب الطلب — فحص بيطري — توصيل مجاني داخل الرياض — خيارات دفع متعددة.",
    weightKg: "10.00",
    pricePerKg: "64.00",
    fixedPrice: "640.00",
    stock: 9,
    origin: "مراعي الشمال · مطابخ أهل الكرم",
    isFeatured: false,
    isActive: true,
    imageUrl: P(37206710),
  },
  {
    name: "ربع خروف بربري للعزائم الصغيرة",
    animalType: "خروف",
    category: "الخروف البربري",
    kind: "custom",
    description:
      "ربع خروف بربري مع رز شعبي، خيار اقتصادي ولطيف للجمعات الصغيرة والعزائم السريعة. يُجهّز حسب طلبك.\n\n🛡️ الخدمات: تجهيز سريع — فحص بيطري — توصيل مجاني داخل الرياض.",
    weightKg: "6.00",
    pricePerKg: "66.50",
    fixedPrice: "399.00",
    stock: 12,
    origin: "مراعي الشمال · مطابخ أهل الكرم",
    isFeatured: false,
    isActive: true,
    imageUrl: P(7564714),
  },
];

const LEGACY_CATEGORY: Record<string, string> = {
  خروف: "النعيمي الكشميري",
  تيس: "التيس الكشميري",
  حاشي: "الحاشي واللحوم",
  "لحم مفروم": "الحاشي واللحوم",
};


const COUPON_SEED = [
  { code: "أهلا١٠", type: "percent", value: "10.00", minOrder: "500.00", usageLimit: 200, usedCount: 47, description: "خصم ترحيبي ١٠٪ على أول طلب", isActive: true },
  { code: "KRAM50", type: "fixed", value: "50.00", minOrder: "600.00", usageLimit: 100, usedCount: 21, description: "خصم ٥٠ ريال على العزائم فوق ٦٠٠", isActive: true },
  { code: "FREEDEL", type: "freeShipping", value: "0.00", minOrder: "300.00", usageLimit: 0, usedCount: 128, description: "توصيل مجاني داخل الرياض", isActive: true },
  { code: "RAMADAN15", type: "percent", value: "15.00", minOrder: "900.00", usageLimit: 150, usedCount: 0, description: "عرض رمضان على المفاطيح", isActive: false },
];

const LOG_SEED = [
  { actorName: "أبو راكان الشمري", action: "تحديث إعدادات المتجر", entity: "الإعدادات", details: "تحديث لون الخلفية والنصوص الترحيبية" },
  { actorName: "أبو راكان الشمري", action: "إضافة منتج", entity: "المنتجات", details: "ذبيحة كاملة نعيمي كشميري طازج" },
  { actorName: "فريق المبيعات", action: "تأكيد طلب", entity: "الطلبات", details: "تحديث حالة الطلب إلى مؤكد" },
  { actorName: "فريق التسويق", action: "إنشاء كوبون", entity: "التسويق", details: "KRAM50 — خصم ٥٠ ريال" },
  { actorName: "المالك", action: "إضافة موظف", entity: "الموظفين", details: "حساب جديد مع صلاحيات محددة" },
  { actorName: "النظام", action: "تحديث المخزون", entity: "المنتجات", details: "خصم ٣ ذبائح بعد تسليم طلبين" },
];

const INTEGRATION_SEED = [
  { key: "whatsapp", name: "واتساب أعمال", category: "التواصل", url: "https://business.whatsapp.com", accountId: "966500748221", isEnabled: true, notes: "زر تواصل معنا عبر واتساب في واجهة المتجر" },
  { key: "instagram", name: "إنستغرام", category: "السوشيال ميديا", url: "https://instagram.com", accountId: "ahlalkaram", isEnabled: true, notes: "حساب المتجر الرسمي" },
  { key: "snapchat", name: "سناب شات", category: "السوشيال ميديا", url: "https://snapchat.com", accountId: null, isEnabled: false, notes: "" },
  { key: "tiktok", name: "تيك توك", category: "السوشيال ميديا", url: "https://tiktok.com", accountId: null, isEnabled: false, notes: "" },
  { key: "x", name: "منصة X (تويتر)", category: "السوشيال ميديا", url: "https://x.com", accountId: null, isEnabled: false, notes: "" },
  { key: "google-maps", name: "خرائط قوقل — الموقع", category: "الخرائط والبحث", url: "https://business.google.com", accountId: null, isEnabled: true, notes: "أضف رابط موقعك على الخريطة" },
  { key: "google-business", name: "نشاطي على قوقل", category: "الخرائط والبحث", url: "https://business.google.com", accountId: null, isEnabled: false, notes: "يظهر المتجر في بحث قوقل" },
  { key: "search-console", name: "Google Search Console", category: "الخرائط والبحث", url: "https://search.google.com/search-console", accountId: null, isEnabled: false, notes: "أرشفة الموقع وظهوره في نتائج البحث" },
  { key: "analytics", name: "Google Analytics 4", category: "التحليلات", url: "https://analytics.google.com", accountId: null, isEnabled: false, notes: "قياس الزيارات والتحويلات (G-XXXX)" },
  { key: "google-ads", name: "Google Ads", category: "التحليلات", url: "https://ads.google.com", accountId: null, isEnabled: false, notes: "أدخل معرّف حساب Google Ads أو معرّف التحويل (AW-XXXXXXXXX). إعداد الحساب هنا لا يفعّل تتبع التحويلات تلقائياً؛ يلزم إعداد وسم التحويل." },
  { key: "meta-pixel", name: "Meta Pixel (فيسبوك وإنستغرام)", category: "التحليلات", url: "https://business.facebook.com", accountId: null, isEnabled: false, notes: "تتبع الإعلانات وإعادة الاستهداف" },
  { key: "tiktok-pixel", name: "TikTok Pixel", category: "التحليلات", url: "https://ads.tiktok.com", accountId: null, isEnabled: false, notes: "" },
  { key: "openai", name: "OpenAI API", category: "الذكاء الاصطناعي", url: "https://platform.openai.com/api-keys", accountId: null, isEnabled: false, notes: "أنشئ API key من موقع OpenAI واحفظه في إعدادات الخادم السرية. الرابط والبيانات للتسهيل." },
  { key: "gemini", name: "Google Gemini API", category: "الذكاء الاصطناعي", url: "https://aistudio.google.com/apikey", accountId: null, isEnabled: false, notes: "مفتاح Gemini API — يستخدم من الخادم ولا يُعرض للعميل." },
  { key: "claude", name: "Anthropic Claude API", category: "الذكاء الاصطناعي", url: "https://console.anthropic.com/settings/keys", accountId: null, isEnabled: false, notes: "أنشئ مفتاح Anthropic واحفظه في متغير بيئة سري." },
  { key: "groq", name: "Groq AI API", category: "الذكاء الاصطناعي", url: "https://console.groq.com/keys", accountId: null, isEnabled: false, notes: "خيار سريع للتلخيص ومساعد المتجر." },
  { key: "apple-pay", name: "Apple Pay", category: "الدفع", url: "https://developer.apple.com/apple-pay/", accountId: null, isEnabled: false, notes: "يتطلب بوابة دفع تدعم Apple Pay والتحقق من الدومين." },
  { key: "bank-transfer", name: "تحويل بنكي", category: "الدفع", url: "https://www.sama.gov.sa", accountId: null, isEnabled: true, notes: "أضف الآيبان واسم البنك في إعدادات المتجر/الدفع." },
  { key: "moyasar", name: "ميسر — بوابة دفع", category: "الدفع", url: "https://moyasar.com", accountId: null, isEnabled: false, notes: "افتح حساب تاجر ثم أضف مفاتيح الربط السرية على الخادم." },
  { key: "hyperpay", name: "HyperPay — بوابة دفع", category: "الدفع", url: "https://hyperpay.com", accountId: null, isEnabled: false, notes: "تواصل مع الشركة للحصول على بيانات التاجر ومفاتيح الربط." },
  { key: "aramex", name: "أرامكس", category: "الشحن", url: "https://www.aramex.com/sa/en", accountId: null, isEnabled: false, notes: "شحن عادي ودولي، تواصل مع الشركة لفتح حساب تاجر." },
  { key: "smsa", name: "سمسا", category: "الشحن", url: "https://www.smsaexpress.com", accountId: null, isEnabled: false, notes: "مندوب وشحن داخلي مع الدفع عند الاستلام حسب عقدك." },
  { key: "dhl", name: "DHL Express", category: "الشحن", url: "https://www.dhl.com/sa-en/home.html", accountId: null, isEnabled: false, notes: "للشحن الدولي والسريع." },
  { key: "jnt", name: "J&T Express", category: "الشحن", url: "https://www.jtexpress.com", accountId: null, isEnabled: false, notes: "تواصل مع الشركة للحصول على حساب الربط." },
  { key: "imile", name: "iMile", category: "الشحن", url: "https://www.imile.com", accountId: null, isEnabled: false, notes: "شحن محلي وخدمات توصيل." },
  { key: "redbox", name: "RedBox", category: "الشحن", url: "https://redboxsa.com", accountId: null, isEnabled: false, notes: "خزائن استلام ونقاط تسليم." },
  { key: "prolo", name: "Prolo — شحن مبرد", category: "الشحن المبرد", url: "https://prolo.sa", accountId: null, isEnabled: false, notes: "اسأل عن باقات الشحن المبرد للمنتجات الحساسة." },
  { key: "snap-pixel", name: "Snap Pixel", category: "التحليلات", url: "https://ads.snapchat.com", accountId: null, isEnabled: false, notes: "" },
  { key: "tabby", name: "تابي — التقسيط", category: "الدفع", url: "https://tabby.ai", accountId: null, isEnabled: false, notes: "يحتاج مفاتيح API وحساب تاجر معتمد." },
  { key: "tamara", name: "تمارا — التقسيط", category: "الدفع", url: "https://tamara.co", accountId: null, isEnabled: false, notes: "غير مفعّل؛ لم يكتمل الربط بعد." },
  { key: "mada", name: "مدى / الدفع الإلكتروني", category: "الدفع", url: "https://www.mada.com.sa", accountId: null, isEnabled: false, notes: "غير مفعّل؛ لم يكتمل الربط بعد." },
  { key: "domain-sa", name: "السعودية نِك — حجز دومين .sa", category: "الدومين والاستضافة", url: "https://nic.sa", accountId: null, isEnabled: false, notes: "حجز دومين سعودي رسمي" },
  { key: "cloudflare", name: "Cloudflare — DNS وحماية", category: "الدومين والاستضافة", url: "https://dash.cloudflare.com", accountId: null, isEnabled: false, notes: "ربط الدومين وشهادة SSL مجانية" },
  { key: "namecheap", name: "Namecheap — دومين", category: "الدومين والاستضافة", url: "https://namecheap.com", accountId: null, isEnabled: false, notes: "دومينات .com بأسعار مناسبة" },
  { key: "vercel", name: "Vercel — نشر الموقع", category: "الدومين والاستضافة", url: "https://vercel.com", accountId: null, isEnabled: false, notes: "استضافة الموقع والتطبيق وربط الدومين" },
  { key: "salla", name: "سلة — قناة بيع إضافية", category: "قنوات البيع", url: "https://salla.com", accountId: null, isEnabled: false, notes: "ربط كتالوج المنتجات" },
  { key: "maroof", name: "معروف — توثيق المتجر", category: "الثقة والتوثيق", url: "https://maroof.sa", accountId: null, isEnabled: false, notes: "الشهادات والثقة للعملاء" },
];


async function syncAdminData(): Promise<void> {
  const storeRows = await db.select().from(stores);
  const defaultStore = storeRows.find((store) => store.storeType === "SLAUGHTERHOUSE") ?? storeRows[0];
  if (defaultStore) {
    await db
      .update(integrations)
      .set({ storeId: defaultStore.id })
      .where(isNull(integrations.storeId));
  }
  const existingIntegrations = await db.select({ storeId: integrations.storeId, key: integrations.key }).from(integrations);
  const existingIntegrationKeys = new Set(existingIntegrations.map((row) => `${row.storeId}:${row.key}`));
  const missingIntegrations = storeRows.flatMap((store) =>
    INTEGRATION_SEED
      .filter((item) => !existingIntegrationKeys.has(`${store.id}:${item.key}`))
      .map((item) => ({ ...item, storeId: store.id })),
  );
  if (missingIntegrations.length > 0) {
    await db.insert(integrations).values(missingIntegrations).onConflictDoNothing();
  }

  const existingCoupons = await db.select({ id: coupons.id }).from(coupons).limit(1);
  if (existingCoupons.length === 0) {
    await db.insert(coupons).values(COUPON_SEED);
  }

  const existingLogs = await db.select({ id: activityLogs.id }).from(activityLogs).limit(1);
  if (existingLogs.length === 0) {
    await db.insert(activityLogs).values(LOG_SEED);
  }

  for (const store of storeRows) {
    const typeLabel = store.storeType === "CLOTHING"
      ? "الملابس والأحذية"
      : store.storeType === "GROCERY"
        ? "المواد الغذائية"
        : store.storeType === "FROZEN"
          ? "المنتجات المجمدة"
          : "المنتجات";
    const storeIdentity =
      store.storeType === "CLOTHING"
        ? {
          storeName: store.name,
          tagline: "أناقتك تبدأ من هنا",
          announcement: "تشكيلات عصرية لجميع أفراد العائلة",
          heroTitle: "أناقة تناسب كل يوم",
          heroSubtitle: "اكتشف الأزياء والأحذية، واختر المقاس واللون قبل الإضافة إلى السلة.",
          about: "متجر الملابس والأحذية — تشكيلة متجددة للرجال والنساء والأطفال، مع خيارات واضحة للمقاس واللون وتجربة تسوق سهلة.",
          backgroundColor: "#fbf9f6",
          surfaceColor: "#f3eee8",
          primaryColor: "#26364b",
          accentColor: "#c18b56",
          themePreset: "store-royal",
          freeDelivery: false,
          deliveryFee: "25.00",
          codEnabled: true,
          bankTransferEnabled: false,
        }
        : store.storeType === "SLAUGHTERHOUSE"
          ? {
              storeName: store.name,
              tagline: "عشاك جاهز",
              announcement: "توصيل مجاني داخل الرياض",
              heroTitle: "عشاك جاهز من أهل الكرم",
              heroSubtitle: "ذبائح طازجة ووجبات شعبية تُجهز بعناية وتصل إلى مائدتك.",
              heroImageUrl: "https://images.pexels.com/photos/36850048/pexels-photo-36850048.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=1200",
              about: "أهل الكرم — نختار أجود الذبائح الطازجة ونطبخها على أصولها، ونوصلها لك جاهزة لضيافتك.",
              backgroundColor: "#fbf7ef",
              surfaceColor: "#f6efe1",
              primaryColor: "#0b3b2e",
              accentColor: "#c9a227",
              themePreset: "store-emerald",
              freeDelivery: true,
              deliveryFee: "0.00",
              prepHours: 4,
              codEnabled: true,
              bankTransferEnabled: true,
            }
          : {
          storeName: store.name,
          tagline: "تسوق بسهولة وثقة",
          heroTitle: `تسوق ${typeLabel} من ${store.name}`,
          heroSubtitle: `تصفح منتجات ${typeLabel} واختر ما يناسبك.`,
          about: `مرحباً بك في ${store.name}، وجهتك المميزة لـ${typeLabel}.`,
        };
    await db.insert(storeSettings).values({
      storeId: store.id,
      logoUrl: store.logoUrl,
      ...storeIdentity,
    }).onConflictDoNothing({ target: storeSettings.storeId });
  }

}

async function syncStorefrontProducts(): Promise<void> {
  await db.insert(stores).values(STORE_SEED).onConflictDoNothing().returning();

  const storeRows = await db.select().from(stores);
  const primaryStore = storeRows.find((store) => store.storeType === "SLAUGHTERHOUSE");

  for (const store of storeRows) {
    await seedStoreDemoCatalog(store.id, store.storeType, store.slug);
  }

  if (!primaryStore) return;

  const existing = await db
    .select({ id: products.id, name: products.name, animalType: products.animalType, category: products.category })
    .from(products)
    .where(eq(products.storeId, primaryStore.id));
  const names = new Set(existing.map((row) => row.name));
  const existingSkus = new Set(
    (await db.select({ sku: products.sku }).from(products)).map((product) => product.sku),
  );
  const getUniqueSku = (baseSku: string) => {
    let sku = baseSku;
    let suffix = 1;
    while (existingSkus.has(sku)) {
      sku = `${baseSku}-${suffix}`;
      suffix += 1;
    }
    existingSkus.add(sku);
    return sku;
  };

  for (const [index, product] of PRODUCT_SEED.entries()) {
    if (names.has(product.name)) continue;
    await db.insert(products).values({
      ...product,
      storeId: primaryStore.id,
      sku: getUniqueSku(`SEED-${primaryStore.id}-${String(index + 1).padStart(4, "0")}`),
      category: LEGACY_CATEGORY[product.animalType] ?? "الحاشي واللحوم",
      kind: "ready",
    });
    names.add(product.name);
  }

  for (const [index, item] of STOREFRONT_PRODUCTS.entries()) {
    if (names.has(item.name)) continue;
    await db.insert(products).values({
      ...item,
      storeId: primaryStore.id,
      sku: getUniqueSku(`AK-${primaryStore.id}-${String(index + 1).padStart(4, "0")}`),
    });
    names.add(item.name);
  }

  const storefrontNames = new Set(STOREFRONT_PRODUCTS.map((item) => item.name));
  for (const row of existing) {
    if (storefrontNames.has(row.name)) continue;
    const category = LEGACY_CATEGORY[row.animalType] ?? "الحاشي واللحوم";
    if (row.category !== category) {
      await db.update(products).set({ category, kind: "ready" }).where(eq(products.id, row.id));
    }
  }
}

export async function seedStoreDemoCatalog(storeId: number, storeType: string, slug: string): Promise<void> {
  const catalog = getStoreDemoCatalog(storeType);
  const existingCategories = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.storeId, storeId));
  const categoryNames = new Set(existingCategories.map((category) => category.name));
  const missingCategories = catalog.categories.filter((category) => !categoryNames.has(category.name));
  if (missingCategories.length) {
    await db.insert(categories).values(
      missingCategories.map((category, index) => ({
        storeId,
        name: category.name,
        slug: `${slug}-${category.slug}`,
        blurb: category.blurb,
        imageUrl: category.imageUrl,
        sortOrder: catalog.categories.indexOf(category),
        isActive: true,
        isHighlight: index === 0,
      })),
    );
  }

  const existingProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.storeId, storeId));
  const productByName = new Map(existingProducts.map((product) => [product.name, product.id]));
  const existingSkus = new Set(
    (await db.select({ sku: products.sku }).from(products)).map((product) => product.sku),
  );
  for (const [index, product] of catalog.products.entries()) {
    let productId = productByName.get(product.name);
    if (!productId) {
      const { modifiers, ...productValues } = product;
      const baseSku = `ST-${storeId}-${String(index + 1).padStart(4, "0")}`;
      let sku = baseSku;
      let suffix = 1;
      while (existingSkus.has(sku)) {
        sku = `${baseSku}-${suffix}`;
        suffix += 1;
      }
      const [created] = await db.insert(products).values({
        ...productValues,
        storeId,
        sku,
      }).returning({ id: products.id });
      productId = created.id;
      productByName.set(product.name, productId);
      existingSkus.add(sku);
    }

    if (!product.modifiers?.length) continue;
    const [existingModifier] = await db
      .select({ id: productModifiers.id })
      .from(productModifiers)
      .where(eq(productModifiers.productId, productId))
      .limit(1);
    if (existingModifier) continue;

    await db.insert(productModifiers).values(
      product.modifiers.map((modifier) => ({
        productId,
        name: modifier.name,
        type: "select",
        required: modifier.required,
        options: modifier.options.map((label) => ({ label, value: label, priceDelta: 0 })),
      })),
    );
  }
}

const round2 = (value: number) => Math.round(value * 100) / 100;

async function seed(): Promise<void> {
  /* ── 1. إنشاء حساب المالك (محمي ضد بريد فارغ) ── */
  if (!OWNER_EMAIL) {
    console.warn(
      "[dhibhati] Skipping owner creation: OWNER_EMAIL not set in .env.\n" +
        "Add OWNER_EMAIL=you@example.com (and OWNER_NAME, OWNER_PHONE, INITIAL_ADMIN_PASSWORD) to create the admin.",
    );
  } else {
    const existingOwner = await db.select().from(users).where(eq(users.email, OWNER_EMAIL)).limit(1);
    if (existingOwner.length === 0) {
      const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
      if (initialAdminPassword && initialAdminPassword.length >= 12) {
        await db.insert(users).values({
          name: OWNER_NAME,
          email: OWNER_EMAIL,
          phone: OWNER_PHONE,
          role: "admin",
          passwordHash: await hashPassword(initialAdminPassword),
        });
      } else {
        console.warn(
          "[dhibhati] Initial admin not created; configure INITIAL_ADMIN_PASSWORD with at least 12 characters.",
        );
      }
    }
  }

  /* ── 2. بيانات تجريبية (تُنشأ مرة واحدة فقط) ── */
  const existingProducts = await db.select({ id: products.id }).from(products).limit(1);
  if (existingProducts.length > 0) {
    await syncStorefrontProducts();
    await syncAdminData();
    return;
  }

  await db.insert(stores).values(STORE_SEED).onConflictDoNothing().returning();
  const [primaryStore] = await db.select().from(stores).where(eq(stores.storeType, "SLAUGHTERHOUSE")).limit(1);
  if (!primaryStore) {
    await syncStorefrontProducts();
    await syncAdminData();
    return;
  }
  const primaryStoreId = primaryStore.id;

  const productRows = await db
    .insert(products)
    .values(
      PRODUCT_SEED.map((product, index) => ({
        ...product,
        storeId: primaryStoreId,
        sku: `SEED-${primaryStoreId}-${String(index + 1).padStart(4, "0")}`,
      })),
    )
    .returning();
  const serviceRows = await db.insert(services).values(SERVICE_SEED).returning();
  const customerRows = await db
    .insert(customers)
    .values(
      CUSTOMER_SEED.map((customer) => ({
        ...customer,
        email: `${customer.phone}@dhibhati.sa`.replace(/^0+/, "c"),
        notes: customer.isVip ? "عميل مميز — يفضل التنسيق المسبق قبل المواعيد." : null,
      })),
    )
    .returning();

  let counter = 1001;
  for (const template of ORDER_SEED) {
    const createdAt = new Date(Date.now() - template.hoursAgo * 60 * 60 * 1000);
    const deliveryDate = new Date(Date.now() + template.deliveryInDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const itemLines = template.items.map((line) => {
      const product = productRows[line.product];
      const lineTotal = round2(Number(product.weightKg) * Number(product.pricePerKg) * line.quantity);
      return {
        productId: product.id,
        name: product.name,
        animalType: product.animalType,
        quantity: line.quantity,
        weightKg: product.weightKg,
        unitPrice: String(round2(Number(product.weightKg) * Number(product.pricePerKg))),
        lineTotal: String(lineTotal),
      };
    });

    const serviceLines = template.services.map((line) => {
      const service = serviceRows[line.service];
      return {
        serviceId: service.id,
        name: service.name,
        quantity: line.quantity,
        unitPrice: service.price,
        lineTotal: String(round2(Number(service.price) * line.quantity)),
      };
    });

    const total = round2(
      itemLines.reduce((sum, line) => sum + Number(line.lineTotal), 0) +
        serviceLines.reduce((sum, line) => sum + Number(line.lineTotal), 0),
    );

    const customer = customerRows[template.customer];
    const [order] = await db
      .insert(orders)
      .values({
        code: `DB-${counter}`,
        storeId: primaryStoreId,
        customerId: customer.id,
        status: template.status,
        fulfillment: template.fulfillment,
        deliveryDate,
        deliveryAddress:
          template.fulfillment === "delivery" ? (customer.address ?? customer.city) : "استلام من فرع الرياض",
        notes: template.notes ?? null,
        totalAmount: String(total),
        paidAmount: String(round2(total * template.paidRatio)),
        paymentMethod: template.paymentMethod,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    counter += 1;

    if (itemLines.length > 0) {
      await db.insert(orderItems).values(itemLines.map((line) => ({ ...line, orderId: order.id })));
    }
    if (serviceLines.length > 0) {
      await db
        .insert(orderServices)
        .values(serviceLines.map((line) => ({ ...line, orderId: order.id })));
    }
  }

  await syncStorefrontProducts();
  await syncAdminData();
}

/* ───────────── ensureSeeded: memoized + cooldown after failure ───────────── */

const RETRY_COOLDOWN_MS = 30_000;

const globalForSeed = globalThis as typeof globalThis & {
  __dhibhatiSeedPromise?: Promise<void>;
  __dhibhatiSeedLastFailure?: number;
};

export function ensureSeeded(): Promise<void> {
  const now = Date.now();
  const lastFail = globalForSeed.__dhibhatiSeedLastFailure ?? 0;

  if (!globalForSeed.__dhibhatiSeedPromise) {
    if (now - lastFail < RETRY_COOLDOWN_MS) {
      // فشل حديثاً — لا نعيد المحاولة الآن لتجنب إرهاق DB معطلة.
      return Promise.resolve();
    }

    globalForSeed.__dhibhatiSeedPromise = seed()
      .then(() => {
        globalForSeed.__dhibhatiSeedLastFailure = undefined;
      })
      .catch((error) => {
        console.error("[dhibhati] seed failed — will retry after cooldown:", error);
        globalForSeed.__dhibhatiSeedLastFailure = Date.now();
        globalForSeed.__dhibhatiSeedPromise = undefined;
      });
  }
  return globalForSeed.__dhibhatiSeedPromise;
}