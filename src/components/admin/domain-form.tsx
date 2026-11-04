"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Input } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";

type StoreLink = { id: number; name: string; slug: string };
type DomainSettings = { customDomain: string | null; domainStatus: string };

const PROVIDERS = [
  { name: "السعودية نِك (دومين .sa)", url: "https://nic.sa", note: "الأفضل لهوية سعودية · FL المطلوبة" },
  { name: "Namecheap", url: "https://namecheap.com", note: "دومينات .com بأسعار اقتصادية" },
  { name: "Cloudflare Registrar", url: "https://cloudflare.com/products/registrar", note: "سعر التكلفة + حماية DNS مجانية" },
  { name: "Hostinger", url: "https://hostinger.com", note: "دومين + استضافة بأسعار مناسبة" },
  { name: "Vercel", url: "https://vercel.com/domains", note: "شراء دومين وربطه بالنشر مباشرة" },
  { name: "GoDaddy", url: "https://godaddy.com", note: "خيارات دومين متعددة" },
];

const RECORDS = [
  { type: "A", host: "@", value: "76.76.21.21", ttl: "Auto", note: "يشير للاستضافة (خذ القيمة من مزودك)" },
  { type: "CNAME", host: "www", value: "cname.vercel-dns.com", ttl: "Auto", note: "يجعل www يعمل مع الدومين" },
  { type: "TXT", host: "_vercel", value: "vercel-verify=xxxxx", ttl: "Auto", note: "تحقق ملكية الدومين" },
];

