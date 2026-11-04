"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ConfirmDialog, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/format";
import type { IntegrationDTO } from "@/lib/admin-data";

const HELP: Record<string, string> = {
  analytics: "أنشئ خاصية Google Analytics 4 وانسخ معرّف القياس الذي يبدأ بـ G-.",
  "google-ads": "انسخ رقم حساب Google Ads أو معرّف التحويل الذي يبدأ بـ AW-. حفظ الرقم هنا لا يفعّل وسم التحويل تلقائياً.",
  "search-console": "أضف الدومين كموقع وانسخ رابط التحقق.",
  "meta-pixel": "من Events Manager انسخ Pixel ID.",
  "tiktok-pixel": "من TikTok Ads انسخ Pixel ID.",
  "snap-pixel": "من Snap Ads انسخ Pixel ID.",
  "google-maps": "افتح نشاطك على الخريطة وانسخ رابط المشاركة.",
  whatsapp: "ضع رقم الواتساب بالصيغة الدولية بدون +.",
  tabby: "اربط حساب التاجر من لوحة تابي.",
  tamara: "اربط حساب التاجر من لوحة تمارا.",
  mada: "يتطلب بوابة دفع (مثل HyperPay / Moyasar).",
  "domain-sa": "يتطلب وثيقة العمل الحر والسجل التجاري.",
  maroof: "أنشئ حساب معروف وأضف رقم التوثيق.",
};

