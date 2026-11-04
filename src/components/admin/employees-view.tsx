"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { formatDate } from "@/lib/format";
import type { StaffDTO } from "@/lib/admin-data";
import { defaultPermissions, PERMISSION_OPTIONS, ROLE_PRESETS, roleLabel } from "@/lib/roles";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  permissions: string[];
  allowedCategories: string[];
};

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "sales",
  permissions: defaultPermissions("sales"),
  allowedCategories: [],
};

export function EmployeesView({
  initial,
  currentUserId,
  isAdmin,
  categories,
}: {
  initial: StaffDTO[];
  currentUserId: number;
  isAdmin: boolean;
  categories: { id: number; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<StaffDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const permissionGroups = useMemo(() => Array.from(new Set(PERMISSION_OPTIONS.map((permission) => permission.group))), []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(item: StaffDTO) {
    setEditing(item);
    setForm({
      name: item.name,
      email: item.email,
      phone: item.phone ?? "",
      password: "",
      role: item.role === "staff" ? "sales" : item.role,
      permissions: item.permissions.includes("__none__") ? [] : item.permissions.length ? item.permissions : defaultPermissions(item.role),
      allowedCategories: item.allowedCategories ?? [],
    });
    setOpen(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function changeRole(role: string) {
    setForm((previous) => ({ ...previous, role, permissions: defaultPermissions(role), allowedCategories: [] }));
  }

  function togglePermission(permission: string) {
    setForm((previous) => ({
      ...previous,
      permissions: previous.permissions.includes(permission)
        ? previous.permissions.filter((item) => item !== permission)
        : [...previous.permissions, permission],
    }));
  }

  function toggleCategory(category: string) {
    setForm((previous) => ({
      ...previous,
      allowedCategories: previous.allowedCategories.includes(category)
        ? previous.allowedCategories.filter((item) => item !== category)
        : [...previous.allowedCategories, category],
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        permissions: form.permissions,
        allowedCategories: form.allowedCategories,
        password: form.password || undefined,
      };
      const response = await fetch(editing ? `/api/employees/${editing.id}` : "/api/employees", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { staff?: StaffDTO; error?: string };
      if (!response.ok || !data.staff) throw new Error(data.error ?? "تعذر حفظ الموظف");
      const saved = data.staff;
      setItems((current) => (editing ? current.map((item) => (item.id === editing.id ? saved : item)) : [saved, ...current]));
      toast(editing ? "تم تحديث بيانات الموظف وصلاحياته" : "تمت إضافة الموظف بالصلاحيات المحددة");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ الموظف", "error");
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
      const response = await fetch(`/api/employees/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "تعذر حذف الموظف");
      }
      toast("تم حذف الموظف");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast(error instanceof Error ? error.message : "تعذر الحذف", "error");
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-400">أنشئ أدواراً مختلفة، وخصص الصلاحيات لكل موظف. مسؤول الأقسام يرى التصنيفات التي تحددها فقط.</p>
        {isAdmin ? <Button size="sm" icon="plus" onClick={openCreate}>إضافة موظف</Button> : null}
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon="customers" title="لا يوجد موظفون" description="أضف فريقك وحدد دور وصلاحيات كل مستخدم." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.3fr_1.15fr_1.15fr_0.8fr_auto] gap-3 border-b border-stone-100 bg-stone-50/60 px-4 py-2.5 text-[10px] font-bold text-ink-400 md:grid">
            <span>الموظف</span><span>البريد</span><span>الصلاحيات</span><span>الدور</span><span className="text-center">إجراءات</span>
          </div>
          <ul className="divide-y divide-stone-100">
            {items.map((item) => (
              <li key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.3fr_1.15fr_1.15fr_0.8fr_auto] md:items-center">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-[11px] font-extrabold text-brand-900">{item.name.slice(0, 2)}</span>
                  <div className="min-w-0"><p className="truncate text-xs font-bold text-ink-900">{item.name} {item.id === currentUserId ? <span className="text-[9px] text-brand-600">(أنت)</span> : null}</p><p className="text-[10px] text-ink-400" dir="ltr">{item.phone ?? "—"}</p></div>
                </div>
                <p className="truncate text-[11px] text-ink-500" dir="ltr">{item.email}</p>
                <div className="text-[10px] text-ink-500"><span className="font-bold">{item.permissions.filter((permission) => permission !== "__none__").length}</span> صلاحية{item.allowedCategories.length ? <span className="block truncate text-[9px] text-ink-400">{item.allowedCategories.join("، ")}</span> : null}</div>
                <Badge tone={item.role === "admin" ? "brand" : "neutral"}>{roleLabel(item.role)}</Badge>
                <div className="flex items-center gap-1 md:justify-center">
                  {isAdmin ? <><button type="button" onClick={() => openEdit(item)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-700" aria-label="تعديل"><Icon name="edit" className="h-4 w-4" /></button><button type="button" onClick={() => setDeleting(item)} disabled={item.id === currentUserId} className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30" aria-label="حذف"><Icon name="trash" className="h-4 w-4" /></button></> : <span className="text-[10px] text-ink-300">—</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "تعديل الموظف والصلاحيات" : "إضافة موظف"}
        description="اختر دوراً جاهزاً ثم فعّل/ألغِ الصلاحيات يدوياً."
        size="lg"
        footer={<><Button variant="secondary" size="sm" onClick={() => setOpen(false)}>إلغاء</Button><Button size="sm" icon="check" onClick={save} loading={saving}>{editing ? "حفظ التغييرات" : "إضافة الموظف"}</Button></>}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم الموظف" required><Input value={form.name} onChange={(event) => set("name", event.target.value)} /></Field>
            <Field label="البريد الإلكتروني" required><Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} dir="ltr" disabled={Boolean(editing)} className={editing ? "bg-stone-50" : ""} /></Field>
            <Field label="رقم الجوال"><Input value={form.phone} onChange={(event) => set("phone", event.target.value)} dir="ltr" /></Field>
            <Field label="الدور الوظيفي"><Select value={form.role} onChange={(event) => changeRole(event.target.value)}>{ROLE_PRESETS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</Select><p className="mt-1 text-[9px] text-ink-400">{ROLE_PRESETS.find((role) => role.value === form.role)?.description}</p></Field>
            <Field label={editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"} hint="٨ أحرف وتشمل حرفاً ورقماً" className="sm:col-span-2"><Input type="password" value={form.password} onChange={(event) => set("password", event.target.value)} dir="ltr" placeholder="••••••••" /></Field>
          </div>

          {form.role === "category_manager" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3">
              <h3 className="text-[11px] font-extrabold text-amber-900">تصنيفات مسموح بها</h3>
              <p className="mt-0.5 text-[9px] text-amber-800">لن يستطيع هذا المستخدم تعديل المنتجات في تصنيفات أخرى.</p>
              <div className="mt-2 flex flex-wrap gap-2">{categories.map((category) => <label key={category.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-ink-700 ring-1 ring-amber-100"><input type="checkbox" checked={form.allowedCategories.includes(category.name)} onChange={() => toggleCategory(category.name)} className="h-3.5 w-3.5 accent-brand-600" />{category.name}</label>)}</div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-stone-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-[11px] font-extrabold text-ink-900">الصلاحيات التفصيلية</h3><p className="text-[9px] text-ink-400">{form.permissions.length} صلاحية محددة · يمكن تخصيص كل دور</p></div><button type="button" onClick={() => set("permissions", defaultPermissions(form.role))} className="text-[9px] font-bold text-brand-700">إعادة صلاحيات الدور</button></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {permissionGroups.map((group) => <div key={group} className="rounded-xl bg-stone-50 p-2.5"><p className="mb-1.5 text-[9px] font-extrabold text-ink-600">{group}</p><div className="space-y-1">{PERMISSION_OPTIONS.filter((permission) => permission.group === group).map((permission) => <label key={permission.id} className="flex cursor-pointer items-center gap-2 text-[9px] font-medium text-ink-600"><input type="checkbox" checked={form.permissions.includes(permission.id)} onChange={() => togglePermission(permission.id)} className="h-3.5 w-3.5 accent-brand-600" />{permission.label}</label>)}</div></div>)}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={Boolean(deleting)} title={`حذف الموظف ${deleting?.name ?? ""}؟`} description="سيفقد الوصول إلى لوحة التحكم فوراً." onCancel={() => setDeleting(null)} onConfirm={remove} loading={deleteLoading} />
    </div>
  );
}