export function DomainForm({
  appUrl,
  domain: initialDomain,
  status: initialStatus,
  stores,
}: {
  appUrl: string;
  domain: string;
  status: string;
  stores: StoreLink[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [domain, setDomain] = useState(initialDomain);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const storeUrls = stores.map((store) => ({
    ...store,
    url: domain.trim() && status === "active"
      ? `https://${domain.trim()}/${store.slug}`
      : `${appUrl}/${store.slug}`,
  }));

  async function save(nextStatus = status) {
    setSaving(true);
    try {
      const effectiveStatus = domain.trim() ? nextStatus : "none";
      const response = await fetch("/api/settings/domain", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: domain.trim() || null, domainStatus: effectiveStatus }),
      });
      const data = (await response.json()) as { settings?: DomainSettings; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error ?? "تعذر حفظ الدومين");
      setStatus(data.settings.domainStatus);
      toast(effectiveStatus === "active" ? "تم تأكيد ربط دومين المنصة" : effectiveStatus === "none" ? "تم حذف الدومين المشترك" : "تم حفظ الدومين — بانتظار DNS");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ الدومين", "error");
    } finally {
      setSaving(false);
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast(`تم نسخ ${label}`);
    } catch {
      toast("تعذر النسخ، انسخ يدوياً", "error");
    }
  }

  const statusMeta =
    status === "active"
      ? { label: "مرتبط ويعمل", tone: "success" as const }
      : status === "pending"
        ? { label: "بانتظار DNS", tone: "warning" as const }
        : { label: "غير مرتبط", tone: "neutral" as const };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-ink-900">دومين واحد لجميع المتاجر</h2>
              <p className="mt-0.5 text-[11px] text-ink-400">اربط دومين المنصة مرة واحدة، ويكون لكل متجر مساره الخاص عليه.</p>
            </div>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_auto]">
            <Field label="الدومين المشترك">
              <Input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="your-store.com"
                dir="ltr"
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button size="md" icon="check" onClick={() => save("pending")} loading={saving}>
                {domain.trim() ? "حفظ" : "حذف الدومين"}
              </Button>
              <Button size="md" variant="secondary" icon="sparkles" onClick={() => save("active")} loading={saving}>
                تأكيد الربط
              </Button>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-stone-50 p-3">
            <p className="text-[10px] font-bold text-ink-500">روابط جميع المتاجر على الدومين نفسه</p>
            <ul className="mt-1.5 space-y-1.5">
              {storeUrls.map((store) => (
                <li key={store.id} className="flex min-w-0 items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-[10px] text-ink-600">{store.name}</span>
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-2 text-[11px] font-bold text-ink-700 ring-1 ring-stone-200" dir="ltr">
                    {store.url}
                  </code>
                  <Button size="sm" variant="secondary" onClick={() => copy(store.url, "الرابط")}>
                    نسخ
                  </Button>
                  <Link
                    href={store.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`فتح متجر ${store.name}`}
                    className="inline-flex h-9 items-center gap-1 rounded-xl bg-ink-900 px-3 text-[11px] font-bold text-white"
                  >
                    فتح
                    <Icon name="arrowLeft" className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-3.5">
            <h3 className="text-sm font-bold text-ink-900">سجلات DNS المطلوبة</h3>
            <p className="mt-0.5 text-[11px] text-ink-400">أضفها من لوحة مزود الدومين، وقد تستغرق حتى ٢٤ ساعة للتفعيل.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-stone-50/70 text-ink-400">
                <tr>
                  <th className="px-4 py-2 text-start font-bold">النوع</th>
                  <th className="px-4 py-2 text-start font-bold">الاسم</th>
                  <th className="px-4 py-2 text-start font-bold">القيمة</th>
                  <th className="px-4 py-2 text-start font-bold">TTL</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {RECORDS.map((record) => (
                  <tr key={`${record.type}-${record.host}`}>
                    <td className="px-4 py-2.5 font-bold text-ink-800">{record.type}</td>
                    <td className="px-4 py-2.5 text-ink-600" dir="ltr">{record.host}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-ink-600" dir="ltr">{record.value}</td>
                    <td className="px-4 py-2.5 text-ink-400">{record.ttl}</td>
                    <td className="px-4 py-2.5 text-end">
                      <button
                        type="button"
                        onClick={() => copy(record.value, "القيمة")}
                        className="rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold text-ink-600 hover:bg-stone-200"
                      >
                        نسخ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-stone-100 bg-amber-50 px-5 py-2.5 text-[10px] leading-5 text-amber-900">
            ملاحظة: القيم أعلاه أمثلة توضيحية. بعد ربط الاستضافة (Vercel أو غيرها) ستجد القيم الفعلية في لوحة الاستضافة ← Domains.
          </p>
        </div>

        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Icon name="box" className="h-4 w-4 text-brand-600" />
            الموقع والتطبيق — تثبيت على الجوال
          </h3>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              "افتح رابط المتجر من جوالك (iPhone: Safari / أندرويد: Chrome).",
              "اضغط زر المشاركة أو القائمة ⋮ ثم «إضافة إلى الشاشة الرئيسية».",
              "سيظهر اختصار المتجر على الشاشة الرئيسية ويعمل بملء الشاشة.",
              "تُحفظ طلبات هذا المتجر في لوحة الإدارة الخاصة به.",
            ].map((step, index) => (
              <li key={step} className="flex gap-2 rounded-xl bg-stone-50 p-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-[10px] leading-5 text-ink-600">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="text-xs font-bold text-ink-900">أين تحجز دومينك؟</h3>
          <p className="mt-0.5 text-[10px] text-ink-400">روابط رسمية لمزودي الدومينات والاستضافة.</p>
          <ul className="mt-3 space-y-1.5">
            {PROVIDERS.map((provider) => (
              <li key={provider.name}>
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-stone-50 px-2.5 py-2 transition hover:bg-brand-50"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-stone-200">
                    <Icon name="pin" className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-ink-800">{provider.name}</span>
                    <span className="block truncate text-[9px] text-ink-400">{provider.note}</span>
                  </span>
                  <Icon name="chevronLeft" className="h-3 w-3 shrink-0 text-ink-300" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-ink-900 p-5 text-white">
          <h3 className="flex items-center gap-2 text-xs font-bold">
            <Icon name="sparkles" className="h-4 w-4 text-brand-300" />
            ماذا يعطيك الدومين؟
          </h3>
          <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-white/60">
            <li>• رابط قصير يسهل حفظه يحمل اسم متجرك ونطاقه.</li>
            <li>• ثقة أعلى للعميل + شهادة SSL مجانية (https).</li>
            <li>• بريد رسمي على الدومين مثل info@your-store.com.</li>
            <li>• الأرشفة في قوقل وظهور المتجر في البحث.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
