"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Input, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { AppDownloadSettingsEditor } from "@/components/admin/app-download-settings-editor";
import type { AppDownloadSettings } from "@/lib/store-defaults";

type Platform = "android" | "ios" | "windows";
type ReleaseStatus = "draft" | "ready" | "archived";
type AppRelease = {
  id: number;
  releaseGroup: string;
  platform: string;
  version: string;
  notes: string;
  artifactUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const PLATFORM_LABELS: Record<Platform, { name: string; icon: string; availability: string }> = {
  android: { name: "Android", icon: "🤖", availability: "مشروع Android موجود؛ لا يوجد نشر تلقائي مهيأ." },
  ios: { name: "iPhone / iOS", icon: "🍎", availability: "مسودة فقط حتى إعداد مشروع iOS وحساب Apple Developer." },
  windows: { name: "Windows", icon: "💻", availability: "إعداد بناء Windows موجود؛ لا يوجد نشر تلقائي مهيأ." },
};

const STATUS_LABELS: Record<ReleaseStatus, string> = {
  draft: "مسودة",
  ready: "جاهز للمراجعة",
  archived: "مؤرشف",
};

const STATUS_TONES: Record<ReleaseStatus, "neutral" | "warning" | "success"> = {
  draft: "neutral",
  ready: "warning",
  archived: "success",
};

export function AppReleasesView({
  initial,
  downloadSettings,
  storeName,
  storeId = 1,
}: {
  initial: AppRelease[];
  downloadSettings: AppDownloadSettings;
  storeName: string;
  storeId?: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["android", "windows"]);
  const [artifacts, setArtifacts] = useState<Record<Platform, string>>({ android: "", ios: "", windows: "" });
  const [saving, setSaving] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<"phone" | "desktop">("phone");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draftValues, setDraftValues] = useState<Record<number, { notes: string; artifactUrl: string }>>(() =>
    Object.fromEntries(initial.map((release) => [release.id, { notes: release.notes, artifactUrl: release.artifactUrl ?? "" }])),
  );

  function togglePlatform(platform: Platform) {
    setPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    );
  }

  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (platforms.length === 0) {
      toast("اختر منصة واحدة على الأقل", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/app-releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, notes, platforms, artifacts }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر حفظ مسودة الإصدار");
      setVersion("");
      setNotes("");
      setArtifacts({ android: "", ios: "", windows: "" });
      toast("تم حفظ مسودات المنصات المختارة");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ المسودة", "error");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(release: AppRelease, status: ReleaseStatus) {
    setBusyId(release.id);
    try {
      const response = await fetch("/api/app-releases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: release.id, status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر تحديث الحالة");
      toast("تم تحديث حالة الإصدار");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر تحديث الحالة", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function saveDraftChanges(release: AppRelease) {
    const values = draftValues[release.id];
    if (!values) return;
    setBusyId(release.id);
    try {
      const response = await fetch("/api/app-releases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: release.id, ...values }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر حفظ تعديلات المسودة");
      toast("تم حفظ تعديلات المسودة");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ التعديلات", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDraft(release: AppRelease) {
    if (!window.confirm(`حذف مسودة ${PLATFORM_LABELS[release.platform as Platform]?.name ?? release.platform} ${release.version}؟`)) return;
    setBusyId(release.id);
    try {
      const response = await fetch(`/api/app-releases?id=${release.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر حذف المسودة");
      toast("تم حذف المسودة");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حذف المسودة", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AppDownloadSettingsEditor initial={downloadSettings} storeName={storeName} storeId={storeId} />
      <section className="card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-extrabold text-ink-900">إصدار جديد مترابط</h2>
          <p className="mt-1 text-[11px] leading-5 text-ink-400">
            احفظ مسودات Android وiOS وWindows ضمن رقم إصدار واحد. الحفظ لا ينشر التطبيق ولا يشغّل الملفات.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {(Object.entries(PLATFORM_LABELS) as [Platform, (typeof PLATFORM_LABELS)[Platform]][]).map(([platform, info]) => (
            <label key={platform} className="flex cursor-pointer gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
              <input
                type="checkbox"
                checked={platforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
                className="mt-1 h-4 w-4 accent-emerald-700"
              />
              <span className="text-xl">{info.icon}</span>
              <span>
                <span className="block text-xs font-extrabold text-ink-800">{info.name}</span>
                <span className="mt-1 block text-[9px] leading-4 text-ink-400">{info.availability}</span>
              </span>
            </label>
          ))}
        </div>

        <form onSubmit={saveDraft} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="رقم الإصدار" required hint="استخدم صيغة مثل 1.2.3">
              <Input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.1" pattern="[0-9]+\.[0-9]+\.[0-9]+([-+][A-Za-z0-9.-]+)?" required />
            </Field>
            <Field label="ملاحظات الإصدار">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} placeholder="ملخص التغييرات في هذا الإصدار" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {platforms.map((platform) => (
              <Field
                key={platform}
                label={`رابط ملف ${PLATFORM_LABELS[platform].name} (اختياري)`}
                hint="رابط HTTPS لملف إصدار جاهز من مصدر موثوق."
              >
                <Input
                  type="url"
                  value={artifacts[platform]}
                  onChange={(event) => setArtifacts((current) => ({ ...current, [platform]: event.target.value }))}
                  placeholder="https://..."
                  dir="ltr"
                />
              </Field>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-[10px] leading-5 text-amber-800">
              رفع الملفات مباشرة غير متاح حالياً لعدم وجود مخزن ملفات مهيأ. روابط الملفات لا تعني التوزيع؛ iOS يبقى مسودة حتى إعداد Apple.
            </p>
            <Button type="submit" icon="check" loading={saving}>حفظ المسودة</Button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="card space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-ink-900">معاينة المتجر</h2>
              <p className="mt-1 text-[10px] text-ink-400">معاينة مباشرة لآخر إعدادات محفوظة؛ لا تنشر بناءً أصلياً.</p>
            </div>
            <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
              {(["phone", "desktop"] as const).map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => setPreviewWidth(width)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${previewWidth === width ? "bg-white text-ink-900 shadow-sm" : "text-ink-400"}`}
                >
                  {width === "phone" ? "جوال" : "كمبيوتر"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center overflow-hidden rounded-2xl bg-stone-100 p-3">
            <div className={`overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-inner transition-[width] ${previewWidth === "phone" ? "w-[375px]" : "w-full"}`}>
              <iframe title="معاينة واجهة المتجر" src="/" className="h-[560px] w-full bg-white" />
            </div>
          </div>
          <Link href={`/dashboard/settings/store?storeId=${storeId}`} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-700">
            <Icon name="settings" className="h-3.5 w-3.5" /> تعديل إعدادات المتجر
          </Link>
        </div>

        <div className="card space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-extrabold text-ink-900">سجل الإصدارات والمسودات</h2>
            <p className="mt-1 text-[10px] leading-5 text-ink-400">الحالات هنا تنظيمية فقط؛ لا يوجد نشر أو رفع ملفات تلقائي في هذه المرحلة.</p>
          </div>
          {initial.length === 0 ? (
            <div className="rounded-xl bg-stone-50 px-4 py-8 text-center text-xs text-ink-400">لا توجد مسودات إصدارات محفوظة.</div>
          ) : (
            <ul className="space-y-2">
              {initial.map((release) => {
                const platform = PLATFORM_LABELS[release.platform as Platform];
                const status = (release.status in STATUS_LABELS ? release.status : "draft") as ReleaseStatus;
                return (
                  <li key={release.id} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-ink-900">{platform?.icon} {platform?.name ?? release.platform} · {release.version}</p>
                        <p className="mt-1 text-[9px] text-ink-400">{new Date(release.createdAt).toLocaleString("ar-SA")}</p>
                      </div>
                      <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
                    </div>
                    {status === "draft" ? (
                      <div className="mt-3 space-y-2">
                        <Field label="ملاحظات الإصدار">
                          <Textarea
                            value={draftValues[release.id]?.notes ?? release.notes}
                            maxLength={2000}
                            onChange={(event) => setDraftValues((current) => ({
                              ...current,
                              [release.id]: { notes: event.target.value, artifactUrl: current[release.id]?.artifactUrl ?? release.artifactUrl ?? "" },
                            }))}
                          />
                        </Field>
                        <Field label="رابط ملف الإصدار" hint="رابط HTTPS اختياري؛ لا يتم رفع الملف أو تشغيله من لوحة التحكم.">
                          <Input
                            type="url"
                            value={draftValues[release.id]?.artifactUrl ?? release.artifactUrl ?? ""}
                            onChange={(event) => setDraftValues((current) => ({
                              ...current,
                              [release.id]: { notes: current[release.id]?.notes ?? release.notes, artifactUrl: event.target.value },
                            }))}
                            dir="ltr"
                            placeholder="https://..."
                          />
                        </Field>
                        <Button size="sm" variant="secondary" icon="check" disabled={busyId === release.id} loading={busyId === release.id} onClick={() => void saveDraftChanges(release)}>
                          حفظ تعديلات المسودة
                        </Button>
                      </div>
                    ) : (
                      <>
                        {release.notes ? <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-ink-600">{release.notes}</p> : null}
                        {release.artifactUrl ? (
                          <a href={release.artifactUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-[10px] font-bold text-sky-700" dir="ltr">
                            رابط ملف الإصدار
                          </a>
                        ) : null}
                      </>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-1.5">
                        {(["draft", "ready", "archived"] as const).map((nextStatus) => (
                          <Button
                            key={nextStatus}
                            size="sm"
                            variant={status === nextStatus ? "subtle" : "secondary"}
                            disabled={status === nextStatus || (release.platform === "ios" && nextStatus === "ready")}
                            loading={busyId === release.id && status !== nextStatus}
                            onClick={() => void updateStatus(release, nextStatus)}
                          >
                            {STATUS_LABELS[nextStatus]}
                          </Button>
                        ))}
                      </div>
                      {status === "draft" ? (
                        <Button size="sm" variant="danger" icon="trash" disabled={busyId === release.id} onClick={() => void deleteDraft(release)}>
                          حذف المسودة
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
