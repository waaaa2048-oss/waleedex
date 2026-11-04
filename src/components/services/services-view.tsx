"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { SERVICE_META, SERVICE_TYPES, cn, formatMoney } from "@/lib/format";
import type { ServiceDTO } from "@/lib/types";

type FormState = {
  name: string;
  type: string;
  description: string;
  price: string;
  unit: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  name: "",
  type: "عام",
  description: "",
  price: "",
  unit: "للطلب",
  isActive: true,
};

export function ServicesView({ initialServices }: { initialServices: ServiceDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceDTO[]>(initialServices);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ServiceDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const visible = useMemo(
    () => services.filter((service) => filter === "all" || service.type === filter),
    [services, filter],
  );

  const totalUsage = services.reduce((sum, service) => sum + service.usageCount, 0);
  const avgPrice = services.length
    ? Math.round(services.reduce((sum, service) => sum + service.price, 0) / services.length)
    : 0;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(service: ServiceDTO) {
    setEditing(service);
    setForm({
      name: service.name,
      type: service.type,
      description: service.description,
      price: String(service.price),
      unit: service.unit,
      isActive: service.isActive,
    });
    setOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function payloadOf(state: FormState) {
    return {
      name: state.name.trim(),
      type: state.type,
      description: state.description.trim(),
      price: Number(state.price) || 0,
      unit: state.unit.trim() || "للطلب",
      isActive: state.isActive,
    };
  }

  async function save() {
    const payload = payloadOf(form);
    if (payload.name.length < 2) {
      toast("أدخل اسم الخدمة", "error");
      return;
    }
    if (payload.price < 0) {
      toast("أدخل سعراً صحيحاً", "error");
      return;
    }

    setSaving(true);
    const previous = services;
    const optimistic: ServiceDTO = {
      id: editing?.id ?? -Date.now(),
      ...payload,
      description: payload.description,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      usageCount: editing?.usageCount ?? 0,
    };
    setServices((current) =>
      editing ? current.map((service) => (service.id === editing.id ? optimistic : service)) : [...current, optimistic],
    );
    setOpen(false);

    try {
      const response = await fetch(editing ? `/api/services/${editing.id}` : "/api/services", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { service?: ServiceDTO; error?: string };
      if (!response.ok || !data.service) throw new Error(data.error ?? "تعذر حفظ الخدمة");
      const saved = data.service;
      setServices((current) =>
        current.map((service) =>
          service.id === optimistic.id ? { ...saved, usageCount: optimistic.usageCount } : service,
        ),
      );
      toast(editing ? "تم تحديث الخدمة" : "تمت إضافة الخدمة");
      router.refresh();
    } catch (error) {
      setServices(previous);
      toast(error instanceof Error ? error.message : "تعذر حفظ الخدمة", "error");
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  async function toggleActive(service: ServiceDTO) {
    const previous = services;
    setServices((current) =>
      current.map((item) => (item.id === service.id ? { ...item, isActive: !item.isActive } : item)),
    );
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: service.name,
          type: service.type,
          description: service.description,
          price: service.price,
          unit: service.unit,
          isActive: !service.isActive,
        }),
      });
      if (!response.ok) throw new Error("تعذر تحديث حالة الخدمة");
      toast(service.isActive ? "تم إيقاف الخدمة مؤقتاً" : "تم تفعيل الخدمة");
      router.refresh();
    } catch (error) {
      setServices(previous);
      toast(error instanceof Error ? error.message : "تعذر تحديث الحالة", "error");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const previous = services;
    setServices((current) => current.filter((service) => service.id !== deleting.id));
    try {
      const response = await fetch(`/api/services/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "تعذر حذف الخدمة");
      }
      toast("تم حذف الخدمة");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setServices(previous);
      toast(error instanceof Error ? error.message : "تعذر حذف الخدمة", "error");
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 p-5 text-white sm:p-6">
        <div className="grain absolute inset-0 opacity-25" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-white/70">الطبخ · العشاء · التقطيع · التوصيل</p>
            <h2 className="mt-1 text-lg font-extrabold sm:text-xl">باقات الضيافة والعزائم</h2>
            <p className="mt-1.5 max-w-lg text-[11px] leading-6 text-white/75">
              أضف خدماتك ليتمكن فريق المبيعات من إضافتها لأي طلب ذبيحة، مع حساب التكلفة تلقائياً.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl bg-white/15 px-4 py-2.5 text-center ring-1 ring-white/20">
              <p className="text-lg font-extrabold">{totalUsage}</p>
              <p className="text-[10px] text-white/70">طلب بخدمات</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-2.5 text-center ring-1 ring-white/20">
              <p className="text-lg font-extrabold">{formatMoney(avgPrice)}</p>
              <p className="text-[10px] text-white/70">متوسط السعر</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {["all", ...SERVICE_TYPES].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition",
                filter === type ? "bg-ink-900 text-white" : "bg-stone-100/80 text-ink-500 hover:bg-stone-100",
              )}
            >
              {type === "all" ? "كل الخدمات" : `${SERVICE_META[type]?.emoji ?? "•"} ${type}`}
            </button>
          ))}
        </div>
        <Button size="sm" icon="plus" onClick={openCreate}>
          خدمة جديدة
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="services"
            title={services.length === 0 ? "لا توجد خدمات بعد" : "لا توجد خدمات بهذا النوع"}
            description={
              services.length === 0
                ? "أضف باقات الطبخ والعشاء والتقطيع والتوصيل ليراها فريق المبيعات عند إنشاء الطلبات."
                : "جرّب نوعاً آخر أو أضف خدمة جديدة."
            }
            action={
              <Button icon="plus" onClick={openCreate}>
                إضافة خدمة
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((service) => {
            const meta = SERVICE_META[service.type] ?? { emoji: "•", tint: "from-stone-500/15 to-stone-400/5" };
            return (
              <article key={service.id} className={cn("card card-hover overflow-hidden", !service.isActive && "opacity-70")}>
                <div className={cn("bg-gradient-to-br p-4", meta.tint)}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg shadow-sm">{meta.emoji}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={service.isActive ? "success" : "neutral"}>{service.isActive ? "مفعّلة" : "موقوفة"}</Badge>
                      <Badge tone="brand">{service.type}</Badge>
                    </div>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-ink-900">{service.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-ink-500">
                    {service.description || "لا يوجد وصف."}
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-lg font-extrabold text-brand-700">{formatMoney(service.price)}</p>
                      <p className="text-[10px] text-ink-400">{service.unit}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-ink-800">{service.usageCount}</p>
                      <p className="text-[10px] text-ink-400">مرة في الطلبات</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Button size="sm" variant="secondary" icon="edit" className="flex-1" onClick={() => openEdit(service)}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => toggleActive(service)}>
                      {service.isActive ? "إيقاف" : "تفعيل"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDeleting(service)}
                      className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label="حذف"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "تعديل الخدمة" : "خدمة جديدة"}
        description="باقات الطبخ والعشاء والتقطيع والتوصيل التي يمكن إضافتها للطلبات."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" icon="check" onClick={save} loading={saving}>
              {editing ? "حفظ التعديلات" : "إضافة الخدمة"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم الخدمة" required className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="طبخ مندي كامل" />
          </Field>
          <Field label="النوع" required>
            <Select value={form.type} onChange={(event) => update("type", event.target.value)}>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="السعر (ر.س)" required>
            <Input
              type="number"
              min={0}
              value={form.price}
              onChange={(event) => update("price", event.target.value)}
              dir="ltr"
            />
          </Field>
          <Field label="الوحدة">
            <Input value={form.unit} onChange={(event) => update("unit", event.target.value)} placeholder="للطلب / للذبيحة / لـ ١٥ شخص" />
          </Field>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-xs font-semibold text-ink-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => update("isActive", event.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-brand-600"
              />
              متاحة للطلب
            </label>
          </div>
          <Field label="الوصف" className="sm:col-span-2">
            <Textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="تفاصيل الخدمة وما تشمله..."
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`حذف ${deleting?.name ?? ""}؟`}
        description="ستُحذف الخدمة من قائمة الاختيارات، وتبقى الطلبات السابقة كما هي."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
