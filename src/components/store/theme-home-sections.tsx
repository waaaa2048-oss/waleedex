"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { ProductCard } from "@/components/store/product-card";
import { ProductTabs } from "@/components/store/product-tabs";
import { AddToCartButton } from "@/components/store/add-to-cart";
import { cn, formatMoney } from "@/lib/format";
import { TESTIMONIALS, TRUST_ITEMS } from "@/lib/storefront";
import type { StoreCategoryDTO } from "@/lib/admin-data";
import type { StoreSettings } from "@/lib/store-defaults";
import type { HomepageSection } from "@/lib/theme-config";
import type { ProductDTO } from "@/lib/types";

type Props = {
  sections: HomepageSection[];
  settings: StoreSettings;
  categories: StoreCategoryDTO[];
  products: ProductDTO[];
};

const TRUST_ICONS: Record<string, "check" | "phone" | "truck" | "wallet"> = { shield: "check", headset: "phone", truck: "truck", wallet: "wallet" };

export function ThemeHomeSections({ sections, settings, categories, products }: Props) {
  const activeProducts = products.filter((product) => product.isActive);
  const featured = activeProducts.filter((product) => product.isFeatured);
  const bestsellers = (featured.length ? featured : activeProducts).slice(0, 4);
  const latest = [...activeProducts].sort((a, b) => b.id - a.id).slice(0, 8);

  return (
    <div className="theme-home">
      {sections.filter((section) => section.enabled).map((section) => {
        if (section.kind === "reviews" && !settings.showReviews) return null;
        if (section.kind === "featured" && !settings.showFeatured) return null;
        return (
          <ThemeSection
            key={section.id}
            section={section}
            settings={settings}
            categories={categories}
            products={activeProducts}
            featured={bestsellers}
            latest={latest}
          />
        );
      })}
    </div>
  );
}

function ThemeSection({
  section,
  settings,
  categories,
  products,
  featured,
  latest,
}: {
  section: HomepageSection;
  settings: StoreSettings;
  categories: StoreCategoryDTO[];
  products: ProductDTO[];
  featured: ProductDTO[];
  latest: ProductDTO[];
}) {
  switch (section.kind) {
    case "carousel":
    case "enhancedCarousel":
      return <HeroCarousel section={section} settings={settings} featured={featured[0]} />;
    case "wideBanner":
      return <WideBanner section={section} />;
    case "customReviews":
      return <CustomReviews section={section} />;
    case "animatedProducts":
      return <AnimatedProducts section={section} products={products} autoPlay={settings.autoPlayCarousel} />;
    case "animatedProductsBg":
      return <AnimatedProducts section={section} products={products} autoPlay={settings.autoPlayCarousel} background />;
    case "storeFeatures":
      return <StoreFeatures section={section} />;
    case "fixedProducts":
      return <ProductSection section={section} products={featured.length ? featured : products.slice(0, 8)} />;
    case "itemList":
      return <ItemList section={section} />;
    case "squareBanners":
      return <SquareBanners section={section} categories={categories} />;
    case "quickLinks":
      return <QuickLinks section={section} categories={categories} />;
    case "brands":
      return <Brands section={section} />;
    case "reviews":
      return <Reviews section={section} />;
    case "featured":
      return <ProductSection section={section} products={featured} />;
    case "categories":
      return <CategorySection section={section} categories={categories} storeName={settings.storeName} />;
    case "productTabs":
      return (
        <section className="mx-auto w-full max-w-7xl px-4 py-8">
          <SectionTitle title={section.title} subtitle={section.subtitle} />
          <div className="mt-4"><ProductTabs products={products} /></div>
        </section>
      );
    case "latest":
      return <ProductSection section={section} products={latest} compact />;
    case "trust":
      return <TrustStrip />;
    case "about":
      return <AboutSection settings={settings} />;
    default:
      return null;
  }
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-[var(--store-ink)] sm:text-2xl">{subtitle || title}</h2>
        {subtitle && title ? <p className="mt-1 text-xs text-[var(--store-muted)]">{title}</p> : null}
      </div>
    </div>
  );
}

