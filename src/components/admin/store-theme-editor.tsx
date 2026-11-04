"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { useToast } from "@/components/toast";
import { DEFAULT_HOMEPAGE_SECTIONS, SECTION_KIND_META, type HomepageSection, type HomepageSectionItem, type HomepageSectionKind, type ThemePresetId } from "@/lib/theme-config";
import { STORE_THEMES } from "@/lib/theme-config";
import type { StoreSettings } from "@/lib/store-defaults";
import { cn } from "@/lib/format";

const TABS: { value: string; label: string; icon: IconName }[] = [
  { value: "themes", label: "الثيمات", icon: "sparkles" },
  { value: "header", label: "رأس الصفحة", icon: "dashboard" },
  { value: "elements", label: "عناصر الصفحة", icon: "box" },
  { value: "footer", label: "تذييل الصفحة", icon: "reports" },
  { value: "identity", label: "الهوية والبيانات", icon: "edit" },
  { value: "shipping", label: "الشحن والتوصيل", icon: "truck" },
  { value: "design", label: "خيارات التصميم", icon: "settings" },
  { value: "advanced", label: "متقدم", icon: "sparkles" },
];

const PAYMENT_SETTING_KEYS = new Set([
  "codEnabled",
  "applePayEnabled",
  "madaEnabled",
  "moyasarEnabled",
  "bankTransferEnabled",
  "bankName",
  "bankAccountName",
  "bankIban",
  "tabbyEnabled",
  "tamaraEnabled",
  "taxRate",
]);

const TOGGLES: { key: keyof StoreSettings; label: string; tab: string }[] = [
  { key: "announcementAutoHide", label: "إخفاء الشريط الإعلاني بعد ١٠ ثوانٍ", tab: "header" },
  { key: "announcementSlide", label: "تحريك نص الإعلان", tab: "header" },
  { key: "floatingAnnouncement", label: "إظهار الإعلان أسفل الشاشة", tab: "header" },
  { key: "headerMobileLogoRight", label: "الشعار على اليمين في الجوال", tab: "header" },
  { key: "mobileBackButton", label: "زر العودة للخلف في الجوال", tab: "header" },
  { key: "enlargedHeaderIcons", label: "تكبير أيقونات الرأس", tab: "header" },
  { key: "bottomNavEnabled", label: "شريط تنقل أسفل شاشة الجوال", tab: "header" },
  { key: "hideUsefulLinks", label: "إخفاء روابط المتجر في التذييل", tab: "footer" },
  { key: "hideCustomerService", label: "إخفاء قناة خدمة العملاء", tab: "footer" },
  { key: "customerChannelsEnabled", label: "إظهار قنوات خدمة العملاء", tab: "footer" },
  { key: "freeDocVisible", label: "إظهار شهادة منصة الأعمال", tab: "footer" },
  { key: "storeAppVisible", label: "إظهار رابط تطبيق المتجر", tab: "footer" },
  { key: "topBarDark", label: "شريط علوي داكن", tab: "footer" },
  { key: "mobileSidebarDark", label: "قائمة الجوال داكنة", tab: "footer" },
  { key: "footerDark", label: "تذييل داكن", tab: "footer" },
  { key: "useArabicNumbers", label: "استخدام الأرقام العربية", tab: "design" },
  { key: "showBreadcrumbs", label: "ميزة مسار التنقل", tab: "design" },
  { key: "uniformProductHeights", label: "توحيد ارتفاع بطاقات المنتجات", tab: "design" },
  { key: "autoPlayCarousel", label: "تحريك الصور تلقائياً", tab: "design" },
  { key: "enhancedCartToast", label: "إشعار إضافة للسلة محسن", tab: "design" },
  { key: "autoLoadMore", label: "تحميل المزيد تلقائياً", tab: "design" },
  { key: "themeAnimations", label: "تفعيل أنيميشن المتجر 🔥", tab: "design" },
  { key: "loadingPageEnabled", label: "تفعيل صفحة التحميل", tab: "advanced" },
  { key: "loaderSkipButton", label: "إظهار زر تخطي التحميل", tab: "advanced" },
  { key: "loaderAllPages", label: "عرض صفحة التحميل في كل الصفحات", tab: "advanced" },
  { key: "quickProductView", label: "تفعيل العرض السريع للمنتج", tab: "design" },
  { key: "wishlistVisible", label: "إظهار أيقونة الأمنيات", tab: "design" },
  { key: "hideProductFrame", label: "إخفاء إطار بطاقة المنتج", tab: "design" },
  { key: "hideDiscountBadge", label: "إخفاء نسبة الخصم", tab: "design" },
  { key: "hideProductBackground", label: "إخفاء خلفية بطاقة المنتج", tab: "design" },
  { key: "boldProductTitle", label: "عنوان المنتج بخط عريض", tab: "design" },
  { key: "oneLineProductTitle", label: "عنوان المنتج في سطر واحد", tab: "design" },
  { key: "centeredProductText", label: "توسيط نص بطاقة المنتج", tab: "design" },
  { key: "hideOutOfStockButton", label: "إخفاء زر نفدت الكمية", tab: "design" },
  { key: "hideAddToCart", label: "إخفاء زر أضف للسلة", tab: "design" },
  { key: "hideWishlistButton", label: "إخفاء زر الأمنيات", tab: "design" },
  { key: "hideProductRatings", label: "إخفاء تقييم المنتج", tab: "design" },
  { key: "hideProductCategory", label: "إخفاء تصنيف المنتج", tab: "design" },
  { key: "shineProductCard", label: "تأثير لامع على البطاقة", tab: "design" },
];