export function IntegrationsView({
  initial,
  storeId,
  storeName,
}: {
  initial: IntegrationDTO[];
  storeId: number;
  storeName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "أدوات أخرى", url: "", accountId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<IntegrationDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))), [items]);
  const visible = useMemo(
    () => items.filter((item) => category === "all" || item.category === category),
    [items, category],
  );
  const enabled = items.filter((item) => item.isEnabled).length;

  async function saveItem(item: IntegrationDTO, patch: Partial<IntegrationDTO>) {
    const previous = items;
    const next = { ...item, ...patch };
    setItems((current) => current.map((entry) => (entry.id === item.id ? next : entry)));
    try {
      const response = await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...next, storeId }),
      });
      if (!response.ok) throw new Error("تعذر حفظ التكامل");
      toast("تم حفظ إعدادات التكامل");
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast(error instanceof Error ? error.message : "تعذر الحفظ", "error");
    }
  }

  async function addCustom() {
    if (form.name.trim().length < 2) {
      toast("أدخل اسم الموقع", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isEnabled: true, storeId }),
      });
      const data = (await response.json()) as { integration?: IntegrationDTO; error?: string };
      if (!response.ok || !data.integration) throw new Error(data.error ?? "تعذر الإضافة");
      setItems((current) => [...current, data.integration as IntegrationDTO]);
      setOpen(false);
      setForm({ name: "", category: "أدوات أخرى", url: "", accountId: "", notes: "" });
      toast("تمت إضافة الموقع");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر الإضافة", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setDeleteLoading(true);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== deleting.id));
    try {
      const response = await fetch(`/api/integrations?id=${deleting.id}&storeId=${storeId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("تعذر حذف التكامل");
      toast("تم حذف التكامل");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast(error instanceof Error ? error.message : "تعذر الحذف", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-bold text-ink-900">مواقع وأدوات تخدم متجرك</h2>
          <p className="mt-0.5 text-[11px] text-ink-400">
            إعدادات التكاملات خاصة بمتجر {storeName}. احفظ بيانات الحساب وروابط الأدوات هنا؛ {enabled} مفعّلة من {items.length}.
          </p>
        </div>
        <Button size="sm" icon="plus" onClick={() => setOpen(true)}>
          إضافة موقع
        </Button>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white p-2">
        {["all", ...categories].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold transition",
              category === item ? "bg-ink-900 text-white" : "bg-stone-100/80 text-ink-500 hover:bg-stone-100",
            )}
          >
            {item === "all" ? "كل الخدمات" : item}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <IntegrationCard
            key={item.id}
            item={item}
            onToggle={() => saveItem(item, { isEnabled: !item.isEnabled })}
            onSave={(accountId, url) => saveItem(item, { accountId: accountId || null, url: url || "https://" })}
            onDelete={() => setDeleting(item)}
          />
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة موقع أو أداة"
        description="أضف أي خدمة أو رابط يفيد متجرك — يبقى محفوظاً في حسابك."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button size="sm" icon="check" onClick={addCustom} loading={saving}>إضافة</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="اسم الموقع / الأداة" required>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="مثال: منصة إعلانات" />
          </Field>
          <Field label="التصنيف">
            <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {["أدوات أخرى", "التواصل", "السوشيال ميديا", "التحليلات", "الدفع", "الدومين والاستضافة", "قنوات البيع"].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </Field>
          <Field label="الرابط">
            <Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} dir="ltr" placeholder="https://" />
          </Field>
          <Field label="معرّف الحساب / المفتاح">
            <Input value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} dir="ltr" />
          </Field>
          <Field label="ملاحظات">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`حذف ${deleting?.name ?? ""}؟`}
        description="سيُحذف هذا التكامل من قائمتك."
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        loading={deleteLoading}
      />
    </div>
  );
}

function IntegrationCard({
  item,
  onToggle,
  onSave,
  onDelete,
}: {
  item: IntegrationDTO;
  onToggle: () => void;
  onSave: (accountId: string, url: string) => void;
  onDelete: () => void;
}) {
  const [accountId, setAccountId] = useState(item.accountId ?? "");
  const [url, setUrl] = useState(item.url);
  const accountPlaceholder =
    item.key === "analytics"
      ? "معرّف قياس GA4 (G-XXXXXXXXXX)"
      : item.key === "google-ads"
        ? "رقم الحساب أو معرّف التحويل (AW-XXXXXXXXX)"
        : "ID / رقم الحساب";

  return (
    <article className={cn("card p-3.5", !item.isEnabled && "opacity-80")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-bold text-ink-900">{item.name}</h3>
          <p className="mt-0.5 text-[9px] font-semibold text-brand-700">{item.category}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "relative h-5 w-9 shrink-0 rounded-full transition",
            item.isEnabled ? "bg-emerald-500" : "bg-stone-300",
          )}
          aria-label="تفعيل"
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
              item.isEnabled ? "right-0.5" : "right-4.5",
            )}
          />
        </button>
      </div>

      <p className="mt-1.5 line-clamp-3 min-h-10 text-[10px] leading-4 text-ink-400">
        {item.key === "analytics"
          ? "احفظ معرّف قياس GA4 الذي يبدأ بـ G-. يلزم إضافة وسم التتبع للموقع لبدء تسجيل الزيارات."
          : item.key === "google-ads"
            ? HELP[item.key]
            : item.notes || HELP[item.key] || "اربط حسابك لتفعيل هذه الخدمة."}
      </p>

      <div className="mt-2 space-y-1.5">
        <Input
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          dir="ltr"
          type={item.key === "whatsapp" ? "tel" : "text"}
          placeholder={item.key === "whatsapp" ? "9665xxxxxxxx" : accountPlaceholder}
          className="h-8 text-[10px]"
        />
        <Input value={url} onChange={(event) => setUrl(event.target.value)} dir="ltr" placeholder="https://" className="h-8 text-[10px]" />
        {item.key === "whatsapp" ? (
          <p className="text-[9px] leading-4 text-ink-400">حفظ الرقم هنا يحدّث رقم واتساب المستخدم في واجهة هذا المتجر.</p>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => onSave(accountId, url)}>
          حفظ
        </Button>
        {item.url && item.url !== "https://" ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900 text-white"
            aria-label="فتح"
          >
            <Icon name="arrowLeft" className="h-3.5 w-3.5" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 hover:bg-rose-50 hover:text-rose-600"
          aria-label="حذف"
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      </div>
      {item.isEnabled ? (
        <div className="mt-2">
          <Badge tone="success">مفعّل</Badge>
        </div>
      ) : null}
    </article>
  );
}