function HeroCarousel({ section, settings, featured }: { section: HomepageSection; settings: StoreSettings; featured?: ProductDTO }) {
  const [index, setIndex] = useState(0);
  const items = section.items.filter((item) => item.imageUrl || item.title || item.subtitle);
  const current = items.length ? items[index % items.length] : null;

  useEffect(() => {
    if (!settings.autoPlayCarousel || items.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % items.length), 4500);
    return () => window.clearInterval(timer);
  }, [settings.autoPlayCarousel, items.length]);

  const image = current?.imageUrl || settings.heroImageUrl || "";
  const title = current?.title || settings.heroTitle;
  const description = current?.subtitle || settings.heroSubtitle || `اكتشف منتجات ${settings.storeName} واختر ما يناسبك.`;
  const href = current?.href || "/products";

  return (
    <section className="store-hero relative overflow-hidden px-4 py-5 sm:py-8">
      <div className="store-hero-ornament pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-7xl overflow-hidden rounded-3xl bg-[var(--store-primary)] text-white lg:min-h-[440px] lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:py-14">
          <div className="absolute inset-0 opacity-[.11]" aria-hidden="true">
            <div className="store-hero-pattern absolute inset-0" />
          </div>
          <div className="relative">
            <h1 className="max-w-xl text-3xl leading-[1.3] font-bold sm:text-4xl lg:text-[3.25rem]">
              {title || "عزيمة مرتبة من أولها"}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 sm:text-base">{description}</p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link href={href} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--store-primary)] transition hover:bg-white/90">
                تسوق الآن <Icon name="arrowLeft" className="h-4 w-4" />
              </Link>
              <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10">
                <Icon name="phone" className="h-4 w-4" /> تواصل معنا
              </a>
            </div>
            {items.length > 1 ? (
              <div className="mt-5 flex items-center gap-1.5" aria-label="شرائح الصور">
                {items.map((item, itemIndex) => (
                  <button key={item.id} type="button" onClick={() => setIndex(itemIndex)} aria-label={`الصورة ${itemIndex + 1}`} className={cn("h-1.5 rounded-full transition-all", index === itemIndex ? "w-7 bg-[var(--store-accent)]" : "w-2 bg-white/40")} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-[250px] overflow-hidden sm:min-h-[350px] lg:min-h-full">
          {image ? current?.mediaType === "video" ? (
            <video key={image} src={image} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image} src={image} alt={title || `منتجات ${settings.storeName}`} className="absolute inset-0 h-full w-full object-cover" />
          ) : featured?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featured.imageUrl} alt={featured.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[var(--store-surface)] text-7xl">🛍️</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent lg:bg-gradient-to-l lg:from-black/35 lg:via-transparent lg:to-transparent" />
          <div className="absolute bottom-4 end-4 start-4 flex items-end justify-between gap-3 sm:bottom-6 sm:end-6 sm:start-6">
            <div className="rounded-xl bg-black/45 px-4 py-3 text-white backdrop-blur-md">
              <p className="text-[11px] font-bold text-white/70">لجمعتكم وعزائمكم</p>
              <p className="mt-1 text-xs font-semibold">عزيمة مرتبة من أولها</p>
            </div>
            {featured ? <AddToCartButton product={featured} variant="gold" label="اطلب المميز" className="h-10 rounded-xl px-3 text-[11px]" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function WideBanner({ section }: { section: HomepageSection }) {
  const item = section.items[0];
  if (!item) return <section className="mx-auto w-full max-w-7xl px-4 py-4"><div className="rounded-2xl bg-[var(--store-surface)] p-8 text-center text-xs text-[var(--store-muted)]">أضف صورة أو فيديو للبانر العريض من محرر الثيم.</div></section>;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5">
      <Link href={item.href || "/products"} className="group relative block min-h-36 overflow-hidden rounded-3xl bg-[var(--store-primary)] sm:min-h-48">
        {item.imageUrl ? item.mediaType === "video" ? <video src={item.imageUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]" /> : <img src={item.imageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]" /> : null}
        <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/20 to-transparent" />
        <div className="relative flex min-h-36 flex-col justify-center p-5 text-white sm:min-h-48 sm:p-8"><p className="text-lg font-bold sm:text-2xl">{item.title || section.title}</p><p className="mt-1 text-xs text-white/80">{item.subtitle || section.subtitle}</p><span className="mt-3 inline-flex w-fit rounded-lg bg-[var(--store-accent)] px-3 py-1.5 text-[11px] font-semibold text-[var(--store-ink)]">اكتشف المزيد ←</span></div>
      </Link>
    </section>
  );
}

function CustomReviews({ section }: { section: HomepageSection }) {
  const reviews = section.items;
  if (!reviews.length) return <Reviews section={section} />;
  return <section className="border-y border-[var(--store-line)] bg-[var(--store-surface)] py-8"><div className="mx-auto max-w-7xl px-4"><SectionTitle title={section.title} subtitle={section.subtitle} /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{reviews.map((review) => <figure key={review.id} className="rounded-2xl bg-[var(--store-card)] p-4 ring-1 ring-[var(--store-line)]"><p className="text-[11px] text-[var(--store-accent)]">★★★★★</p><blockquote className="mt-2 min-h-12 text-[12px] leading-6 text-[var(--store-body)]">«{review.subtitle || "تجربة رائعة وخدمة مميزة."}»</blockquote><figcaption className="mt-3 border-t border-[var(--store-line)] pt-2 text-[11px] font-semibold">{review.title}</figcaption></figure>)}</div></div></section>;
}

function AnimatedProducts({ section, products, background = false, autoPlay = true }: { section: HomepageSection; products: ProductDTO[]; background?: boolean; autoPlay?: boolean }) {
  if (!products.length) return null;
  const loop = [...products.slice(0, 8), ...products.slice(0, 8)];
  return <section className={cn("overflow-hidden py-7", background && "bg-[var(--store-surface)]")}><div className="mx-auto max-w-7xl px-4"><SectionTitle title={section.title} subtitle={section.subtitle} /></div><div className="mt-4 overflow-hidden"><div className={cn("store-marquee-track flex w-max gap-3 px-4 pb-2", !autoPlay && "[animation-play-state:paused]")}>{loop.map((product, index) => <div key={`${product.id}-${index}`} className="w-52 shrink-0 sm:w-60"><ProductCard product={product} compact /></div>)}</div></div></section>;
}

function StoreFeatures({ section }: { section: HomepageSection }) {
  if (!section.items.length) return <TrustStrip />;
  return <section className="mx-auto w-full max-w-7xl px-4 py-6"><SectionTitle title={section.title} subtitle={section.subtitle} /><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{section.items.map((item) => <div key={item.id} className="flex items-center gap-2.5 rounded-xl bg-[var(--store-card)] p-3 ring-1 ring-[var(--store-line)]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--store-surface)] text-xl">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-7 w-7 object-contain" /> : "✓"}</span><div><p className="text-[12px] font-semibold">{item.title}</p><p className="text-[11px] text-[var(--store-muted)]">{item.subtitle}</p></div></div>)}</div></section>;
}

function ItemList({ section }: { section: HomepageSection }) {
  return <section className="mx-auto w-full max-w-7xl px-4 py-6"><SectionTitle title={section.title} subtitle={section.subtitle} /><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{section.items.map((item) => <Link key={item.id} href={item.href || "/products"} className="flex items-center gap-3 rounded-xl bg-[var(--store-card)] p-3 ring-1 ring-[var(--store-line)] transition hover:-translate-y-0.5">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-[var(--store-surface)] text-xl">↗</span>}<span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold">{item.title}</span><span className="block truncate text-[11px] text-[var(--store-muted)]">{item.subtitle}</span></span><Icon name="chevronLeft" className="h-3.5 w-3.5 text-[var(--store-primary)]" /></Link>)}</div></section>;
}

function SquareBanners({ section, categories }: { section: HomepageSection; categories: StoreCategoryDTO[] }) {
  const items = section.items.length ? section.items : categories.map((category) => ({ id: String(category.id), title: category.name, subtitle: category.blurb, imageUrl: category.imageUrl ?? "", mediaType: "image" as const, href: `/products?category=${encodeURIComponent(category.slug)}` }));
  if (!items.length) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <SectionTitle title={section.title} subtitle={section.subtitle || "اختر قسمك المفضل"} />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => <Link key={item.id} href={item.href || "/products"} className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--store-line)] bg-[var(--store-surface)]">
          {item.imageUrl ? item.mediaType === "video" ? <video src={item.imageUrl} autoPlay muted loop playsInline className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="grid h-full place-items-center text-4xl">🥩</span>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3 text-white"><p className="text-[12px] font-semibold">{item.title}</p><p className="mt-0.5 text-[11px] text-white/75">{item.subtitle}</p></div>
        </Link>)}
      </div>
    </section>
  );
}

function QuickLinks({ section, categories }: { section: HomepageSection; categories: StoreCategoryDTO[] }) {
  const items = section.items.length ? section.items : categories.slice(0, 6).map((category) => ({ id: String(category.id), title: category.name, subtitle: "تسوق القسم", imageUrl: "", href: `/products?category=${encodeURIComponent(category.slug)}` }));
  return <section className="mx-auto w-full max-w-7xl px-4 py-5"><SectionTitle title={section.title} subtitle={section.subtitle} /><div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">{items.map((item) => <Link key={item.id} href={item.href || "/products"} className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[11px] font-bold text-[var(--store-primary)] ring-1 ring-[var(--store-line)] hover:bg-[var(--store-surface)]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--store-surface)]">↗</span>{item.title}</Link>)}</div></section>;
}

function Brands({ section }: { section: HomepageSection }) {
  return <section className="border-y border-[var(--store-line)] bg-white py-6"><div className="mx-auto max-w-7xl px-4"><SectionTitle title={section.title} subtitle={section.subtitle} />{section.items.length ? <div className="mt-4 flex flex-wrap items-center justify-center gap-3">{section.items.map((item) => <Link key={item.id} href={item.href || "/products"} className="flex h-16 min-w-28 items-center justify-center rounded-xl border border-[var(--store-line)] bg-[var(--store-bg)] px-4">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="max-h-10 max-w-28 object-contain" /> : <span className="text-xs font-semibold">{item.title}</span>}</Link>)}</div> : <p className="mt-3 rounded-xl bg-[var(--store-bg)] p-3 text-center text-[11px] text-[var(--store-muted)]">أضف شعارات الماركات من إعدادات عناصر الصفحة.</p>}</div></section>;
}

function Reviews({ section }: { section: HomepageSection }) {
  return <section className="border-y border-[var(--store-line)] bg-[var(--store-surface)] py-9"><div className="mx-auto max-w-7xl px-4"><div className="text-center"><p className="text-[11px] font-semibold text-[var(--store-accent)]">{section.title}</p><h2 className="mt-1 text-xl font-bold text-[var(--store-ink)]">{section.subtitle || "كلامهم يكفي"}</h2><p className="mt-1 text-[12px] text-[var(--store-muted)]">تقييم ٤٫٩ من ٥ بناءً على تقييمات العملاء</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{TESTIMONIALS.map((review) => <figure key={review.name} className="flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-[var(--store-line)]"><div className="text-[11px] text-[var(--store-accent)]">★★★★★</div><blockquote className="mt-2 flex-1 text-[12px] leading-6 text-[var(--store-body)]">«{review.quote}»</blockquote><figcaption className="mt-3 flex items-center gap-2 border-t border-[var(--store-line)] pt-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--store-surface)] text-[11px] font-semibold text-[var(--store-primary)]">{review.initials}</span><div><p className="text-[12px] font-semibold">{review.name}</p><p className="text-[11px] text-[var(--store-muted)]">{review.role}</p></div></figcaption></figure>)}</div></div></section>;
}

function ProductSection({ section, products, compact = false }: { section: HomepageSection; products: ProductDTO[]; compact?: boolean }) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4", compact ? "py-7" : "py-8 sm:py-10")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title={section.title} subtitle={section.subtitle} />
        <Link href="/products" className="inline-flex items-center gap-1 rounded-full border border-[var(--store-line)] bg-white px-3.5 py-2 text-[11px] font-semibold text-[var(--store-primary)] transition hover:border-[var(--store-accent)]">
          عرض الكل <Icon name="arrowLeft" className="h-3.5 w-3.5" />
        </Link>
      </div>
      {products.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => <ProductCard key={product.id} product={product} compact={compact} />)}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-[var(--store-surface)] p-8 text-center text-xs text-[var(--store-muted)]">لا توجد منتجات في هذا القسم حالياً.</div>
      )}
    </section>
  );
}