function isBooleanField(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function ThemeToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5 text-[11px] font-semibold text-ink-600 ring-1 ring-stone-100">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-emerald-500" : "bg-stone-300")}
      >
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all", checked ? "right-0.5" : "right-[18px]")} />
      </button>
    </label>
  );
}

export function StoreThemeEditor({ initial, storeId = 1 }: { initial: StoreSettings; storeId?: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<StoreSettings>(initial);
  const [tab, setTab] = useState("themes");
  const [saving, setSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [newSectionKind, setNewSectionKind] = useState<HomepageSectionKind>("carousel");

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function applyTheme(themeId: ThemePresetId) {
    const theme = STORE_THEMES.find((item) => item.id === themeId);
    if (!theme) return;
    setForm((previous) => ({
      ...previous,
      themePreset: theme.id,
      primaryColor: theme.colors.primary,
      accentColor: theme.colors.accent,
      backgroundColor: theme.colors.background,
      surfaceColor: theme.colors.surface,
      productCardBackground: theme.colors.card,
      productCardBorder: theme.colors.border,
    }));
    toast(`تم اختيار ${theme.name} — اضغط حفظ التغييرات لتطبيقه` , "info");
  }

  async function uploadImage(key: "logoUrl" | "faviconUrl", file?: File) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast("حجم الصورة أكبر من ٣ ميجابايت", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast("اختر ملف صورة صالحاً", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set(key, String(reader.result));
      toast("تم تحميل الصورة محلياً — احفظ التغييرات لتثبيتها");
    };
    reader.onerror = () => toast("تعذر قراءة الصورة", "error");
    reader.readAsDataURL(file);
  }

  function patchSection(sectionId: string, patch: Partial<HomepageSection>) {
    set("homepageSections", form.homepageSections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)));
  }

  function moveSection(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= form.homepageSections.length) return;
    const next = [...form.homepageSections];
    [next[index], next[target]] = [next[target], next[index]];
    set("homepageSections", next);
  }

  function addSection() {
    const kind = newSectionKind;
    const meta = SECTION_KIND_META[kind];
    const section: HomepageSection = {
      id: `section-${Date.now()}`,
      kind,
      title: meta.label,
      subtitle: "",
      enabled: true,
      items: [],
    };
    set("homepageSections", [...form.homepageSections, section]);
    setSelectedSection(section.id);
    toast("تمت إضافة العنصر — احفظ التغييرات لنشره", "info");
  }

  function deleteSection(sectionId: string) {
    set("homepageSections", form.homepageSections.filter((section) => section.id !== sectionId));
    if (selectedSection === sectionId) setSelectedSection(null);
  }

  function patchSectionItem(sectionId: string, itemId: string, patch: Partial<HomepageSectionItem>) {
    set("homepageSections", form.homepageSections.map((section) =>
      section.id !== sectionId
        ? section
        : { ...section, items: section.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) },
    ));
  }

  function addSectionItem(sectionId: string) {
    set("homepageSections", form.homepageSections.map((section) =>
      section.id !== sectionId
        ? section
        : {
            ...section,
            items: [...section.items, { id: `item-${Date.now()}`, title: "عنصر جديد", subtitle: "", imageUrl: "", mediaType: "image", href: "/products" }],
          },
    ));
  }

  function deleteSectionItem(sectionId: string, itemId: string) {
    set("homepageSections", form.homepageSections.map((section) =>
      section.id !== sectionId ? section : { ...section, items: section.items.filter((item) => item.id !== itemId) },
    ));
  }

  function uploadSectionMedia(sectionId: string, itemId: string, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast("اختر صورة أو فيديو صالحاً", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("حجم الملف أكبر من ٨ ميجابايت", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patchSectionItem(sectionId, itemId, {
        imageUrl: String(reader.result),
        mediaType: file.type.startsWith("video/") ? "video" : "image",
      });
      toast("تم إرفاق الملف — احفظ التغييرات لنشره");
    };
    reader.onerror = () => toast("تعذر قراءة الملف", "error");
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      const themeSettings = Object.fromEntries(
        Object.entries(form).filter(([key]) => !PAYMENT_SETTING_KEYS.has(key)),
      );
      const response = await fetch(`/api/settings?storeId=${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(themeSettings),
      });
      const data = (await response.json()) as { settings?: StoreSettings; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error ?? "تعذر حفظ الثيم");
      setForm(data.settings);
      toast("تم حفظ الثيم وعناصر الواجهة بنجاح");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ الثيم", "error");
    } finally {
      setSaving(false);
    }
  }

  const activeTheme = STORE_THEMES.find((theme) => theme.id === form.themePreset) ?? STORE_THEMES[0];
  const selected = useMemo(() => form.homepageSections.find((section) => section.id === selectedSection) ?? null, [form.homepageSections, selectedSection]);

  return (
    <div className="space-y-4">
      {/* Theme identity header */}
      <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-5 text-white sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(201,162,39,0.28),transparent_55%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="شعار المتجر" className="h-12 w-12 rounded-2xl bg-white object-contain p-1" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-xl text-brand-300"><Icon name="fire" className="h-6 w-6" /></span>
            )}
            <div>
              <p className="text-[10px] font-bold text-brand-200">محرر الثيم · {activeTheme.version}</p>
              <h1 className="text-lg font-extrabold">تصميم المتجر — {form.storeName}</h1>
              <p className="mt-0.5 text-[10px] text-white/55">متجرك، قواعدك · تحكم بكل بكسل في واجهة أهل الكرم</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[11px] font-bold text-white ring-1 ring-white/15">
              <Icon name="box" className="h-3.5 w-3.5" /> معاينة المتجر
            </Link>
            <Button icon="check" onClick={save} loading={saving}>حفظ التغييرات</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <div className="min-w-0 space-y-3">
          {/* Tabs */}
          <div className="card p-2">
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {TABS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  className={cn("flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold transition", tab === item.value ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-stone-100")}
                >
                  <Icon name={item.icon} className="h-4 w-4" /> {item.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "themes" ? (
            <div className="card space-y-4 p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-bold text-ink-900">اختر ثيم المتجر</h2>
                <p className="mt-1 text-[11px] leading-5 text-ink-400">كل ثيم يضبط نظام ألوان المتجر. بعد الاختيار يمكنك تخصيص كل لون وحفظ التغييرات.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {STORE_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => applyTheme(theme.id)}
                    className={cn("overflow-hidden rounded-2xl border text-start transition hover:-translate-y-0.5", form.themePreset === theme.id ? "border-brand-500 ring-2 ring-brand-500/20" : "border-stone-200")}
                  >
                    <div className="p-3" style={{ backgroundColor: theme.colors.background }}>
                      <div className="flex items-center justify-between rounded-xl px-3 py-2 text-white" style={{ background: theme.colors.primary }}>
                        <span className="text-[10px] font-extrabold">أهل الكرم</span>
                        <span className="text-[9px]" style={{ color: theme.colors.accent }}>عشاك جاهز</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map((key) => <div key={key} className="h-9 rounded-lg border" style={{ background: theme.colors.card, borderColor: theme.colors.border }} />)}
                      </div>
                      <div className="mt-2 flex gap-1">
                        {Object.values(theme.colors).slice(0, 5).map((color, index) => <span key={`${color}-${index}`} className="h-5 flex-1 rounded" style={{ background: color }} />)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2.5">
                      <div>
                        <p className="text-xs font-extrabold text-ink-900">{theme.name}</p>
                        <p className="text-[9px] text-ink-400">{theme.subtitle}</p>
                      </div>
                      <span className={cn("grid h-6 w-6 place-items-center rounded-full", form.themePreset === theme.id ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-400")}>{form.themePreset === theme.id ? "✓" : ""}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-xl bg-brand-50 px-3.5 py-3 text-[10px] leading-5 text-brand-900 ring-1 ring-brand-100">
                التغييرات لا تظهر للزوار حتى تضغط «حفظ التغييرات». اختيار ثيم يغيّر لوحة الألوان فقط ولا يحذف محتوى متجرك أو أقسامه.
              </div>
            </div>
          ) : null}

          {tab === "header" ? (
            <div className="space-y-3">
              <div className="card space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-bold text-ink-900">رأس الصفحة</h2>
                  <p className="mt-1 text-[11px] text-ink-400">إعدادات رأس الصفحة والشريط الإعلاني وقنوات التنقل.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="الشريط الإعلاني">
                    <Input value={form.announcement} onChange={(event) => set("announcement", event.target.value)} />
                  </Field>
                  <Field label="أيقونة الإعلان">
                    <Input value={form.announcementIcon} onChange={(event) => set("announcementIcon", event.target.value)} placeholder="✦ أو 🔥" />
                  </Field>
                  <Field label="لون نص الإعلان">
                    <ColorField value={form.announcementTextColor} onChange={(value) => set("announcementTextColor", value)} />
                  </Field>
                  <Field label="لون خلفية القائمة الجانبية">
                    <ColorField value={form.sidebarBackground} onChange={(value) => set("sidebarBackground", value)} />
                  </Field>
                </div>
                <ToggleGroup fields={TOGGLES.filter((item) => item.tab === "header")} form={form} onChange={set} />
              </div>
              <ImageField label="شعار المتجر" value={form.logoUrl} onChange={(value) => set("logoUrl", value)} onUpload={(file) => uploadImage("logoUrl", file)} hint="المقاس المقترح ٢٦٠×٢٦٠ بكسل" />
            </div>
          ) : null}

          {tab === "elements" ? (
            <div className="card space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink-900">عناصر الصفحة الرئيسية</h2>
                  <p className="mt-1 text-[11px] leading-5 text-ink-400">أظهر/أخفِ العناصر، غيّر ترتيبها، وأضف بانرات وروابط سريعة وصور الماركات.</p>
                </div>
                <div className="flex gap-2">
                  <Select value={newSectionKind} onChange={(event) => setNewSectionKind(event.target.value as HomepageSectionKind)} className="h-9 w-52 text-[10px]">
                    {Object.entries(SECTION_KIND_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                  </Select>
                  <Button size="sm" icon="plus" onClick={addSection}>إضافة عنصر جديد</Button>
                </div>
              </div>

              <div className="space-y-2">
                {form.homepageSections.map((section, index) => {
                  const meta = SECTION_KIND_META[section.kind];
                  const active = selectedSection === section.id;
                  return (
                    <div key={section.id} className={cn("overflow-hidden rounded-2xl border transition", active ? "border-brand-300 bg-brand-50/20" : "border-stone-200 bg-white")}>
                      <div className="flex flex-wrap items-center gap-2 p-3">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} className="grid h-7 w-7 place-items-center rounded-lg bg-stone-100 text-ink-500 disabled:opacity-30" aria-label="تحريك للأعلى">↑</button>
                          <button type="button" onClick={() => moveSection(index, 1)} disabled={index === form.homepageSections.length - 1} className="grid h-7 w-7 place-items-center rounded-lg bg-stone-100 text-ink-500 disabled:opacity-30" aria-label="تحريك للأسفل">↓</button>
                        </div>
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-sm text-brand-700">{meta.icon}</span>
                        <button type="button" onClick={() => setSelectedSection(active ? null : section.id)} className="min-w-0 flex-1 text-start">
                          <span className="block truncate text-[11px] font-extrabold text-ink-900">{section.title}</span>
                          <span className="block truncate text-[9px] text-ink-400">{meta.label} · {section.items.length} عنصر</span>
                        </button>
                        <ThemeToggle checked={section.enabled} label="ظاهر" onChange={(enabled) => patchSection(section.id, { enabled })} />
                        <button type="button" onClick={() => deleteSection(section.id)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label="حذف العنصر"><Icon name="trash" className="h-4 w-4" /></button>
                      </div>
                      {active ? (
                        <div className="space-y-3 border-t border-stone-100 bg-stone-50/50 p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="عنوان القسم"><Input value={section.title} onChange={(event) => patchSection(section.id, { title: event.target.value })} /></Field>
                            <Field label="عنوان فرعي"><Input value={section.subtitle} onChange={(event) => patchSection(section.id, { subtitle: event.target.value })} /></Field>
                          </div>
                          {(["carousel", "enhancedCarousel", "wideBanner", "squareBanners", "quickLinks", "brands", "customReviews", "animatedProducts", "animatedProductsBg", "storeFeatures", "fixedProducts", "itemList"] as HomepageSectionKind[]).includes(section.kind) ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-ink-600">محتويات العنصر</p>
                                <Button size="sm" variant="secondary" icon="plus" onClick={() => addSectionItem(section.id)}>إضافة عنصر</Button>
                              </div>
                              {section.items.map((item, itemIndex) => (
                                <div key={item.id} className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-stone-200 sm:grid-cols-2">
                                  <Field label={`العنوان ${itemIndex + 1}`}><Input value={item.title} onChange={(event) => patchSectionItem(section.id, item.id, { title: event.target.value })} /></Field>
                                  <Field label="وصف مختصر"><Input value={item.subtitle} onChange={(event) => patchSectionItem(section.id, item.id, { subtitle: event.target.value })} /></Field>
                                  <Field label={item.mediaType === "video" ? "رابط الفيديو" : "رابط الصورة / الفيديو"}>
                                    <div className="space-y-1.5">
                                      <Input value={item.imageUrl.startsWith("data:") ? "ملف محلي مرفق" : item.imageUrl} onChange={(event) => patchSectionItem(section.id, item.id, { imageUrl: event.target.value, mediaType: "image" })} dir="ltr" placeholder="https://..." />
                                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1.5 text-[10px] font-bold text-ink-600 hover:bg-stone-200">
                                        <Icon name="plus" className="h-3 w-3" /> رفع صورة أو فيديو من الجهاز
                                        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={(event) => uploadSectionMedia(section.id, item.id, event.target.files?.[0])} />
                                      </label>
                                    </div>
                                  </Field>
                                  <Field label="الرابط عند الضغط"><div className="flex gap-2"><Input value={item.href} onChange={(event) => patchSectionItem(section.id, item.id, { href: event.target.value })} dir="ltr" placeholder="/products" /><button type="button" onClick={() => deleteSectionItem(section.id, item.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><Icon name="trash" className="h-4 w-4" /></button></div></Field>
                                </div>
                              ))}
                              {section.items.length === 0 ? <p className="rounded-xl bg-white p-3 text-[10px] text-ink-400">أضف صورة ورابطاً ليظهر العنصر في الصفحة الرئيسية.</p> : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <ToggleGroup fields={[{ key: "autoPlayCarousel", label: "تحريك السلايدر تلقائياً" }, { key: "themeAnimations", label: "أنيميشن المتجر" }]} form={form} onChange={set} />
            </div>
          ) : null}

          {tab === "footer" ? (
            <div className="card space-y-4 p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-bold text-ink-900">تذييل الصفحة</h2>
                <p className="mt-1 text-[11px] text-ink-400">قنوات خدمة العملاء، الشهادة، الحسابات الاجتماعية وتطبيق المتجر.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="رقم وثيقة العمل الحر"><Input value={form.freeDocNumber} onChange={(event) => set("freeDocNumber", event.target.value)} dir="ltr" /></Field>
                <Field label="رابط إنستغرام"><Input value={form.instagram ?? ""} onChange={(event) => set("instagram", event.target.value || null)} dir="ltr" placeholder="https://instagram.com/..." /></Field>
                <Field label="رابط سناب شات"><Input value={form.snapchat ?? ""} onChange={(event) => set("snapchat", event.target.value || null)} dir="ltr" placeholder="https://snapchat.com/..." /></Field>
                <Field label="رابط تيك توك"><Input value={form.tiktok ?? ""} onChange={(event) => set("tiktok", event.target.value || null)} dir="ltr" placeholder="https://tiktok.com/@..." /></Field>
              </div>
              <ToggleGroup fields={TOGGLES.filter((item) => item.tab === "footer")} form={form} onChange={set} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="اسم المتجر في التذييل"><Input value={form.storeName} onChange={(event) => set("storeName", event.target.value)} /></Field>
                <Field label="ساعات العمل"><Input value={form.workingHours} onChange={(event) => set("workingHours", event.target.value)} /></Field>
                <Field label="رقم خدمة العملاء"><Input value={form.phone} onChange={(event) => set("phone", event.target.value)} dir="ltr" /></Field>
                <Field label="بريد الدعم"><Input value={form.email} onChange={(event) => set("email", event.target.value)} dir="ltr" /></Field>
              </div>
            </div>
          ) : null}

          {tab === "identity" ? (
            <div className="space-y-3">
              <div className="card space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-bold text-ink-900">هوية وبيانات المتجر</h2>
                  <p className="mt-1 text-[11px] text-ink-400">تُطبّق هذه البيانات على واجهة المتجر والتطبيق القابل للتثبيت.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="اسم المتجر *"><Input value={form.storeName} onChange={(event) => set("storeName", event.target.value)} /></Field>
                  <Field label="الشعار النصي"><Input value={form.tagline} onChange={(event) => set("tagline", event.target.value)} /></Field>
                </div>
                <Field label="وصف المتجر"><Textarea value={form.about} onChange={(event) => set("about", event.target.value)} rows={4} /></Field>
                <Field label="عنوان المتجر">
                  <Input
                    value={form.address}
                    onChange={(event) => set("address", event.target.value)}
                    placeholder="أدخل عنوان المتجر الصحيح أو اتركه فارغاً لإخفائه"
                  />
                </Field>
                <div className="overflow-hidden rounded-2xl border border-[var(--store-line)] bg-[var(--store-surface)]">
                  <div className="flex items-center justify-between gap-3 bg-[var(--store-primary)] px-4 py-3 text-white">
                    <div>
                      <h3 className="text-xs font-extrabold">شعار المتجر والتطبيق</h3>
                      <p className="mt-1 text-[10px] text-white/70">معاينة الهوية على ألوان متجرك</p>
                    </div>
                    <Icon name="sparkles" className="h-4 w-4 text-[var(--store-accent)]" />
                  </div>
                  <div className="grid gap-4 p-4 lg:grid-cols-[1fr_0.8fr]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ImageField
                        label="شعار المتجر والتطبيق"
                        value={form.logoUrl}
                        onChange={(value) => set("logoUrl", value)}
                        hint="أفضل مقاس ٢٦٠×٢٦٠ بكسل؛ يظهر كأيقونة للتطبيق المثبّت"
                        onUpload={(file) => uploadImage("logoUrl", file)}
                      />
                      <ImageField
                        label="أيقونة تبويب المتصفح"
                        value={form.faviconUrl}
                        onChange={(value) => set("faviconUrl", value)}
                        hint="أفضل مقاس ٣٢×٣٢ بكسل"
                        onUpload={(file) => uploadImage("faviconUrl", file)}
                      />
                    </div>
                    <div className="flex flex-col justify-center gap-3 rounded-xl bg-white p-4 ring-1 ring-stone-200">
                      <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                        {form.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={form.logoUrl} alt="معاينة شعار التطبيق" className="h-14 w-14 rounded-2xl bg-white object-contain p-1 shadow-sm" />
                        ) : (
                          <span className="grid h-14 w-14 place-items-center rounded-2xl text-2xl text-white" style={{ background: form.primaryColor }}>🐑</span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-ink-900">{form.storeName || "اسم المتجر"}</p>
                          <p className="mt-1 text-[10px] text-ink-400">أيقونة التطبيق المثبّت</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                        {form.faviconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={form.faviconUrl} alt="معاينة أيقونة المتصفح" className="h-5 w-5 object-contain" />
                        ) : (
                          <span className="h-5 w-5 rounded bg-[var(--store-primary)]" />
                        )}
                        <span className="truncate text-[10px] text-ink-700">{form.storeName || "متجرك"} — المتجر</span>
                        <span className="ms-auto text-xs text-ink-400">×</span>
                      </div>
                      <p className="text-[9px] leading-4 text-ink-400">بعد الحفظ، قد تحتاج إلى إعادة تحميل الصفحة أو إعادة تثبيت التطبيق لتحديث الأيقونة.</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="لون المتجر"><ColorField value={form.primaryColor} onChange={(value) => set("primaryColor", value)} /></Field>
                  <Field label="لون التمييز"><ColorField value={form.accentColor} onChange={(value) => set("accentColor", value)} /></Field>
                  <Field label="لون الخلفية"><ColorField value={form.backgroundColor} onChange={(value) => set("backgroundColor", value)} /></Field>
                </div>
              </div>
              <div className="card space-y-3 p-4 sm:p-5">
                <h3 className="text-xs font-bold text-ink-900">الخطوط</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="اسم الخط"><Input value={form.fontFamily} onChange={(event) => set("fontFamily", event.target.value)} placeholder="Tajawal" /></Field>
                  <Field label="رابط الخط"><Input value={form.fontUrl ?? ""} onChange={(event) => set("fontUrl", event.target.value || null)} dir="ltr" placeholder="https://fonts.googleapis.com/..." /></Field>
                  <Field label="وزن الخط"><Input value={form.fontWeight} onChange={(event) => set("fontWeight", event.target.value)} placeholder="400,500,700,800" dir="ltr" /></Field>
                </div>
                <p className="text-[9px] text-amber-700">عند إضافة خط خاص تأكد من امتلاك ترخيص الاستخدام التجاري.</p>
              </div>
            </div>
          ) : null}

          {tab === "shipping" ? (
            <div className="space-y-3">
              <div className="card space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-bold text-ink-900">الشحن والتوصيل</h2>
                  <p className="mt-1 text-[11px] text-ink-400">التحكم برسوم التوصيل والحد الأدنى. يمكن ربط شركات الشحن لاحقاً من التكاملات.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="رسوم التوصيل (ر.س)"><Input type="number" min={0} value={form.deliveryFee} onChange={(event) => set("deliveryFee", Number(event.target.value))} /></Field>
                  <Field label="أقل قيمة للطلب (ر.س)"><Input type="number" min={0} value={form.minOrder} onChange={(event) => set("minOrder", Number(event.target.value))} /></Field>
                  <Field label="وقت التحضير (ساعة)"><Input type="number" min={1} max={72} value={form.prepHours} onChange={(event) => set("prepHours", Number(event.target.value))} /></Field>
                </div>
                <ThemeToggle checked={form.freeDelivery} label="توصيل مجاني" onChange={(value) => set("freeDelivery", value)} />
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-[10px] font-bold text-ink-700">موقع إتمام الطلب</p>
                  <p className="mt-1 text-[10px] leading-5 text-ink-500">يمكن للعميل استخدام تحديد الموقع التلقائي أو إدخال عنوان يدوي. الإدخال اليدوي متاح لمدينة الرياض فقط حالياً.</p>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "design" ? (
            <div className="space-y-3">
              <div className="card space-y-4 p-4 sm:p-5">
                <h2 className="text-sm font-bold text-ink-900">خيارات التصميم</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="لون خلفية المتجر"><ColorField value={form.backgroundColor} onChange={(value) => set("backgroundColor", value)} /></Field>
                  <Field label="صورة خلفية المتجر"><Input value={form.backgroundImageUrl ?? ""} onChange={(event) => set("backgroundImageUrl", event.target.value || null)} dir="ltr" placeholder="https://..." /></Field>
                  <Field label="لون بطاقة المنتج"><ColorField value={form.productCardBackground} onChange={(value) => set("productCardBackground", value)} /></Field>
                  <Field label="لون إطار البطاقة"><ColorField value={form.productCardBorder} onChange={(value) => set("productCardBorder", value)} /></Field>
                  <Field label="خلفية العنوان الترويجي"><ColorField value={form.promoTitleBackground} onChange={(value) => set("promoTitleBackground", value)} /></Field>
                  <Field label="نسبة صورة البطاقة"><Input type="number" min={4} max={20} value={form.productImageRatio} onChange={(event) => set("productImageRatio", Number(event.target.value))} /></Field>
                  <Field label="استدارة البطاقة"><Select value={form.productCardRadius} onChange={(event) => set("productCardRadius", event.target.value)}><option value="square">مربعة</option><option value="rounded">منحنية ٣</option><option value="round">منحنية جداً</option></Select></Field>
                  <Field label="أيقونة إضافة للسلة"><Select value={form.productAddIcon} onChange={(event) => set("productAddIcon", event.target.value)}><option value="plus">أيقونة بلس</option><option value="cart">سلة</option><option value="bag">حقيبة</option></Select></Field>
                </div>
                <ToggleGroup fields={TOGGLES.filter((item) => item.tab === "design")} form={form} onChange={set} />
              </div>
              <div className="card space-y-3 p-4">
                <h3 className="text-xs font-bold text-ink-900">خلفية عامة ونقشة</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="لون الأسطح"><ColorField value={form.surfaceColor} onChange={(value) => set("surfaceColor", value)} /></Field>
                  <Field label="نقشة الخلفية"><Select value={form.backgroundPattern} onChange={(event) => set("backgroundPattern", event.target.value)}><option value="none">بدون نقشة</option><option value="dots">نقاط ناعمة</option><option value="grid">شبكة خفيفة</option><option value="diagonal">خطوط مائلة</option></Select></Field>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "advanced" ? (
            <div className="space-y-3">
              <div className="card space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-bold text-ink-900">إعدادات عامة وصفحة التحميل</h2>
                  <p className="mt-1 text-[11px] text-ink-400">تحكم في التحميل، الوضع الداكن، وتحريك الواجهة.</p>
                </div>
                <ToggleGroup fields={TOGGLES.filter((item) => item.tab === "advanced")} form={form} onChange={set} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ImageField label="صورة صفحة التحميل (PNG/GIF/SVG)" value={form.loaderImageUrl} onChange={(value) => set("loaderImageUrl", value)} />
                  <Field label="لون خلفية صفحة التحميل"><ColorField value={form.loaderBackgroundColor} onChange={(value) => set("loaderBackgroundColor", value)} /></Field>
                  <Field label="حجم الشعار"><Input type="number" min={0} max={300} value={form.loaderLogoSize} onChange={(event) => set("loaderLogoSize", Number(event.target.value))} /></Field>
                  <Field label="وقت التحميل (ثانية)"><Input type="number" min={1} max={10} value={form.loaderDuration} onChange={(event) => set("loaderDuration", Number(event.target.value))} /></Field>
                </div>
              </div>
              <div className="card space-y-3 p-4 sm:p-5">
                <h3 className="text-xs font-bold text-ink-900">تخصيص متقدم — CSS</h3>
                <p className="text-[10px] leading-5 text-ink-400">تُضاف القواعد إلى المتجر. لا تضف وسم &lt;style&gt;. JavaScript غير مفعّل لحماية العملاء والجلسات.</p>
                <Textarea value={form.customCss} onChange={(event) => set("customCss", event.target.value)} dir="ltr" rows={9} className="font-mono text-[10px]" placeholder=":root { --store-primary: #5c1329; }" />
              </div>
            </div>
          ) : null}

          <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-[10px] text-ink-400">تغييراتك تُحفظ على المتجر وقوالب الثيم.</p>
            <Button icon="check" onClick={save} loading={saving}>حفظ التغييرات</Button>
          </div>
        </div>

        {/* Live preview */}
        <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-ink-900"><Icon name="sparkles" className="h-3.5 w-3.5 text-brand-600" /> معاينة الثيم</h3>
              <span className="text-[9px] text-ink-400">{activeTheme.version}</span>
            </div>
            <div style={{ background: form.backgroundColor }} className="p-3">
              <div className="rounded-lg px-3 py-1.5 text-[9px] font-bold" style={{ background: form.primaryColor, color: form.announcementTextColor }}>
                {form.announcementIcon} {form.announcement}
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white p-2.5">
                <div className="flex items-center gap-2">
                  {form.logoUrl ? <img src={form.logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain" /> : <span className="grid h-8 w-8 place-items-center rounded-lg text-sm" style={{ background: form.primaryColor, color: form.accentColor }}>♨</span>}
                  <div><p className="text-[10px] font-extrabold" style={{ color: form.primaryColor }}>{form.storeName}</p><p className="text-[8px] text-ink-400">{form.tagline}</p></div>
                </div>
                <span className="rounded-full px-2 py-1 text-[8px] font-bold text-white" style={{ background: form.primaryColor }}>السلة ٠</span>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl bg-white p-2.5">
                {form.heroImageUrl ? <img src={form.heroImageUrl} alt="" className="h-28 w-full rounded-lg object-cover" /> : <div className="grid h-28 place-items-center rounded-lg text-3xl" style={{ background: form.surfaceColor }}>🐑</div>}
                <p className="mt-2 text-[9px] font-bold" style={{ color: form.accentColor }}>{form.storeName} | {form.tagline}</p>
                <p className="mt-0.5 text-sm font-extrabold" style={{ color: form.primaryColor }}>{form.heroTitle}</p>
                <p className="mt-1 line-clamp-2 text-[8px] leading-4 text-ink-500">{form.heroSubtitle}</p>
                <button type="button" className="mt-2 rounded-lg px-3 py-1.5 text-[9px] font-bold text-white" style={{ background: form.primaryColor }}>تصفح المنتجات</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[0, 1].map((item) => <div key={item} className="rounded-xl p-2" style={{ background: form.productCardBackground, border: `1px solid ${form.productCardBorder}` }}><div className="h-10 rounded-lg" style={{ background: form.surfaceColor }} /><p className="mt-1 text-[8px] font-bold">ذبيحة طازجة</p><p className="text-[9px] font-extrabold" style={{ color: form.primaryColor }}>١٬١٩٩ ر.س</p></div>)}
              </div>
              <div className="mt-2 rounded-xl px-3 py-2 text-[9px] font-bold text-white" style={{ background: form.footerDark ? "#202020" : form.primaryColor }}>
                تذييل المتجر · {form.phone}
              </div>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-xs font-bold text-ink-900">ملخص الثيم</h3>
            <dl className="mt-2 space-y-2 text-[10px]">
              {[["الثيم", activeTheme.name], ["عناصر الصفحة", `${form.homepageSections.filter((section) => section.enabled).length} ظاهر`], ["الخط", form.fontFamily], ["تحميل", form.loadingPageEnabled ? `${form.loaderDuration} ثانية` : "متوقف"], ["الواجهة", form.maintenanceMode ? "صيانة" : "نشطة"]].map(([label, value]) => <div key={label} className="flex justify-between gap-2 border-b border-dashed border-stone-100 pb-1.5 last:border-0"><dt className="text-ink-400">{label}</dt><dd className="font-bold text-ink-800">{value}</dd></div>)}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="flex items-center gap-2"><input type="color" value={value || "#ffffff"} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-stone-200 bg-white p-1" /><Input value={value} onChange={(event) => onChange(event.target.value)} dir="ltr" className="font-mono text-xs" /></div>;
}

function ImageField({ label, value, onChange, hint, onUpload }: { label: string; value: string | null; onChange: (value: string | null) => void; hint?: string; onUpload?: (file?: File) => void }) {
  return (
    <Field label={label} hint={hint}>
      <div className="space-y-2">
        <Input value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} dir="ltr" placeholder="https://..." />
        {onUpload ? (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1.5 text-[10px] font-bold text-ink-600 hover:bg-stone-200">
            <Icon name="plus" className="h-3 w-3" /> رفع صورة من الجهاز
            <input type="file" accept="image/*,.svg" className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} />
          </label>
        ) : null}
        {value ? <img src={value} alt="معاينة" className="h-14 w-14 rounded-xl border border-stone-200 bg-white object-contain p-1" /> : null}
      </div>
    </Field>
  );
}

function ToggleGroup({
  fields,
  form,
  onChange,
}: {
  fields: { key: keyof StoreSettings; label: string }[];
  form: StoreSettings;
  onChange: <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fields.map((item) => (
        <ThemeToggle
          key={item.key}
          checked={Boolean(form[item.key])}
          label={item.label}
          onChange={(checked) => {
            if (isBooleanField(form[item.key])) onChange(item.key, checked as StoreSettings[typeof item.key]);
          }}
        />
      ))}
    </div>
  );
}
