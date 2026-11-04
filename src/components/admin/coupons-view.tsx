"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { cn, formatDate, formatMoney } from "@/lib/format";
import type { CouponDTO } from "@/lib/admin-data";

type FormState = { code: string; type: string; value: string; minOrder: string; usageLimit: string; description: string; expiresAt: string; isActive: boolean };
const EMPTY: FormState = { code: "", type: "percent", value: "10", minOrder: "0", usageLimit: "0", description: "", expiresAt: "", isActive: true };
const TYPE_LABEL: Record<string, string> = { percent: "نسبة مئوية", fixed: "مبلغ ثابت", freeShipping: "توصيل مجاني" };

export function CouponsView({ initial }: { initial: CouponDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CouponDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CouponDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const stats = useMemo(
    () => ({
      active: items.filter((item) => item.isActive).length,
      uses: items.reduce((sum, item) => sum + item.usedCount, 0),
    }),
    [items],
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(item: CouponDTO) {
    setEditing(item);
    setForm({
      code: item.code,
      type: item.type,
      value: String(item.value),
      minOrder: String(item.minOrder),
      usageLimit: String(item.usageLimit),
      description: item.description,
      expiresAt: item.expiresAt ?? "",
      isActive: item.isActive,
    });
    setOpen(true);
  }
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (form.code.trim().length < 3) {
      toast("أدخل كود الكوبون", "error");
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value) || 0,
      minOrder: Number(form.minOrder) || 0,
      usageLimit: Number(form.usageLimit) || 0,
      description: form.description,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
    };
    try {
      const response = await fetch(editing ? `/api/coupons/${editing.id}` : "/api/coupons", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { coupon?: CouponDTO; error?: string };
      if (!response.ok || !data.coupon) throw new Error(data.error ?? "تعذر حفظ الكوبون");
      const saved = { ...data.coupon, usedCount: editing?.usedCount ?? 0 };
      setItems((current) => (editing ? current.map((item) => (item.id === editing.id ? saved : item)) : [saved, ...current]));
      toast(editing ? "تم تحديث الكوبون" : "تم إنشاء الكوبون");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ الكوبون", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: CouponDTO) {
    const previous = items;
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isActive: !entry.isActive } : entry)));
    try {
      const response = await fetch(`/api/coupons/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      });
      if (!response.ok) throw new Error("تعذر تحديث الكوبون");
      toast(item.isActive ? "تم إيقاف الكوبون" : "تم تفعيل الكوبون");
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast(error instanceof Error ? error.message : "تعذر التحديث", "error");
    }
  }

  async function remove() {
    if (!deleting) return;
    setDeleteLoading(true);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== deleting.id));
    try {
      const response = await fetch(`/api/coupons/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("تعذر حذف الكوبون");
      toast("تم حذف الكوبون");
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
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "كوبونات مفعّلة", value: stats.active, icon: "sparkles" as const },
          { label: "مرات الاستخدام", value: stats.uses, icon: "orders" as const },
          { label: "إجمالي الكوبونات", value: items.length, icon: "box" as const },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-[11px] font-semibold text-ink-400">{stat.label}</p>
              <p className="mt-0.5 text-lg font-extrabold text-ink-900">{stat.value}</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon name={stat.icon} className="h-4 w-4" />
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-400">أكواد الخصم التي يستخدمها العملاء في الطلبات</p>
        <Button size="sm" icon="plus" onClick={openCreate}>كوبون جديد</Button>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon="sparkles" title="لا توجد كوبونات" description="أنشئ كود خصم لجذب العملاء وزيادة الطلبات." action={<Button icon="plus" onClick={openCreate}>إنشاء كوبون</Button>} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className={cn("card card-hover p-4", !item.isActive && "opacity-70")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-base font-extrabold tracking-wider text-ink-900" dir="ltr">{item.code}</p>
                  <p className="mt-0.5 text-[10px] text-ink-400">{TYPE_LABEL[item.type]}</p>
                </div>
                <Badge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "مفعّل" : "موقوف"}</Badge>
              </div>
              <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2">
                <p className="text-lg font-extrabold text-brand-700">
                  {item.type === "percent" ? `${item.value}%` : item.type === "fixed" ? formatMoney(item.value) : "توصيل مجاني"}
                </p>
                <p className="text-[10px] text-ink-400">
                  أقل طلب {formatMoney(item.minOrder)} · ينتهي {item.expiresAt ? formatDate(item.expiresAt) : "بدون تاريخ"}
                </p>
              </div>
              {item.description ? <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-ink-500">{item.description}</p> : null}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-ink-400">
                  <span>الاستخدام</span>
                  <span className="font-bold text-ink-700">
                    {item.usedCount} / {item.usageLimit === 0 ? "غير محدود" : item.usageLimit}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${item.usageLimit === 0 ? Math.min(100, item.usedCount / 2) : Math.min(100, (item.usedCount / item.usageLimit) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <Button size="sm" variant="secondary" icon="edit" className="flex-1" onClick={() => openEdit(item)}>تعديل</Button>
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => toggle(item)}>{item.isActive ? "إيقاف" : "تفعيل"}</Button>
                <button type="button" onClick={() => setDeleting(item)} className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 hover:bg-rose-50 hover:text-rose-600" aria-label="حذف">
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "تعديل الكوبون" : "كوبون خصم جديد"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button size="sm" icon="check" onClick={save} loading={saving}>{editing ? "حفظ" : "إنشاء"}</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الكود" required>
            <Input value={form.code} onChange={(event) => set("code", event.target.value)} dir="ltr" placeholder="KRAM50" />
          </Field>
          <Field label="النوع">
            <Select value={form.type} onChange={(event) => set("type", event.target.value)}>
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="القيمة" hint="نسبة أو مبلغ حسب النوع">
            <Input type="number" value={form.value} onChange={(event) => set("value", event.target.value)} dir="ltr" />
          </Field>
          <Field label="أقل قيمة للطلب">
            <Input type="number" value={form.minOrder} onChange={(event) => set("minOrder", event.target.value)} dir="ltr" />
          </Field>
          <Field label="حد الاستخدام" hint="٠ = غير محدود">
            <Input type="number" value={form.usageLimit} onChange={(event) => set("usageLimit", event.target.value)} dir="ltr" />
          </Field>
          <Field label="تاريخ الانتهاء">
            <Input type="date" value={form.expiresAt} onChange={(event) => set("expiresAt", event.target.value)} dir="ltr" />
          </Field>
          <Field label="وصف العرض" className="sm:col-span-2">
            <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-600 sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(event) => set("isActive", event.target.checked)} className="h-4 w-4 accent-brand-600" />
            مفعّل الآن
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`حذف الكوبون ${deleting?.code ?? ""}؟`}
        description="سيتوقف الكود عن العمل فوراً."
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        loading={deleteLoading}
      />
    </div>
  );
}