function CategorySection({ section, categories, storeName }: { section: HomepageSection; categories: StoreCategoryDTO[]; storeName: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title={section.title} subtitle={section.subtitle || "اختر قسمك المفضل"} />
        <Link href="/products" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--store-primary)]">
          جميع الأقسام <Icon name="arrowLeft" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={`/products?category=${encodeURIComponent(category.slug)}`}
            className="group relative isolate min-h-40 overflow-hidden rounded-2xl border border-[var(--store-line)] bg-[var(--store-primary)] sm:min-h-52"
          >
            {category.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={category.imageUrl} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-5xl text-white/40">{["🐑", "🐪", "🐐", "🍖"][index % 4]}</span>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3.5 text-white sm:p-4">
              <span className="mb-2 inline-flex rounded-full border border-white/20 bg-black/15 px-2 py-1 text-[11px] font-bold text-white/85 backdrop-blur">
                {category.productCount} منتج
              </span>
              <p className="text-sm font-bold">{category.name}</p>
              <p className="mt-1 line-clamp-1 text-[11px] text-white/75">{category.blurb || `من منتجات ${storeName}`}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrustStrip() {
  return <section className="border-b border-[var(--store-line)] bg-white"><div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-3 px-4 py-4 lg:grid-cols-4">{TRUST_ITEMS.map((item) => <div key={item.title} className="flex items-center gap-2.5 rounded-xl bg-[var(--store-bg)] px-3 py-2.5 ring-1 ring-[var(--store-line)]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[var(--store-primary)]"><Icon name={TRUST_ICONS[item.icon]} className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[12px] font-semibold">{item.title}</p><p className="truncate text-[11px] text-[var(--store-muted)]">{item.text}</p></div></div>)}</div></section>;
}

