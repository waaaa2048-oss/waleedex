import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { BuyBar } from "@/components/store/add-to-cart";
import { ProductCard } from "@/components/store/product-card";
import { getProductsByStore } from "@/lib/data";
import { KIND_META, animalMeta, formatMoney, publicProductDescription } from "@/lib/format";
import { PRODUCT_FEATURES, TESTIMONIALS } from "@/lib/storefront";
import { getDefaultStoreId, getStoreSettings } from "@/lib/admin-data";
import { isTabbyConfigured } from "@/lib/tabby";
import { TabbyPromo } from "@/components/store/tabby-promo";
import { getPaymentCredentials } from "@/lib/payment-credentials";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const storeId = await getDefaultStoreId();
  const [products, settings] = await Promise.all([getProductsByStore(storeId), getStoreSettings(storeId)]);
  const product = products.find((item) => item.id === Number(id));
  return {
    title: product ? `${product.name} | ${settings.storeName}` : `المنتج غير موجود | ${settings.storeName}`,
    description: product ? publicProductDescription(product.description).slice(0, 150) : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const storeId = await getDefaultStoreId();
  const products = (await getProductsByStore(storeId)).filter((product) => product.isActive);
  const product = products.find((item) => item.id === productId);
  if (!product) notFound();
  const settings = await getStoreSettings(storeId);
  const [tabbyConfigured, paymentCredentials] = await Promise.all([
    isTabbyConfigured(),
    getPaymentCredentials(),
  ]);
  const showTabbyPromo = settings.tabbyEnabled && tabbyConfigured;

  const related = products.filter((item) => item.id !== product.id).slice(0, 4);
  const animal = animalMeta(product.animalType);
  const kind = KIND_META[product.kind];
  const paragraphs = publicProductDescription(product.description).split("\n").map((part) => part.trim()).filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:pt-9">
      <nav className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#a1958a]">
        <Link href="/" className="hover:text-[var(--store-primary)]">
          الرئيسية
        </Link>
        <Icon name="chevronLeft" className="h-3 w-3" />
        <Link href="/products" className="hover:text-[var(--store-primary)]">
          المنتجات
        </Link>
        <Icon name="chevronLeft" className="h-3 w-3" />
        <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-[var(--store-primary)]">
          {product.category}
        </Link>
        <Icon name="chevronLeft" className="h-3 w-3" />
        <span className="line-clamp-1 text-[var(--store-primary)]">{product.name}</span>
      </nav>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1.06fr_.94fr] lg:gap-8">
        <div className="animate-fade">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[var(--store-surface)] shadow-[0_26px_70px_-42px_rgba(43,30,16,.65)]">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="h-[320px] w-full object-cover sm:h-[500px]" />
            ) : (
              <div className="grid h-[320px] w-full place-items-center bg-[var(--store-surface)] text-6xl sm:h-[500px]">
                {animal.emoji}
              </div>
            )}
            <div className="absolute top-3 start-3 flex flex-col gap-1.5">
              <span className={`rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${kind.badge}`}>
                {kind.label}
              </span>
              {product.isFeatured ? (
                <span className="rounded-full bg-[var(--store-accent)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--store-ink)]">
                  الأكثر مبيعاً
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRODUCT_FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl bg-white p-2.5 text-center ring-1 ring-[var(--store-line)]">
                <span className="text-base">{feature.emoji}</span>
                <p className="mt-1 text-[10px] font-extrabold text-[var(--store-ink)]">{feature.title}</p>
                <p className="mt-0.5 text-[9px] leading-4 text-[#8a7f70]">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-[#98713a]">{product.category}</p>
          <h1 className="mt-2 text-2xl font-black leading-9 text-[var(--store-ink)] sm:text-3xl sm:leading-[1.5]">{product.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-full bg-[var(--store-surface)] px-2.5 py-1 font-bold text-[var(--store-primary)]">من اختيارات {settings.storeName}</span>
            <span className={`rounded-full px-2 py-0.5 font-bold ${animal.chip}`}>
              {animal.emoji} {product.animalType}
            </span>
            {product.stock > 0 ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">متوفر · لا محدود</span>
            ) : (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-700">نفد المخزون</span>
            )}
          </div>

          <div className="mt-4 rounded-3xl border border-[var(--store-line)] bg-white p-5 shadow-[0_12px_35px_-30px_rgba(43,30,16,.5)] sm:p-6">
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-[var(--store-primary)]">{formatMoney(product.price)}</p>
              <p className="pb-1 text-[10px] text-[#a1958a]">
                {product.fixedPrice ? "شامل الطبخ والتقديم" : `${formatMoney(product.pricePerKg)} / كجم · ${product.weightKg} كجم`}
              </p>
            </div>
            {showTabbyPromo ? (
              <TabbyPromo
                price={product.price}
                source="product"
                publicKey={paymentCredentials.tabbyPublicKey}
                merchantCode={paymentCredentials.tabbyMerchantCode}
              />
            ) : (
              <p className="mt-2 text-[10px] leading-5 text-[#8a7f70]">
                طرق الدفع المتاحة تظهر لك عند إتمام الطلب.
              </p>
            )}
            {showTabbyPromo ? (
              <div className="mt-3 inline-flex rounded-md bg-[var(--store-surface)] px-2 py-1 text-[9px] font-bold text-[#5d5245]">
                تابي
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "الوزن", value: `${product.weightKg} كجم` },
              { label: "النوع", value: product.animalType },
              { label: "التسعير", value: product.fixedPrice ? "سعر ثابت" : "حسب الوزن" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--store-line)] bg-white px-3 py-3 text-center">
                <p className="text-[9px] font-bold text-[#8a7f70]">{item.label}</p>
                <p className="mt-1 text-[11px] font-extrabold text-[var(--store-ink)]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <BuyBar product={product} />
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--store-line)] bg-white p-4 sm:p-5">
            <h2 className="text-sm font-extrabold text-[var(--store-ink)]">تفاصيل المنتج والتجهيز</h2>
            <div className="mt-2 space-y-2.5">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-[11px] leading-6 text-[#5d5245]">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-[11px] leading-6 text-[#8a7f70]">تواصل معنا لمعرفة تفاصيل هذه الوجبة.</p>
              )}
            </div>
            <p className="mt-3 rounded-xl bg-[var(--store-surface)] px-3 py-2.5 text-[10px] leading-5 text-[#5d5245]">
              لديك تفضيل لطريقة التقطيع أو الطبخ؟ أضفه في خانة تفضيلات التجهيز عند إتمام الطلب ليصل للفريق مع طلبك.
            </p>
          </div>

          <div className="mt-3 rounded-2xl bg-[var(--store-primary)] p-4 text-white">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold">
              <Icon name="truck" className="h-4 w-4 text-[var(--store-accent)]" />
              التوصيل والتحضير
            </p>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-white/65">
              <li>• توصيل داخل مدينة الرياض بخيار فوري أو موعد مجدول.</li>
              <li>• اطلب قبل موعد عزيمتك بـ ٣ — ٤ ساعات لضمان أعلى جودة طبخ.</li>
              <li>• جميع الذبائح مفحوصة من قِبل طبيب بيطري قبل الطبخ.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-9">
        <h2 className="text-lg font-black text-[var(--store-ink)]">آراء العملاء</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((review) => (
            <figure key={review.name} className="rounded-2xl bg-white p-3.5 ring-1 ring-[var(--store-line)]">
              <div className="text-[10px] text-[var(--store-accent)]">★★★★★</div>
              <blockquote className="mt-1.5 text-[11px] leading-6 text-[#5d5245]">«{review.quote}»</blockquote>
              <figcaption className="mt-2 text-[10px] font-extrabold text-[var(--store-ink)]">{review.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {related.length > 0 ? (
        <section className="mt-9">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[var(--store-ink)]">منتجات مشابهة</h2>
            <Link href="/products" className="text-[11px] font-extrabold text-[var(--store-primary)]">
              عرض الكل ←
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
