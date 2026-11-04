"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Input, Modal, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { StoreSettings } from "@/lib/store-defaults";
import { getStorePublicUrl } from "@/lib/multi-store";
import { PWAControls } from "@/components/admin/pwa-controls";

const ALL_COLUMNS = [
  { id: "name", label: "اسم المتجر" },
  { id: "type", label: "النوع" },
  { id: "status", label: "الحالة" },
  { id: "link", label: "الرابط" },
] as const;

type ColumnId = (typeof ALL_COLUMNS)[number]["id"];

type StoreRow = {
  id: number;
  name: string;
  slug: string;
  storeType: string;
  status: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const STORE_TYPE_OPTIONS = [
  { value: "SLAUGHTERHOUSE", label: "ذبح" },
  { value: "CLOTHING", label: "ملابس" },
  { value: "GROCERY", label: "مواد غذائية" },
  { value: "FROZEN", label: "مجمدات" },
];

const STORE_STATUS_OPTIONS = [
  { value: "PRIVATE", label: "خاص" },
  { value: "DRAFT", label: "مسودة" },
  { value: "PUBLISHED", label: "منشور" },
];

function normalizeStore(row: Partial<StoreRow>): StoreRow {
  return {
    id: Number(row.id ?? 0),
    name: row.name ?? "متجر جديد",
    slug: row.slug ?? "new-store",
    storeType: row.storeType ?? "SLAUGHTERHOUSE",
    status: row.status ?? "DRAFT",
    logoUrl: row.logoUrl ?? null,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

export function StoresView({
  settings,
  ownerName,
  initialStores,
}: {
  settings: StoreSettings;
  ownerName: string;
  initialStores: StoreRow[];
}) {
  const [query, setQuery] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [stores, setStores] = useState<StoreRow[]>(initialStores.map((row) => normalizeStore(row)));
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(["name", "type", "status", "link"]);
  const [formState, setFormState] = useState({
    name: "",
    slug: "",
    storeType: "SLAUGHTERHOUSE",
    status: "DRAFT",
    logoUrl: "",
  });
  const [formError, setFormError] = useState("");

  const displayStores = useMemo(
    () =>
      stores.map((store) => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        type: store.storeType,
        status: store.status,
        logoUrl: store.logoUrl,
        link: getStorePublicUrl(store.slug),
      })),
    [stores],
  );

  const filtered = displayStores.filter((store) => {
    const haystack = `${store.name} ${store.type} ${store.status} ${store.link}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  function toggleColumn(id: ColumnId) {
    setVisibleColumns((current) => (current.includes(id) ? current.filter((column) => column !== id) : [...current, id]));
  }

  const statusTone = (status: string) => {
    if (status === "PUBLISHED") return "success";
    if (status === "DRAFT") return "warning";
    return "neutral";
  };

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const name = formState.name.trim();
    if (name.length < 2) {
      setFormError("يجب كتابة اسم المتجر بشكل صحيح");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: formState.slug.trim(),
          storeType: formState.storeType,
          status: formState.status,
          logoUrl: formState.logoUrl.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; store?: Partial<StoreRow> } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "تعذر إضافة المتجر");
      }

      const nextStore = normalizeStore(payload?.store ?? { ...formState, name, slug: formState.slug.trim() || name });
      setStores((current) => [nextStore, ...current]);
      setCreateOpen(false);
      setFormState({ name: "", slug: "", storeType: "SLAUGHTERHOUSE", status: "DRAFT", logoUrl: "" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر إضافة المتجر");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(store: { id: number; name: string; slug: string }) {
    const confirmed = window.confirm(`هل تريد حذف متجر "${store.name}"؟`);
    if (!confirmed) return;

    setDeletingId(store.id);
    try {
      const response = await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "تعذر حذف المتجر");
      }

      setStores((current) => current.filter((item) => item.id !== store.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "تعذر حذف المتجر");
    } finally {
      setDeletingId(null);
    }
  }

  function openEditStore(store: { id: number; name: string; slug: string; storeType: string; status: string; logoUrl: string | null }) {
    setEditingStore(normalizeStore(store));
    setFormState({
      name: store.name,
      slug: store.slug,
      storeType: store.storeType,
      status: store.status,
      logoUrl: store.logoUrl ?? "",
    });
    setFormError("");
    setEditOpen(true);
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingStore) return;

    setFormError("");
    const name = formState.name.trim();
    if (name.length < 2) {
      setFormError("يجب كتابة اسم المتجر بشكل صحيح");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/stores/${editingStore.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: formState.slug.trim(),
          storeType: formState.storeType,
          status: formState.status,
          logoUrl: formState.logoUrl.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; store?: Partial<StoreRow> } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "تعذر تحديث المتجر");
      }

      const nextStore = normalizeStore(payload?.store ?? { ...editingStore, ...formState, name, slug: formState.slug.trim() || editingStore.slug });
      setStores((current) => current.map((item) => (item.id === editingStore.id ? nextStore : item)));
      setEditOpen(false);
      setEditingStore(null);
      setFormState({ name: "", slug: "", storeType: "SLAUGHTERHOUSE", status: "DRAFT", logoUrl: "" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر تحديث المتجر");
    } finally {
      setIsSaving(false);
    }
  }

  void settings;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-5 text-white sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(201,162,39,0.27),transparent_55%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-brand-200">إدارة المتاجر</p>
            <h1 className="mt-1 text-xl font-extrabold">لوحة المتاجر المركزية</h1>
            <p className="mt-1.5 max-w-xl text-[11px] leading-6 text-white/60">
              إدارة جميع المتاجر في منصة Waleedex، مع روابطها العامة والخفية من شاشة واحدة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" icon="plus" onClick={() => setCreateOpen(true)}>إضافة متجر</Button>
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[11px] font-extrabold text-ink-900">
              <Icon name="box" className="h-4 w-4" /> المتجر الرئيسي
            </Link>
          </div>
        </div>
        <div className="relative mt-4 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
          <p className="text-[9px] text-white/55">الحساب الحالي</p>
          <p className="mt-0.5 text-xs font-bold">{ownerName} · مدير المنصة</p>
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon name="box" className="h-4 w-4" /></span>
          <div>
            <h2 className="text-xs font-bold text-ink-900">متعدد المتاجر</h2>
            <p className="text-[10px] text-ink-400">كل متجر يحتوي على رابط مستقل، منتجاته الخاصة، وأقسامه الخاصة.</p>
          </div>
        </div>
        <PWAControls />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4">
          <div>
            <h2 className="text-sm font-bold text-ink-900">قائمة المتاجر</h2>
            <p className="mt-0.5 text-[10px] text-ink-400">تتبع حالة كل متجر، نوعه، ورابطه العام أو الخاص.</p>
          </div>
          <Badge tone="brand">{displayStores.length} متجر</Badge>
        </div>

        <div className="flex flex-col gap-2 border-b border-stone-100 bg-stone-50/60 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 pr-9 text-xs" placeholder="ابحث باسم المتجر أو نوعه" />
          </div>
          <Button size="sm" variant="secondary" icon="settings" onClick={() => setColumnsOpen(true)}>تخصيص الأعمدة</Button>
        </div>

        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-start text-xs">
              <thead className="border-b border-stone-100 bg-white text-[10px] text-ink-400">
                <tr>
                  {ALL_COLUMNS.filter((column) => visibleColumns.includes(column.id)).map((column) => (
                    <th key={column.id} className="px-4 py-3 font-bold">{column.label}</th>
                  ))}
                  <th className="px-4 py-3 font-bold">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((store) => (
                  <tr key={store.id || store.slug} className="border-b border-stone-100 last:border-0 hover:bg-brand-50/20">
                    {visibleColumns.includes("name") ? (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon name="box" className="h-5 w-5" /></span>
                          <div>
                            <p className="font-extrabold text-ink-900">{store.name}</p>
                            <p className="mt-0.5 text-[10px] text-ink-400">{store.status === "PRIVATE" ? "رابط خاص" : "رابط عام"}</p>
                          </div>
                        </div>
                      </td>
                    ) : null}
                    {visibleColumns.includes("type") ? <td className="px-4 py-4"><Badge tone="brand">{store.type}</Badge></td> : null}
                    {visibleColumns.includes("status") ? (
                      <td className="px-4 py-4"><Badge tone={statusTone(store.status)}>{store.status === "PUBLISHED" ? "منشور" : store.status === "DRAFT" ? "مسودة" : "خاص"}</Badge></td>
                    ) : null}
                    {visibleColumns.includes("link") ? (
                      <td className="px-4 py-4"><span className="font-mono text-[10px] text-ink-600" dir="ltr">{store.link}</span></td>
                    ) : null}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={store.link} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-900 px-3 text-[10px] font-bold text-white">
                          <Icon name="arrowLeft" className="h-3.5 w-3.5" /> فتح المتجر
                        </Link>
                        <Link href={`/dashboard/products?storeId=${store.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 px-3 text-[10px] font-bold text-brand-800">
                          <Icon name="products" className="h-3.5 w-3.5" /> المنتجات
                        </Link>
                        <Link href={`/dashboard/categories?storeId=${store.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 px-3 text-[10px] font-bold text-brand-800">
                          <Icon name="box" className="h-3.5 w-3.5" /> الأقسام
                        </Link>
                        <Link href={`/dashboard/reports?storeId=${store.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 px-3 text-[10px] font-bold text-brand-800">
                          <Icon name="reports" className="h-3.5 w-3.5" /> التقارير
                        </Link>
                        <Link href={`/dashboard/settings/store?storeId=${store.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-50 px-3 text-[10px] font-bold text-brand-800">
                          <Icon name="settings" className="h-3.5 w-3.5" /> الإعدادات
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          icon="edit"
                          onClick={() => openEditStore({
                            id: Number(store.id),
                            name: store.name,
                            slug: store.slug,
                            storeType: store.type,
                            status: store.status,
                            logoUrl: store.logoUrl ?? null,
                          })}
                        >
                          تعديل
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          icon="trash"
                          loading={deletingId === Number(store.id)}
                          onClick={() => void handleDelete({ id: Number(store.id), name: store.name, slug: store.slug })}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-ink-700">لا توجد نتائج</p>
            <p className="mt-1 text-[10px] text-ink-400">جرّب بحثاً مختلفاً.</p>
          </div>
        )}
      </section>

      <Modal open={columnsOpen} onClose={() => setColumnsOpen(false)} title="تخصيص الأعمدة">
        <div className="space-y-3">
          {ALL_COLUMNS.map((column) => (
            <label key={column.id} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 text-xs font-bold text-ink-700">
              <span>{column.label}</span>
              <input type="checkbox" checked={visibleColumns.includes(column.id)} onChange={() => toggleColumn(column.id)} className="h-4 w-4 accent-brand-500" />
            </label>
          ))}
        </div>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إضافة متجر جديد" description="أنشئ متجرًا جديدًا برابط مستقل، نوعه، وحالته.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">اسم المتجر</label>
              <Input value={formState.name} onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))} placeholder="مثل: متجر الرياض للألبسة" />
            </div>
            <div>
              <label className="field-label">الرابط</label>
              <Input value={formState.slug} onChange={(event) => setFormState((current) => ({ ...current, slug: event.target.value }))} placeholder="riyadh-fashion" dir="ltr" />
            </div>
            <div>
              <label className="field-label">نوع المتجر</label>
              <Select value={formState.storeType} onChange={(event) => setFormState((current) => ({ ...current, storeType: event.target.value }))}>
                {STORE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="field-label">الحالة</label>
              <Select value={formState.status} onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}>
                {STORE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">رابط الشعار</label>
              <Input value={formState.logoUrl} onChange={(event) => setFormState((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="https://..." dir="ltr" />
            </div>
          </div>

          {formError ? <p className="text-xs font-bold text-rose-600">{formError}</p> : null}

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={isSaving}>حفظ المتجر</Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="تعديل متجر" description="قم بتحديث البيانات الأساسية للمتجر المختار.">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">اسم المتجر</label>
              <Input value={formState.name} onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))} placeholder="مثل: متجر الرياض للألبسة" />
            </div>
            <div>
              <label className="field-label">الرابط</label>
              <Input value={formState.slug} onChange={(event) => setFormState((current) => ({ ...current, slug: event.target.value }))} placeholder="riyadh-fashion" dir="ltr" />
            </div>
            <div>
              <label className="field-label">نوع المتجر</label>
              <Select value={formState.storeType} onChange={(event) => setFormState((current) => ({ ...current, storeType: event.target.value }))}>
                {STORE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="field-label">الحالة</label>
              <Select value={formState.status} onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}>
                {STORE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">رابط الشعار</label>
              <Input value={formState.logoUrl} onChange={(event) => setFormState((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="https://..." dir="ltr" />
            </div>
          </div>

          {formError ? <p className="text-xs font-bold text-rose-600">{formError}</p> : null}

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => {
              setEditOpen(false);
              setFormError("");
            }}>إلغاء</Button>
            <Button type="submit" loading={isSaving}>حفظ التعديلات</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