function AboutSection({ settings }: { settings: StoreSettings }) {
  return <section className="mx-auto w-full max-w-7xl px-4 pb-10"><div className="relative overflow-hidden rounded-3xl px-5 py-8 text-white sm:px-9" style={{ background: "var(--store-primary)" }}><div className="relative grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]"><div><p className="text-[11px] font-semibold text-[var(--store-accent)]">{settings.storeName} | {settings.tagline}</p><h2 className="mt-2 text-lg font-bold leading-8 sm:text-2xl">تسوّق أسهل، واختيارات تناسب احتياجك</h2><p className="mt-3 max-w-xl text-[12px] leading-6 text-white/70 sm:text-xs">{settings.about}</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/products" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--store-accent)] px-4 text-[12px] font-semibold text-[var(--store-ink)]">تسوق الآن <Icon name="arrowLeft" className="h-3.5 w-3.5" /></Link><a href={`tel:${settings.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-[12px] font-semibold text-white ring-1 ring-white/15"><Icon name="phone" className="h-3.5 w-3.5"/><span dir="ltr">{settings.phone}</span></a></div></div><div className="grid grid-cols-2 gap-2.5"><div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10"><p className="text-[11px] text-white/60">وثيقة العمل الحر</p><p className="mt-1 text-sm font-semibold text-[var(--store-accent)]" dir="ltr">{settings.freeDocNumber}</p></div><div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10"><p className="text-[11px] text-white/60">ساعات العمل</p><p className="mt-1 text-[12px] font-semibold">{settings.workingHours}</p></div><div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10"><p className="text-[11px] text-white/60">التوصيل</p><p className="mt-1 text-[12px] font-semibold">{settings.freeDelivery ? "توصيل مجاني" : "حسب المسافة"}</p></div><div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10"><p className="text-[11px] text-white/60">الدفع</p><p className="mt-1 text-[12px] font-semibold">خيارات دفع آمنة</p></div></div></div></div></section>;
}
