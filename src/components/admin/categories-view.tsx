"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import type { StoreCategoryDTO } from "@/lib/admin-data";

type FormState = { name: string; slug: string; blurb: string; imageUrl: string; sortOrder: string; isActive: boolean; isHighlight: boolean };
const EMPTY: FormState = { name: "", slug: "", blurb: "", imageUrl: "", sortOrder: "0", isActive: true, isHighlight: false };

export function CategoriesView({
  initial,
  storeId,
  storeName,
}: {
  initial: StoreCategoryDTO[];
  storeId?: number;
  storeName?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoreCategoryDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<StoreCategoryDTO | null>(null);
  const [deleting2, setDeleting2] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(item: StoreCategoryDTO) {
    setEditing(item);
    setForm({
      name: item.name,
      slug: item.slug,
      blurb: item.blurb,
      imageUrl: item.imageUrl ?? "",
      sortOrder: String(item.sortOrder),
      isActive: item.isActive,
      isHighlight: item.isHighlight,
    });
    setOpen(true);
  }
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function uploadCategoryImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("اختر ملف صورة صالحاً", "error");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast("حجم الصورة أكبر من ٣ ميجابايت", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("imageUrl", String(reader.result));
      toast("تم رفع صورة القسم — احفظ التغييرات لتثبيتها");
    };
    reader.onerror = () => toast("تعذر قراءة الصورة", "error");
    reader.readAsDataURL(file);
  }

  async function save() {
    if (form.name.trim().length < 2) {
      toast("أدخل اسم القسم", "error");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: (form.slug.trim() || form.name.trim()) as string,
      blurb: form.blurb,
      imageUrl: form.imageUrl.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
      isHighlight: form.isHighlight,
      ...(storeId ? { storeId } : {}),
    };
    try {
      const response = await fetch(editing ? `/api/categories/${editing.id}` : "/api/categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { category?: StoreCategoryDTO; error?: string };
      if (!response.ok || !data.category) throw new Error(data.error ?? "تعذر حفظ القسم");
      const saved = { ...data.category, productCount: editing?.productCount ?? 0 };
      setItems((current) =>
        editing
          ? current.map((item) => (item.id === editing.id ? saved : item))
          : [...current, saved].sort((a, b) => a.sortOrder - b.sortOrder),
      );
      toast(editing ? "تم تحديث القسم" : "تمت إضافة القسم");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ القسم", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: StoreCategoryDTO) {
    const previous = items;
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isActive: !entry.isActive } : entry)));
    try {
      const response = await fetch(`/api/categories/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          slug: item.slug,
          blurb: item.blurb,
          imageUrl: item.imageUrl,
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
          isHighlight: item.isHighlight,
        }),
      });
      if (!response.ok) throw new Error("تعذر تحديث القسم");
      toast(item.isActive ? "تم إخفاء القسم" : "تم إظهار القسم");
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast(error instanceof Error ? error.message : "تعذر التحديث", "error");
    }
  }

  async function remove() {
    if (!deleting) return;
    setDeleting2(true);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== deleting.id));
    try {
      const response = await fetch(`/api/categories/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("تعذر حذف القسم");
      toast("تم حذف القسم");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast(error instanceof Error ? error.message : "تعذر الحذف", "error");
    } finally {
      setDeleting2(false);
    }
  }

  return (
    <div className="space-y-4">
      {storeName ? (
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[10px] font-bold text-ink-400">إدارة أقسام المتجر</p>
            <h1 className="mt-1 text-sm font-extrabold text-ink-900">{storeName}</h1>
          </div>
          <Link href="/dashboard/stores" className="text-[11px] font-bold text-brand-700 hover:text-brand-900">العودة إلى المتاجر</Link>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-400">{items.length} قسم · تظهر الأقسام في واجهة المتجر حسب الترتيب</p>
        <Button icon="plus" size="sm" onClick={openCreate}>
          قسم جديد
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="box"
            title="لا توجد أقسام"
            description="أضف تصنيفات تناسب نشاطك التجاري لتظهر في واجهة المتجر."
            action={<Button icon="plus" onClick={openCreate}>إضافة قسم</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="card card-hover overflow-hidden">
              <div className="relative h-28 bg-stone-100">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-3xl">🗂️</span>
                )}
                <div className="absolute inset-x-0 top-0 flex justify-between p-2">
                  <span className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold text-ink-700">{item.productCount} منتج</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${item.isActive ? "bg-emerald-600 text-white" : "bg-stone-500 text-white"}`}>
                    {item.isActive ? "ظاهر" : "مخفي"}
                  </span>
                </div>
              </div>
              <div className="p-3.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-bold text-ink-900">{item.name}</h3>
                  {item.isHighlight ? <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[8px] font-bold text-white">مميز</span> : null}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-400">{item.blurb || "بدون وصف"}</p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" icon="edit" className="flex-1" onClick={() => openEdit(item)}>
                    تعديل
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => toggle(item)}>
                    {item.isActive ? "إخفاء" : "إظهار"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleting(item)}
                    className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="حذف"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "تعديل القسم" : "قسم جديد"}
        description="الأقسام تظهر في شريط الواجهة وفي نموذج إضافة المنتجات."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button size="sm" icon="check" onClick={save} loading={saving}>{editing ? "حفظ" : "إضافة"}</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم القسم" required>
            <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="مثال: الإلكترونيات أو الخدمات" />
          </Field>
          <Field label="المعرّف (slug)">
            <Input value={form.slug} onChange={(event) => set("slug", event.target.value)} placeholder="التيس الكشميري" />
          </Field>
          <Field label="وصف مختصر" className="sm:col-span-2">
            <Textarea value={form.blurb} onChange={(event) => set("blurb", event.target.value)} placeholder="وصف موجز للقسم" />
          </Field>
          <Field label="صورة القسم — رفع أو رابط" className="sm:col-span-2">
            <div className="space-y-2">
              <Input value={form.imageUrl.startsWith("data:") ? "تم رفع صورة من الجهاز" : form.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} dir="ltr" placeholder="https://..." />
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-2 text-[10px] font-bold text-ink-600 hover:bg-stone-200">
                <Icon name="plus" className="h-3.5 w-3.5" /> رفع صورة من الجهاز
                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadCategoryImage(event.target.files?.[0])} />
              </label>
              {form.imageUrl ? <img src={form.imageUrl} alt="معاينة التصنيف" className="h-16 w-24 rounded-xl border border-stone-200 object-cover" /> : null}
            </div>
          </Field>
          <Field label="ترتيب الظهور">
            <Input type="number" value={form.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} dir="ltr" />
          </Field>
          <div className="flex items-end gap-4 pb-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
              <input type="checkbox" checked={form.isActive} onChange={(event) => set("isActive", event.target.checked)} className="h-4 w-4 accent-brand-600" />
              ظاهر
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
              <input type="checkbox" checked={form.isHighlight} onChange={(event) => set("isHighlight", event.target.checked)} className="h-4 w-4 accent-brand-600" />
              قسم مميز
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`حذف القسم ${deleting?.name ?? ""}؟`}
        description="لن تُحذف المنتجات، لكنها ستحتاج إعادة تصنيف."
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        loading={deleting2}
      />
    </div>
  );
}
