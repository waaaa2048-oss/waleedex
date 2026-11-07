import Link from "next/link";
import { Icon } from "@/components/icons";

export function StoreFooter({
  storeName,
  storeSlug = "",
  tagline,
  about,
  phone,
  email,
  address,
  freeDocNumber,
  logoUrl,
  whatsapp,
  categories,
  payments,
  instagram,
  snapchat,
  tiktok,
  freeDocVisible,
  customerChannelsEnabled,
  storeAppVisible,
  hideUsefulLinks,
  hideCustomerService,
  footerDark,
}: {
  storeName: string;
  storeSlug?: string;
  tagline: string;
  about: string;
  phone: string;
  email: string;
  address: string;
  freeDocNumber: string;
  logoUrl: string | null;
  whatsapp: string;
  categories: { name: string; slug: string }[];
  payments: string[];
  instagram: string | null;
  snapchat: string | null;
  tiktok: string | null;
  freeDocVisible: boolean;
  customerChannelsEnabled: boolean;
  storeAppVisible: boolean;
  hideUsefulLinks: boolean;
  hideCustomerService: boolean;
  footerDark: boolean;
}) {
  const socialLinks = [
    instagram ? { name: "إنستغرام", label: "◎", href: instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}` } : null,
    snapchat ? { name: "سناب شات", label: "♧", href: snapchat.startsWith("http") ? snapchat : `https://snapchat.com/add/${snapchat.replace(/^@/, "")}` } : null,
    tiktok ? { name: "تيك توك", label: "♪", href: tiktok.startsWith("http") ? tiktok : `https://tiktok.com/@${tiktok.replace(/^@/, "")}` } : null,
  ].filter((item): item is { name: string; label: string; href: string } => Boolean(item));

  return (
    <footer className="mt-14 border-t border-[var(--store-line)] text-white" style={{ backgroundColor: footerDark ? "#202020" : "var(--store-primary)" }}>
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={storeName} className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-[var(--store-accent)]"><Icon name="fire" className="h-5 w-5" /></span>
              )}
              <div>
                <p className="text-base font-semibold">{storeName}</p>
                <p className="text-[11px] font-bold text-[var(--store-accent)]">| {tagline}</p>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-6 text-white/65">{about}</p>
            {socialLinks.length ? (
              <div className="mt-4 flex items-center gap-2">
                {socialLinks.map((social) => (
                  <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.name} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-sm font-bold text-white transition hover:bg-white/20">{social.label}</a>
                ))}
              </div>
            ) : null}
          </div>

          {!hideUsefulLinks ? (
            <div>
              <h3 className="text-xs font-semibold text-white">روابط مهمة</h3>
              <ul className="mt-3 space-y-2 text-[12px] text-white/65">
                {[
                  ...categories.map((category) => ({ label: category.name, href: `${storeSlug ? `/${storeSlug}` : ""}/products?category=${encodeURIComponent(category.slug)}` })),
                  { label: "كل المنتجات", href: `${storeSlug ? `/${storeSlug}` : ""}/products` },
                ].map((link) => <li key={link.label}><Link href={link.href} className="transition hover:text-[var(--store-accent)]">{link.label}</Link></li>)}
              </ul>
            </div>
          ) : null}

          {customerChannelsEnabled && !hideCustomerService ? (
            <div>
              <h3 className="text-xs font-semibold text-white">قنوات خدمة العملاء</h3>
              <ul className="mt-3 space-y-2.5 text-[12px] text-white/65">
                <li className="flex items-center gap-2"><Icon name="phone" className="h-3.5 w-3.5 text-[var(--store-accent)]" /><a href={`tel:${phone}`} dir="ltr" className="transition hover:text-[var(--store-accent)]">{phone}</a></li>
                <li className="flex items-center gap-2"><Icon name="phone" className="h-3.5 w-3.5 text-[var(--store-accent)]" /><a href={`https://wa.me/${whatsapp}`} dir="ltr" className="transition hover:text-[var(--store-accent)]">واتساب · {phone}</a></li>
                <li className="flex items-center gap-2"><Icon name="edit" className="h-3.5 w-3.5 text-[var(--store-accent)]" /><a href={`mailto:${email}`} dir="ltr" className="transition hover:text-[var(--store-accent)]">{email}</a></li>
                {address.trim() ? (
                  <li className="flex items-start gap-2"><Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--store-accent)]" />{address}</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="space-y-4">
            {freeDocVisible ? (
              <div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                <p className="text-[11px] font-bold text-white/65">شهادة منصة الأعمال · وثيقة العمل الحر</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--store-accent)]" dir="ltr">{freeDocNumber}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--store-accent)] text-[var(--store-ink)]"><Icon name="check" className="h-4 w-4" strokeWidth={2.6} /></span>
                </div>
              </div>
            ) : null}
            {storeAppVisible ? (
              <div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                <p className="text-[11px] font-bold text-white/70">تطبيق المتجر</p>
                <p className="mt-1 text-[11px] leading-5 text-white/55">ثبّت نسخة المتجر القابلة للتخصيص على Android أو iPhone أو Windows.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link href={`${storeSlug ? `/${storeSlug}` : ""}/download`} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--store-accent)] px-3 py-2 text-[11px] font-semibold text-[var(--store-ink)]"><Icon name="box" className="h-3.5 w-3.5" /> تنزيل التطبيق <Icon name="arrowLeft" className="h-3 w-3" /></Link>
                  <Link href={`${storeSlug ? `/${storeSlug}` : ""}/products`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white">تسوّق الآن</Link>
                </div>
              </div>
            ) : null}
            <div>
              <p className="text-[11px] font-bold text-white/65">طرق الدفع</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{payments.map((badge) => <span key={badge} className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold text-white/80">{badge}</span>)}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-[11px] text-white/50">
          <p>صنع بإتقان | 2026 — جميع الحقوق محفوظة لـ {storeName}</p>
          <p className="flex items-center gap-2"><span>الرياض</span><span className="h-2.5 w-px bg-white/20" /><span>سياسة الاستبدال</span><span className="h-2.5 w-px bg-white/20" /><span>الشروط والأحكام</span></p>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFloat({ whatsapp, storeName = "المتجر" }: { whatsapp: string; storeName?: string }) {
  return (
    <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`السلام عليكم، أبغى أستفسر عن ${storeName}`)}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-5 end-4 z-40 flex h-12 items-center gap-2 rounded-full bg-[#1faa4f] px-4 py-3 text-xs font-semibold text-white shadow-xl shadow-emerald-900/30 transition hover:scale-105 hover:bg-[#179143]" aria-label={`تواصل مع ${storeName} عبر واتساب`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.2-1.4A9.9 9.9 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 20Zm4.5-5.9c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.7-.8c.1-.2.1-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.3.3-.9 1-.9 2.1 0 1.2.8 2.3 1 2.5.1.2 1.6 2.6 4 3.5 2 .8 2.4.7 2.9.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.2-.2-.4-.3Z" /></svg>
      <span className="hidden sm:inline">تواصل معنا</span>
    </a>
  );
}
