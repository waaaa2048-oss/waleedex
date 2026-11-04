export type DemoCategory = {
  name: string;
  slug: string;
  blurb: string;
  imageUrl: string;
};

export type DemoProduct = {
  name: string;
  animalType: string;
  category: string;
  kind: string;
  description: string;
  weightKg: string;
  pricePerKg: string;
  fixedPrice: string;
  stock: number;
  imageUrl: string;
  origin: string;
  isActive: boolean;
  isFeatured: boolean;
  modifiers?: Array<{ name: string; required: boolean; options: string[] }>;
};

export type StoreDemoCatalog = {
  categories: DemoCategory[];
  products: DemoProduct[];
};

const image = (photoId: number) =>
  `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=900&h=700`;

const catalogByType: Record<string, StoreDemoCatalog> = {
  SLAUGHTERHOUSE: {
    categories: [
      { name: "العروض الأكثر مبيعاً", slug: "bestsellers", blurb: "أشهى اختيارات أهل الكرم", imageUrl: image(4899799) },
      { name: "النعيمي الكشميري", slug: "kashmiri-naimi", blurb: "ذبائح ووجبات نعيمي مختارة", imageUrl: image(34951088) },
      { name: "التيس الكشميري", slug: "kashmiri-goat", blurb: "تيوس ووجبات بطعم أصيل", imageUrl: image(16015723) },
      { name: "الخروف البربري", slug: "barbari-sheep", blurb: "خروف بربري غني النكهة", imageUrl: image(20150381) },
      { name: "الحاشي واللحوم", slug: "camel-and-meat", blurb: "حاشي ولحوم طازجة", imageUrl: image(30688194) },
      { name: "الذبائح", slug: "slaughterhouse", blurb: "ذبائح طازجة مختارة بعناية", imageUrl: image(31120516) },
      { name: "اللحوم", slug: "meat", blurb: "لحوم طازجة وتجهيز حسب الطلب", imageUrl: image(37936224) },
    ],
    products: [
      {
        name: "ذبيحة حري طازجة",
        animalType: "خروف",
        category: "الذبائح",
        kind: "ready",
        description: "ذبيحة حري مختارة بعناية، مع إمكانية تحديد خيارات التجهيز عند الطلب.",
        weightKg: "18.00",
        pricePerKg: "0",
        fixedPrice: "1350.00",
        stock: 8,
        imageUrl: image(31120516),
        origin: "السعودية",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "نوع التقطيع", required: true, options: ["بدون رأس", "صحن", "صحنين", "تقطيع خاص"] },
          { name: "التقديم", required: false, options: ["بدون صحن", "صحن", "صحنين"] },
        ],
      },
      {
        name: "ذبيحة نجدي فاخرة",
        animalType: "خروف",
        category: "الذبائح",
        kind: "ready",
        description: "ذبيحة نجدي مناسبة للمناسبات والعزائم، تُجهز حسب اختيارك.",
        weightKg: "20.00",
        pricePerKg: "0",
        fixedPrice: "1550.00",
        stock: 6,
        imageUrl: image(37936224),
        origin: "السعودية",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "نوع التقطيع", required: true, options: ["بدون رأس", "صحن", "صحنين", "تقطيع خاص"] },
          { name: "التقديم", required: false, options: ["بدون صحن", "صحن", "صحنين"] },
        ],
      },
    ],
  },
  CLOTHING: {
    categories: [
      { name: "رجال", slug: "men", blurb: "أزياء وأحذية رجالية لكل يوم ومناسبة", imageUrl: image(298863) },
      { name: "نساء", slug: "women", blurb: "أزياء نسائية عصرية بتفاصيل أنيقة", imageUrl: image(7679720) },
      { name: "أطفال", slug: "children", blurb: "ملابس مريحة للصغار", imageUrl: image(3662667) },
      { name: "أولاد", slug: "boys", blurb: "ملابس الأولاد للمدرسة واللعب", imageUrl: image(5531004) },
      { name: "بنات", slug: "girls", blurb: "ملابس البنات بألوان مبهجة", imageUrl: image(3662667) },
      { name: "أحذية", slug: "shoes", blurb: "أحذية مريحة وعملية لجميع أفراد العائلة", imageUrl: image(2529148) },
      { name: "حقائب وإكسسوارات", slug: "accessories", blurb: "لمسات تكمل إطلالتك", imageUrl: image(1152077) },
    ],
    products: [
      {
        name: "قميص رجالي كلاسيكي",
        animalType: "ملابس",
        category: "رجال",
        kind: "ready",
        description: "قميص يومي أنيق بقصة مريحة، متوفر بمقاسات متعددة.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "129.00",
        stock: 24,
        imageUrl: image(298863),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "المقاس", required: true, options: ["S", "M", "L", "XL"] },
          { name: "اللون", required: true, options: ["أسود", "أبيض", "أزرق", "بيج"] },
        ],
      },
      {
        name: "ثوب رجالي يومي",
        animalType: "ملابس",
        category: "رجال",
        kind: "ready",
        description: "ثوب رجالي بقصة عملية وخامة مريحة، مناسب للعمل والزيارات اليومية.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "219.00",
        stock: 18,
        imageUrl: image(5531004),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "المقاس", required: true, options: ["S", "M", "L", "XL", "XXL"] },
          { name: "اللون", required: true, options: ["أبيض", "كحلي", "رمادي"] },
        ],
      },
      {
        name: "بنطال تشينو رجالي",
        animalType: "ملابس",
        category: "رجال",
        kind: "ready",
        description: "بنطال تشينو بقصة مستقيمة وخامة مرنة لراحة تدوم طوال اليوم.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "149.00",
        stock: 20,
        imageUrl: image(532220),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: false,
        modifiers: [
          { name: "المقاس", required: true, options: ["30", "32", "34", "36", "38"] },
          { name: "اللون", required: true, options: ["أسود", "كحلي", "بيج"] },
        ],
      },
      {
        name: "فستان نسائي يومي",
        animalType: "ملابس",
        category: "نساء",
        kind: "ready",
        description: "فستان عملي بتصميم بسيط وخامة مريحة للاستخدام اليومي.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "189.00",
        stock: 16,
        imageUrl: image(7679720),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "المقاس", required: true, options: ["S", "M", "L", "XL"] },
          { name: "اللون", required: true, options: ["أسود", "أبيض", "وردي", "أخضر"] },
        ],
      },
      {
        name: "عباءة نسائية كلاسيكية",
        animalType: "ملابس",
        category: "نساء",
        kind: "ready",
        description: "عباءة أنيقة بتصميم كلاسيكي وخامة انسيابية مناسبة للاستخدام اليومي.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "279.00",
        stock: 14,
        imageUrl: image(7679720),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "المقاس", required: true, options: ["52", "54", "56", "58", "60"] },
          { name: "اللون", required: true, options: ["أسود", "كحلي"] },
        ],
      },
      {
        name: "بلوزة نسائية أنيقة",
        animalType: "ملابس",
        category: "نساء",
        kind: "ready",
        description: "بلوزة ناعمة بتصميم بسيط يسهل تنسيقه للعمل والمناسبات.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "119.00",
        stock: 22,
        imageUrl: image(6311392),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: false,
        modifiers: [
          { name: "المقاس", required: true, options: ["S", "M", "L", "XL"] },
          { name: "اللون", required: true, options: ["أبيض", "وردي", "أزرق", "أسود"] },
        ],
      },
      {
        name: "طقم أطفال قطني",
        animalType: "ملابس أطفال",
        category: "أطفال",
        kind: "ready",
        description: "طقم أطفال قطني ناعم ومريح، مناسب للارتداء اليومي.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "89.00",
        stock: 20,
        imageUrl: image(3662667),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: false,
        modifiers: [
          { name: "المقاس", required: true, options: ["2-4 سنوات", "5-7 سنوات", "8-10 سنوات"] },
          { name: "اللون", required: true, options: ["أزرق", "وردي", "أبيض"] },
        ],
      },
      {
        name: "طقم أولاد رياضي",
        animalType: "ملابس أطفال",
        category: "أولاد",
        kind: "ready",
        description: "طقم رياضي خفيف للأولاد، مناسب للمدرسة والأنشطة واللعب.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "99.00",
        stock: 18,
        imageUrl: image(5531004),
        origin: "مجموعة الأطفال",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "المقاس", required: true, options: ["2-4 سنوات", "5-7 سنوات", "8-10 سنوات", "11-13 سنة"] },
          { name: "اللون", required: true, options: ["أزرق", "أسود", "رمادي"] },
        ],
      },
      {
        name: "فستان بناتي ملون",
        animalType: "ملابس أطفال",
        category: "بنات",
        kind: "ready",
        description: "فستان بناتي مريح بألوان جميلة، مناسب للزيارات والمناسبات العائلية.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "109.00",
        stock: 16,
        imageUrl: image(3662667),
        origin: "مجموعة الأطفال",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "المقاس", required: true, options: ["2-4 سنوات", "5-7 سنوات", "8-10 سنوات", "11-13 سنة"] },
          { name: "اللون", required: true, options: ["وردي", "أبيض", "بنفسجي"] },
        ],
      },
      {
        name: "حذاء رياضي عائلي",
        animalType: "أحذية",
        category: "أحذية",
        kind: "ready",
        description: "حذاء رياضي خفيف بنعل مريح للاستخدام اليومي والمشي.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "179.00",
        stock: 20,
        imageUrl: image(2529148),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: true,
        modifiers: [
          { name: "المقاس", required: true, options: ["36", "38", "40", "42", "44"] },
          { name: "اللون", required: true, options: ["أبيض", "أسود", "رمادي"] },
        ],
      },
      {
        name: "حقيبة كتف أنيقة",
        animalType: "إكسسوارات",
        category: "حقائب وإكسسوارات",
        kind: "ready",
        description: "حقيبة كتف عملية بتصميم أنيق ومساحة مناسبة للاستخدام اليومي.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "139.00",
        stock: 12,
        imageUrl: image(1152077),
        origin: "مجموعة الموسم",
        isActive: true,
        isFeatured: false,
        modifiers: [
          { name: "اللون", required: true, options: ["أسود", "بني", "بيج"] },
        ],
      },
    ],
  },
  GROCERY: {
    categories: [
      { name: "بهارات", slug: "spices", blurb: "بهارات ومنكهات للمطبخ", imageUrl: image(4198019) },
      { name: "فشار", slug: "popcorn", blurb: "وجبات خفيفة ومقرمشات", imageUrl: image(33129) },
      { name: "حلويات", slug: "sweets", blurb: "حلويات متنوعة", imageUrl: image(1126359) },
      { name: "زيوت", slug: "oils", blurb: "زيوت ومنتجات أساسية", imageUrl: image(33783) },
    ],
    products: [
      {
        name: "علبة بهارات مشكلة",
        animalType: "مواد غذائية",
        category: "بهارات",
        kind: "ready",
        description: "خلطة بهارات مشكلة للاستخدام اليومي في إعداد الأطباق.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "18.00",
        stock: 50,
        imageUrl: image(4198019),
        origin: "منتجات غذائية",
        isActive: true,
        isFeatured: true,
      },
      {
        name: "فشار جاهز للتحضير",
        animalType: "مواد غذائية",
        category: "فشار",
        kind: "ready",
        description: "حبوب فشار سهلة التحضير لوجبة خفيفة منزلية.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "12.00",
        stock: 40,
        imageUrl: image(33129),
        origin: "منتجات غذائية",
        isActive: true,
        isFeatured: false,
      },
      {
        name: "علبة حلويات مشكلة",
        animalType: "حلويات",
        category: "حلويات",
        kind: "ready",
        description: "تشكيلة حلويات مناسبة للضيافة والمشاركة.",
        weightKg: "0",
        pricePerKg: "0",
        fixedPrice: "35.00",
        stock: 25,
        imageUrl: image(1126359),
        origin: "منتجات غذائية",
        isActive: true,
        isFeatured: true,
      },
    ],
  },
  FROZEN: {
    categories: [
      { name: "أطعمة مجمدة", slug: "frozen-food", blurb: "أطعمة مجمدة محفوظة بعناية", imageUrl: image(616401) },
      { name: "بطاطس ومقبلات", slug: "fries-and-sides", blurb: "بطاطس ومقبلات جاهزة للتحضير", imageUrl: image(1583884) },
    ],
    products: [
      {
        name: "بطاطس نصف مقلية مجمدة",
        animalType: "مجمدات",
        category: "بطاطس ومقبلات",
        kind: "ready",
        description: "بطاطس نصف مقلية مجمدة، تحفظ وتُنقل ضمن سلسلة تبريد مناسبة.",
        weightKg: "1.00",
        pricePerKg: "0",
        fixedPrice: "16.00",
        stock: 30,
        imageUrl: image(1583884),
        origin: "منتجات مجمدة",
        isActive: true,
        isFeatured: true,
      },
      {
        name: "خضار مشكلة مجمدة",
        animalType: "مجمدات",
        category: "أطعمة مجمدة",
        kind: "ready",
        description: "خضار مشكلة مجمدة مع اشتراط الحفاظ على التبريد أثناء النقل.",
        weightKg: "1.00",
        pricePerKg: "0",
        fixedPrice: "14.00",
        stock: 24,
        imageUrl: image(616401),
        origin: "منتجات مجمدة",
        isActive: true,
        isFeatured: false,
      },
    ],
  },
};

export function getStoreDemoCatalog(storeType: string): StoreDemoCatalog {
  return catalogByType[storeType] ?? catalogByType.SLAUGHTERHOUSE;
}
