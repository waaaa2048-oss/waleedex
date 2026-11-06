"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { FavoritesBar } from "@/components/store/cart-drawer";
import { cn } from "@/lib/format";

export type HeaderCategory = { name: string; slug: string; highlight: boolean };

export function StoreHeader({
  storeName,
  storeSlug = "",
  tagline,
  announcement,
  announcementIcon,
  announcementTextColor,
  announcementAutoHide,
  announcementSlide,
  phone,
  workingHours,
  categories,
  logoUrl,
  sidebarBackground,
  topBarDark,
  mobileSidebarDark,
  headerMobileLogoRight,
  enlargedHeaderIcons,
  mobileBackButton,
}: {
  storeName: string;
  storeSlug?: string;
  tagline: string;
  announcement: string;
  announcementIcon: string;
  announcementTextColor: string;
  announcementAutoHide: boolean;
  announcementSlide: boolean;
  phone: string;
  workingHours: string;
  categories: HeaderCategory[];
  logoUrl: string | null;
  sidebarBackground: string;
  topBarDark: boolean;
  mobileSidebarDark: boolean;
  headerMobileLogoRight: boolean;
  enlargedHeaderIcons: boolean;
  mobileBackButton: boolean;
}) {
  const pathname = usePathname();
  const storeBasePath = storeSlug ? `/${storeSlug}` : "";
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [userPhone, setUserPhone] = useState<string | null>(() => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )user_phone=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  });
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await fetch("/api/customer/logout", { method: "POST" }).catch(() => null);
    document.cookie = "user_phone=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = storeSlug ? `/${storeSlug}` : "/";
  };

  useEffect(() => {
    if (!announcementAutoHide) return;
    const timer = window.setTimeout(() => setShowAnnouncement(false), 10000);
    return () => window.clearTimeout(timer);
  }, [announcementAutoHide, announcement]);

  useEffect(() => {
    if (!accountOpen) return;
    function closeAccountMenu(event: MouseEvent) {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    }
    function handleAccountMenuKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", closeAccountMenu);
    document.addEventListener("keydown", handleAccountMenuKey);
    return () => {
      document.removeEventListener("mousedown", closeAccountMenu);
      document.removeEventListener("keydown", handleAccountMenuKey);
    };
  }, [accountOpen]);

  const NAV = [
    { label: "الرئيسية", href: storeSlug ? `/${storeSlug}` : "/" },
    ...categories.map((category) => ({
      label: category.highlight ? category.name : `قسم ${category.name}`,
      href: `${storeSlug ? `/${storeSlug}` : ""}/products?category=${encodeURIComponent(category.slug)}`,
    })),
  ];

  const topColor = topBarDark ? "#292929" : "var(--store-primary)";
  const mobileColor = mobileSidebarDark ? "#292929" : sidebarBackground;

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: mobileColor }}>
      {showAnnouncement ? (
        <div style={{ backgroundColor: topColor, color: announcementTextColor }} className="transition-colors">
          <div className="mx-auto flex h-9 w-full max-w-7xl items-center justify-between gap-3 px-4 text-[10px] font-semibold sm:text-[11px]">
            <p className={cn("flex items-center gap-1.5 truncate", announcementSlide && "animate-pulse")}>
              <span className="text-[var(--store-accent)]">{announcementIcon || "✦"}</span>
              {announcement}
            </p>
            <div className="hidden items-center gap-3 text-white/75 sm:flex">
              <span>الدفع المسبق فقط</span>
              <span className="h-3 w-px bg-white/20" />
              <span dir="ltr" className="font-bold tracking-wide">{phone}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-b border-[var(--store-line)] bg-[var(--store-bg)]/95 backdrop-blur-lg">
        <div className={cn("mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3", !headerMobileLogoRight && "flex-row-reverse md:flex-row")}>
          {mobileBackButton ? (
            <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign("/"))} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--store-card)] text-[var(--store-primary)] ring-1 ring-[var(--store-line)] md:hidden" aria-label="عودة">
              <Icon name="arrowLeft" className="h-4 w-4 rotate-180" />
            </button>
          ) : null}
          <Link href={storeSlug ? `/${storeSlug}` : "/"} className="flex shrink-0 items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName} className={cn("h-11 w-11 rounded-xl object-contain", enlargedHeaderIcons && "h-12 w-12")} />
            ) : (
              <Image
                src="/brand-mark.svg"
                alt=""
                width={48}
                height={48}
                className={cn("h-11 w-11 rounded-2xl shadow-md", enlargedHeaderIcons && "h-12 w-12")}
                priority
              />
            )}
            <span className="leading-tight">
              <span className="block text-base font-extrabold text-[var(--store-ink)]">{storeName}</span>
              <span className="block text-[10px] font-bold text-[var(--store-accent)]">| {tagline}</span>
            </span>
          </Link>

          <div className="relative mx-auto hidden max-w-md flex-1 md:block">
            <Icon name="search" className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#a1958a]" />
            <input
              type="search"
              placeholder="ابحث عن المنتجات..."
              className="h-11 w-full rounded-xl border border-[var(--store-line)] bg-[var(--store-card)] pr-10 pl-4 text-xs text-[var(--store-ink)] outline-none transition placeholder:text-[#b9ada0] focus:border-[var(--store-accent)] focus:ring-4 focus:ring-[var(--store-accent)]/15"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const value = (event.target as HTMLInputElement).value.trim();
                  window.location.href = value ? `${storeBasePath}/products?q=${encodeURIComponent(value)}` : `${storeBasePath}/products`;
                }
              }}
            />
          </div>

          <div className="ms-auto flex items-center gap-2">
            <FavoritesBar />
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--store-card)] px-2.5 text-[11px] font-bold text-[var(--store-ink)] ring-1 ring-[var(--store-line)] transition hover:bg-[var(--store-bg)] sm:px-3"
              >
                <Icon name="customers" className="h-4 w-4 text-[var(--store-primary)]" />
                <span>{userPhone ? "حسابي الشخصي" : "حسابي"}</span>
                <Icon name="chevronDown" className={cn("h-3 w-3 transition", accountOpen && "rotate-180")} />
              </button>

              {accountOpen ? (
                <div role="menu" aria-label="خيارات الحساب" className="absolute end-0 top-[calc(100%+0.5rem)] z-[60] w-72 overflow-hidden rounded-2xl border border-[var(--store-line)] bg-[var(--store-card)] p-2 shadow-[0_18px_48px_-24px_rgba(34,27,17,.45)]">
                  {userPhone ? (
                    /* خيارات العميل المسجل دخوله */
                    <>
                      <div className="px-3 py-2">
                        <p className="text-xs font-extrabold text-[var(--store-ink)]">مرحباً بك مجدداً</p>
                        <p className="mt-1 text-[11px] font-bold text-[var(--store-primary)]" dir="ltr">{userPhone}</p>
                      </div>
                      <div className="space-y-1 border-t border-[var(--store-line)] py-2">
                        <Link href={`${storeBasePath}/account`} role="menuitem" onClick={() => setAccountOpen(false)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-xs font-bold text-[var(--store-primary)] transition hover:bg-[var(--store-bg)]">
                          <span className="flex items-center gap-2"><Icon name="customers" className="h-4 w-4" />تفاصيل حسابي والطلبات</span>
                          <Icon name="arrowLeft" className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                        >
                          <span>تسجيل الخروج</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* خيارات الزائر غير المسجل */
                    <>
                      <div className="px-3 py-2">
                        <p className="text-xs font-extrabold text-[var(--store-ink)]">أهلاً بك في {storeName}</p>
                        <p className="mt-1 text-[10px] leading-5 text-[#8a7f70]">سجّل الدخول أو أنشئ حسابك لمتابعة طلباتك بسهولة.</p>
                      </div>
                      <div className="space-y-1 border-t border-[var(--store-line)] py-2">
                        <Link href={`${storeBasePath}/customer/login`} role="menuitem" onClick={() => setAccountOpen(false)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-xs font-bold text-[var(--store-primary)] transition hover:bg-[var(--store-bg)]">
                          <span className="flex items-center gap-2"><Icon name="phone" className="h-4 w-4" />تسجيل الدخول</span>
                        </Link>
                        <Link href={`${storeBasePath}/customer/login`} role="menuitem" onClick={() => setAccountOpen(false)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-xs font-bold text-[var(--store-primary)] transition hover:bg-[var(--store-bg)]">
                          <span className="flex items-center gap-2"><Icon name="plus" className="h-4 w-4" />حساب جديد</span>
                        </Link>
                      </div>
                    </>
                  )}

                  <div className="border-t border-[var(--store-line)] pt-2">
                    <Link
                      href="/admin/login"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center justify-between rounded-xl bg-[var(--store-primary)] px-3 py-3 text-xs font-extrabold text-white transition hover:opacity-90"
                    >
                      <span className="flex items-center gap-2"><Icon name="settings" className="h-4 w-4 text-[var(--store-accent)]" />دخول الموظفين / الإدارة</span>
                      <Icon name="arrowLeft" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--store-card)] text-[var(--store-ink)] ring-1 ring-[var(--store-line)] md:hidden" aria-label="القائمة">
              <Icon name={open ? "close" : "menu"} className={cn("h-5 w-5", enlargedHeaderIcons && "h-6 w-6")} />
            </button>
          </div>
        </div>

        <nav className="mx-auto hidden w-full max-w-7xl items-center gap-1 px-4 pb-2 md:flex">
          {NAV.map((item) => {
            const active = pathname === "/" && item.href === "/";
            return <Link key={item.label} href={item.href} className={cn("rounded-lg px-3 py-1.5 text-[11px] font-bold transition", active ? "bg-[var(--store-primary)]/10 text-[var(--store-primary)]" : "text-[#5d5245] hover:bg-white hover:text-[var(--store-primary)]")}>{item.label}</Link>;
          })}
          <Link href={`${storeSlug ? `/${storeSlug}` : ""}/products`} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-[var(--store-accent)] transition hover:bg-white">المزيد<Icon name="chevronDown" className="h-3 w-3" /></Link>
          <span className="ms-auto flex items-center gap-1.5 rounded-lg bg-[var(--store-primary)]/5 px-3 py-1.5 text-[10px] font-bold text-[var(--store-primary)]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />مفتوح الآن · {workingHours}</span>
        </nav>

        {open ? (
          <div className="animate-rise border-t border-[var(--store-line)] px-4 py-3 md:hidden" style={{ backgroundColor: mobileColor }}>
            <div className="relative mb-3">
              <Icon name="search" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#a1958a]" />
              <input type="search" placeholder="ابحث عن المنتجات..." className="h-10 w-full rounded-xl border border-[var(--store-line)] bg-[var(--store-card)] pr-9 pl-3 text-xs outline-none" onKeyDown={(event) => { if (event.key === "Enter") { const value = (event.target as HTMLInputElement).value.trim(); window.location.href = value ? `${storeBasePath}/products?q=${encodeURIComponent(value)}` : `${storeBasePath}/products`; } }} />
            </div>
            <ul className="grid grid-cols-2 gap-1.5">
              {NAV.map((item) => <li key={item.label}><Link href={item.href} onClick={() => setOpen(false)} className="block rounded-xl bg-[var(--store-card)] px-3 py-2.5 text-[11px] font-bold text-[var(--store-ink)] ring-1 ring-[var(--store-line)]">{item.label}</Link></li>)}
              <li><Link href={`${storeSlug ? `/${storeSlug}` : ""}/products`} onClick={() => setOpen(false)} className="block rounded-xl bg-[var(--store-primary)] px-3 py-2.5 text-[11px] font-bold text-white">كل المنتجات</Link></li>
              <li><a href={`tel:${phone}`} className="block rounded-xl bg-[var(--store-card)] px-3 py-2.5 text-[11px] font-bold text-[var(--store-primary)]">تواصل معنا</a></li>
            </ul>
          </div>
        ) : null}
      </div>
    </header>
  );
}