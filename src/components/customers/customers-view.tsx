"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { cn, formatMoney, formatNumber, relativeTime } from "@/lib/format";
import type { CustomerDTO } from "@/lib/types";

type FormState = {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notes: string;
  isVip: boolean;
};

const EMPTY: FormState = {
  name: "",
  phone: "",
  email: "",
  city: "الرياض",
  address: "",
  notes: "",
  isVip: false,
};

const CITIES = ["الرياض", "جدة", "مكة المكرمة", "الدمام", "بريدة", "المدينة المنورة", "أبها", "الطائف"];

export function CustomersView({ initialCustomers }: { initialCustomers: CustomerDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerDTO[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [onlyVip, setOnlyVip] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CustomerDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (onlyVip && !customer.isVip) return false;
      if (!term) return true;
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        customer.city.toLowerCase().includes(term)
      );
    });
  }, [customers, search, onlyVip]);

  const stats = useMemo(
    () => ({
      total: customers.length,
      vip: customers.filter((customer) => customer.isVip).length,
      spend: customers.reduce((sum, customer) => sum + customer.totalSpend, 0),
      orders: customers.reduce((sum, customer) => sum + customer.orderCount, 0),
    }),
    [customers],
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(customer: CustomerDTO) {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      city: customer.city,
      address: customer.address ?? "",
      notes: customer.notes ?? "",
      isVip: customer.isVip,
    });
    setOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (form.name.trim().length < 2) {
      toast("أدخل اسم العميل", "error");
      return;
    }
    if (!/^[0-9+\s-]{8,}$/.test(form.phone.trim())) {
      toast("أدخل رقم جوال صحيح", "error");
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      isVip: form.isVip,
    };

    setSaving(true);
    const previous = customers;
    const optimistic: CustomerDTO = {
      id: editing?.id ?? -Date.now(),
      ...payload,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      orderCount: editing?.orderCount ?? 0,
      totalSpend: editing?.totalSpend ?? 0,
      lastOrderAt: editing?.lastOrderAt ?? null,
    };
    setCustomers((current) =>
      editing ? current.map((customer) => (customer.id === editing.id ? optimistic : customer)) : [optimistic, ...current],
    );
    setOpen(false);

    try {
      const response = await fetch(editing ? `/api/customers/${editing.id}` : "/api/customers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { customer?: CustomerDTO; error?: string };
      if (!response.ok || !data.customer) throw new Error(data.error ?? "تعذر حفظ العميل");
      const saved = data.customer;
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === optimistic.id
            ? { ...saved, orderCount: optimistic.orderCount, totalSpend: optimistic.totalSpend, lastOrderAt: optimistic.lastOrderAt }
            : customer,
        ),
      );
      toast(editing ? "تم تحديث بيانات العميل" : "تمت إضافة العميل");
      router.refresh();
    } catch (error) {
      setCustomers(previous);
      toast(error instanceof Error ? error.message : "تعذر حفظ العميل", "error");
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const previous = customers;
    setCustomers((current) => current.filter((customer) => customer.id !== deleting.id));
    try {
      const response = await fetch(`/api/customers/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "تعذر حذف العميل");
      }
      toast("تم حذف العميل");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setCustomers(previous);
      toast(error instanceof Error ? error.message : "تعذر حذف العميل", "error");
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "إجمالي العملاء", value: formatNumber(stats.total), icon: "customers" as const },
          { label: "عملاء VIP", value: formatNumber(stats.vip), icon: "crown" as const },
          { label: "طلباتهم", value: formatNumber(stats.orders), icon: "orders" as const },
          { label: "إجمالي مشترياتهم", value: formatMoney(stats.spend), icon: "wallet" as const },
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

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالاسم أو الجوال أو المدينة..."
            className="input h-10 pr-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyVip((value) => !value)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition",
              onlyVip ? "bg-brand-50 text-brand-800 ring-1 ring-brand-300" : "bg-stone-100 text-ink-500 hover:bg-stone-200/70",
            )}
          >
            <Icon name="crown" className="h-4 w-4" />
            VIP فقط
          </button>
          <Button size="sm" icon="plus" onClick={openCreate}>
            عميل جديد
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="customers"
            title={customers.length === 0 ? "لا يوجد عملاء بعد" : "لا توجد نتائج"}
            description={
              customers.length === 0
                ? "أضف أول عميل ليصبح بإمكانك تسجيل طلباته وربطها بالذبائح."
                : "جرّب كلمة بحث أخرى أو أوقف فلتر VIP."
            }
            action={
              <Button icon="plus" onClick={openCreate}>
                إضافة عميل
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((customer) => (
            <article key={customer.id} className="card card-hover p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-extrabold text-brand-900">
                  {customer.name.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold text-ink-900">{customer.name}</h3>
                    {customer.isVip ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        <Icon name="crown" className="h-2.5 w-2.5" />
                        VIP
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-400">
                    <Icon name="pin" className="h-3 w-3" />
                    {customer.city}
                    <span className="text-stone-300">·</span>
                    <span dir="ltr">{customer.phone}</span>
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-center">
                <div>
                  <p className="text-sm font-extrabold text-ink-900">{customer.orderCount}</p>
                  <p className="text-[9px] text-ink-400">طلب</p>
                </div>
                <div className="border-x border-stone-200">
                  <p className="text-sm font-extrabold text-brand-700">{formatMoney(customer.totalSpend)}</p>
                  <p className="text-[9px] text-ink-400">مشتريات</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-ink-700">
                    {customer.lastOrderAt ? relativeTime(customer.lastOrderAt) : "—"}
                  </p>
                  <p className="text-[9px] text-ink-400">آخر طلب</p>
                </div>
              </div>

              {customer.address ? (
                <p className="mt-2.5 line-clamp-1 text-[11px] text-ink-400">{customer.address}</p>
              ) : null}

              <div className="mt-3 flex items-center gap-1.5">
                <Button size="sm" variant="secondary" icon="edit" className="flex-1" onClick={() => openEdit(customer)}>
                  تعديل
                </Button>
                <Button size="sm" variant="subtle" className="flex-1" onClick={() => router.push("/dashboard/orders")}>
                  طلب جديد
                </Button>
                <button
                  type="button"
                  onClick={() => setDeleting(customer)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="حذف"
                >
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
        title={editing ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
        description="بيانات العميل تُستخدم في الطلبات والتوصيل."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" icon="check" onClick={save} loading={saving}>
              {editing ? "حفظ التعديلات" : "إضافة العميل"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم العميل" required>
            <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="أبو عبدالله القحطاني" />
          </Field>
          <Field label="رقم الجوال" required>
            <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="05xxxxxxxx" dir="ltr" />
          </Field>
          <Field label="المدينة">
            <select value={form.city} onChange={(event) => update("city", event.target.value)} className="input">
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </Field>
          <Field label="البريد الإلكتروني">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="name@example.com"
              dir="ltr"
            />
          </Field>
          <Field label="العنوان" className="sm:col-span-2">
            <Input
              value={form.address}
              onChange={(event) => update("address", event.target.value)}
              placeholder="الحي، الشارع، رقم المبنى"
            />
          </Field>
          <Field label="ملاحظات" className="sm:col-span-2">
            <Textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="تفضيلات العميل، مواعيد مناسبة، ملاحظات التوصيل..."
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isVip}
              onChange={(event) => update("isVip", event.target.checked)}
              className="h-4 w-4 rounded border-stone-300 accent-brand-600"
            />
            عميل VIP — أولوية في المواعيد والتوصيل
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`حذف العميل ${deleting?.name ?? ""}؟`}
        description="لا يمكن حذف عميل لديه طلبات سابقة. سيظهر تنبيه إذا كان مرتبطاً بطلبات."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <Icon name="sparkles" className="h-4 w-4 text-brand-600" />
          نصيحة: ضع علامة VIP للعملاء المتكررين لتظهر أولويتهم في تقارير العزائم.
        </div>
        <Badge tone="brand">{visible.length} عميل معروض</Badge>
      </div>
    </div>
  );
}
