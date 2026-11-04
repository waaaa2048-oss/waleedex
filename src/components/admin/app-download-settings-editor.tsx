"use client";

import { useState } from "react";
import { Badge, Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/toast";
import { DEFAULT_SETTINGS as DEFAULT_APP_DOWNLOAD_SETTINGS, type AppDownloadSettings } from "@/lib/store-defaults";

type PlatformKey = keyof AppDownloadSettings["platforms"];

const PLATFORMS: { key: PlatformKey; label: string }[] = [
  { key: "android", label: "Android" },
  { key: "ios", label: "iPhone / iPad" },
  { key: "windows", label: "Windows" },
];

function VisibilityToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-bold text-ink-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-700" />
      {label}
    </label>
  );
}

export function AppDownloadSettingsEditor({
  initial,
  storeName,
  storeId = 1,
}: {
  initial: AppDownloadSettings;
  storeName: string;
  storeId?: number;
}) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AppDownloadSettings>(key: K, value: AppDownloadSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updatePlatform(key: PlatformKey, value: Partial<AppDownloadSettings["platforms"][PlatformKey]>) {
    setSettings((current) => ({
      ...current,
      platforms: { ...current.platforms, [key]: { ...current.platforms[key], ...value } },
    }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/app-download-settings?storeId=${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = (await response.json()) as { error?: string; settings?: AppDownloadSettings };
      if (!response.ok || !data.settings) throw new Error(data.error ?? "تعذر حفظ إعدادات صفحة التطبيق");
      setSettings(data.settings);
      toast("تم حفظ إعدادات صفحة تنزيل التطبيق");
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  }

  const previewText = settings.heroTitle.replaceAll("{storeName}", storeName || "اسم المتجر");
  const visiblePlatforms = PLATFORMS.filter(({ key }) => settings.platforms[key].visible);

  return (
    <section className="card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-extrabold text-ink-900">التحكم بصفحة تنزيل التطبيق</h2>
        <p className="mt-1 text-[11px] leading-5 text-ink-400">
          عدّل النصوص وأخفِ الأقسام أو أظهرها. المعاينة تعرض تغييراتك قبل حفظها؛ وتظهر للزوار بعد الحفظ.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={save} className="space-y-3">
          <fieldset className="space-y-3 rounded-xl border border-stone-200 p-3">
            <legend className="px-1 text-xs font-extrabold text-ink-800">مقدمة الصفحة</legend>
            <VisibilityToggle label="إظهار مقدمة الصفحة" checked={settings.showHero} onChange={(value) => update("showHero", value)} />
            <Field label="الشارة"><Input value={settings.heroBadge} onChange={(event) => update("heroBadge", event.target.value)} maxLength={240} /></Field>
            <Field label="العنوان" hint="اكتب {storeName} لإدراج اسم متجرك تلقائياً."><Input value={settings.heroTitle} onChange={(event) => update("heroTitle", event.target.value)} maxLength={240} /></Field>
            <Field label="الوصف"><Textarea value={settings.heroDescription} onChange={(event) => update("heroDescription", event.target.value)} maxLength={1500} /></Field>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-stone-200 p-3">
            <legend className="px-1 text-xs font-extrabold text-ink-800">أزرار التثبيت والتحديث</legend>
            <VisibilityToggle label="إظهار منطقة أزرار التطبيق" checked={settings.showControls} onChange={(value) => update("showControls", value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <VisibilityToggle label="إظهار زر التثبيت" checked={settings.showInstallButton} onChange={(value) => update("showInstallButton", value)} />
                <Field label="نص زر التثبيت"><Input value={settings.installButtonText} onChange={(event) => update("installButtonText", event.target.value)} maxLength={240} /></Field>
              </div>
              <div className="space-y-2">
                <VisibilityToggle label="إظهار زر التحديث" checked={settings.showUpdateButton} onChange={(value) => update("showUpdateButton", value)} />
                <Field label="نص زر التحديث"><Input value={settings.updateButtonText} onChange={(event) => update("updateButtonText", event.target.value)} maxLength={240} /></Field>
                <Field label="النص عند توفر تحديث"><Input value={settings.updateReadyText} onChange={(event) => update("updateReadyText", event.target.value)} maxLength={240} /></Field>
              </div>
            </div>
            <VisibilityToggle label="إظهار وصف الأزرار" checked={settings.showControlsDescription} onChange={(value) => update("showControlsDescription", value)} />
            <Field label="وصف الأزرار"><Textarea value={settings.controlsDescription} onChange={(event) => update("controlsDescription", event.target.value)} maxLength={1500} /></Field>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-stone-200 p-3">
            <legend className="px-1 text-xs font-extrabold text-ink-800">هوية المتجر وقسم التطبيق الواحد</legend>
            <VisibilityToggle label="إظهار بطاقة شعار واسم المتجر" checked={settings.showIdentity} onChange={(value) => update("showIdentity", value)} />
            <Field label="النص أسفل اسم المتجر"><Input value={settings.identityCaption} onChange={(event) => update("identityCaption", event.target.value)} maxLength={240} /></Field>
            <VisibilityToggle label="إظهار قسم تطبيق واحد لكل الأجهزة" checked={settings.showSingleApp} onChange={(value) => update("showSingleApp", value)} />
            <Field label="عنوان القسم"><Input value={settings.singleAppTitle} onChange={(event) => update("singleAppTitle", event.target.value)} maxLength={240} /></Field>
            <Field label="وصف القسم"><Textarea value={settings.singleAppDescription} onChange={(event) => update("singleAppDescription", event.target.value)} maxLength={1500} /></Field>
            <Field label="شارة الأنظمة"><Input value={settings.platformsBadge} onChange={(event) => update("platformsBadge", event.target.value)} maxLength={240} /></Field>
            <VisibilityToggle label="إظهار بطاقة التحكم من لوحة المتجر" checked={settings.showManagementCard} onChange={(value) => update("showManagementCard", value)} />
            <Field label="عنوان بطاقة التحكم"><Input value={settings.managementTitle} onChange={(event) => update("managementTitle", event.target.value)} maxLength={240} /></Field>
            <Field label="وصف بطاقة التحكم"><Textarea value={settings.managementDescription} onChange={(event) => update("managementDescription", event.target.value)} maxLength={1500} /></Field>
            <Field label="نص رابط إدارة التطبيق"><Input value={settings.managementLinkText} onChange={(event) => update("managementLinkText", event.target.value)} maxLength={240} /></Field>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-stone-200 p-3">
            <legend className="px-1 text-xs font-extrabold text-ink-800">خطوات التثبيت حسب الجهاز</legend>
            <VisibilityToggle label="إظهار قسم خطوات التثبيت" checked={settings.showPlatformGuide} onChange={(value) => update("showPlatformGuide", value)} />
            {PLATFORMS.map(({ key, label }) => {
              const platform = settings.platforms[key];
              return (
                <div key={key} className="space-y-2 rounded-lg bg-stone-50 p-3">
                  <VisibilityToggle label={`إظهار ${label}`} checked={platform.visible} onChange={(value) => updatePlatform(key, { visible: value })} />
                  <div className="grid gap-2 sm:grid-cols-[1fr_5rem]">
                    <Field label="عنوان المنصة"><Input value={platform.title} onChange={(event) => updatePlatform(key, { title: event.target.value })} maxLength={120} /></Field>
                    <Field label="الرمز"><Input value={platform.icon} onChange={(event) => updatePlatform(key, { icon: event.target.value })} maxLength={12} /></Field>
                  </div>
                  {platform.steps.map((step, index) => (
                    <Field key={index} label={`الخطوة ${index + 1}`}>
                      <Input
                        value={step}
                        onChange={(event) => updatePlatform(key, { steps: platform.steps.map((item, stepIndex) => stepIndex === index ? event.target.value : item) })}
                        maxLength={500}
                      />
                    </Field>
                  ))}
                </div>
              );
            })}
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-stone-200 p-3">
            <legend className="px-1 text-xs font-extrabold text-ink-800">التحديثات وروابط أسفل الصفحة</legend>
            <VisibilityToggle label="إظهار قسم التحديثات" checked={settings.showUpdates} onChange={(value) => update("showUpdates", value)} />
            <Field label="عنوان التحديثات"><Input value={settings.updatesTitle} onChange={(event) => update("updatesTitle", event.target.value)} maxLength={240} /></Field>
            <Field label="وصف التحديثات"><Textarea value={settings.updatesDescription} onChange={(event) => update("updatesDescription", event.target.value)} maxLength={1500} /></Field>
            <VisibilityToggle label="إظهار روابط المتجر والحساب" checked={settings.showFooterLinks} onChange={(value) => update("showFooterLinks", value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="رابط العودة للمتجر"><Input value={settings.homeLinkText} onChange={(event) => update("homeLinkText", event.target.value)} maxLength={120} /></Field>
              <Field label="رابط الحساب"><Input value={settings.accountLinkText} onChange={(event) => update("accountLinkText", event.target.value)} maxLength={120} /></Field>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="secondary" onClick={() => setSettings(DEFAULT_APP_DOWNLOAD_SETTINGS as unknown as AppDownloadSettings)}>استعادة النصوص الافتراضية</Button>
            <Button type="submit" icon="check" loading={saving}>حفظ إعدادات صفحة التنزيل</Button>
          </div>
        </form>

        <aside className="space-y-2 xl:sticky xl:top-4 xl:self-start">
          <div>
            <h3 className="text-xs font-extrabold text-ink-800">معاينة مباشرة للمسودة</h3>
            <p className="mt-1 text-[10px] text-ink-400">المعاينة تتغير مع الحقول دون حفظ.</p>
          </div>
          <div className="max-h-[75vh] space-y-3 overflow-auto rounded-xl bg-stone-100 p-3">
            {(settings.showHero || settings.showIdentity) ? (
              <div className="space-y-3 rounded-2xl bg-emerald-800 p-4 text-white">
                {settings.showHero ? (
                  <div>
                    <Badge tone="brand">{settings.heroBadge}</Badge>
                    <h3 className="mt-3 text-lg font-black">{previewText}</h3>
                    <p className="mt-2 text-xs leading-6 text-white/75">{settings.heroDescription}</p>
                    {settings.showControls ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {settings.showInstallButton ? <span className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-emerald-900">{settings.installButtonText}</span> : null}
                          {settings.showUpdateButton ? <span className="rounded-lg bg-white/15 px-3 py-2 text-[10px] font-bold">{settings.updateButtonText}</span> : null}
                        </div>
                        {settings.showControlsDescription ? <p className="text-[10px] leading-5 text-white/70">{settings.controlsDescription}</p> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {settings.showIdentity ? (
                  <div className="rounded-xl bg-white/10 p-3 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-2xl">🐑</span>
                    <p className="mt-2 text-xs font-bold">{storeName} | اسم المتجر</p>
                    <p className="mt-1 text-[10px] text-white/70">{settings.identityCaption}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {settings.showSingleApp ? (
              <section className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h4 className="text-xs font-extrabold">{settings.singleAppTitle}</h4><p className="mt-1 text-[10px] leading-5 text-stone-500">{settings.singleAppDescription}</p></div>
                  <Badge tone="brand">{settings.platformsBadge}</Badge>
                </div>
                {settings.showManagementCard ? <div className="mt-3 rounded-lg bg-stone-50 p-3"><p className="text-[11px] font-bold">{settings.managementTitle}</p><p className="mt-1 text-[10px] leading-5 text-stone-500">{settings.managementDescription}</p><span className="mt-2 inline-block text-[10px] font-bold text-emerald-800">{settings.managementLinkText}</span></div> : null}
              </section>
            ) : null}
            {settings.showPlatformGuide && visiblePlatforms.length ? (
              <div className="grid gap-2">
                {visiblePlatforms.map(({ key }) => {
                  const platform = settings.platforms[key];
                  return <article key={key} className="rounded-xl border border-stone-200 bg-white p-3"><h4 className="text-xs font-bold">{platform.icon} {platform.title}</h4><ol className="mt-2 list-inside list-decimal space-y-1 text-[10px] leading-5 text-stone-600">{platform.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></article>;
                })}
              </div>
            ) : null}
            {settings.showUpdates ? <section className="rounded-xl bg-white p-3"><h4 className="text-xs font-bold">{settings.updatesTitle}</h4><p className="mt-1 text-[10px] leading-5 text-stone-600">{settings.updatesDescription}</p></section> : null}
            {settings.showFooterLinks ? <div className="flex justify-center gap-2 text-[10px] font-bold text-emerald-800"><span>{settings.homeLinkText}</span><span>{settings.accountLinkText}</span></div> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}