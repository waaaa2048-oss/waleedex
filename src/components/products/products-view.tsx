"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import {
  KIND_META,
  PRODUCT_KINDS,
  animalMeta,
  cn,
  formatMoney,
  formatWeight,
} from "@/lib/format";
import type { ProductDTO } from "@/lib/types";
import type { StoreCategoryDTO } from "@/lib/admin-data";
import { ProductManagementTools } from "@/components/products/product-management-tools";

type FormState = {
  storeId: string;
  sku: string;
  modifiersText: string;
  name: string;
  animalType: string;
  category: string;
  kind: string;
  description: string;
  weightKg: string;
  pricePerKg: string;
  fixedPrice: string;
  stock: string;
  imageUrl: string;
  origin: string;
  isActive: boolean;
  isFeatured: boolean;
};

const EMPTY: FormState = {
  storeId: "1",
  sku: "",
  modifiersText: "",
  name: "",
  animalType: "عام",
  category: "عام",
  kind: "ready",
  description: "",
  weightKg: "",
  pricePerKg: "",
  fixedPrice: "",
  stock: "1",
  imageUrl: "",
  origin: "",
  isActive: true,
  isFeatured: false,
};

export function ProductsView({
  initialProducts,
  initialStoreId,
  selectedStoreName,
  storeType,
  categories,
  animalTypes,
  canWrite,
  canDelete,
  canManageCategories,
}: {
  initialProducts: ProductDTO[];
  initialStoreId: string;
  selectedStoreName: string;
  storeType: string;
  categories: StoreCategoryDTO[];
  animalTypes: string[];
  canWrite: boolean;
  canDelete: boolean;
  canManageCategories: boolean;
}) {
  const isSlaughterhouseStore = storeType === "SLAUGHTERHOUSE";
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductDTO[]>(initialProducts);
  const [configuredTypes, setConfiguredTypes] = useState(animalTypes);
  const productTypes = useMemo(
    () => Array.from(new Set([...configuredTypes, ...products.map((product) => product.animalType)])),
    [configuredTypes, products],
  );
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ProductDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggling, setToggling] = useState<number[]>([]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesType = filter === "all" || product.animalType === filter;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.origin.toLowerCase().includes(term) ||
        (product.sku ?? "").toLowerCase().includes(term);
      return matchesType && matchesTerm;
    });
  }, [products, filter, search]);

  const stats = useMemo(
    () => ({
      total: visible.length,
      heads: visible.reduce((sum, product) => sum + product.stock, 0),
      value: visible.reduce((sum, product) => sum + product.stock * product.totalPrice, 0),
    }),
    [visible],
  );
  const formCategories = categories.filter((category) => category.storeId === Number(form.storeId));

  async function refreshProducts() {
    const response = await fetch(`/api/products?storeId=${initialStoreId}`);
    const data = (await response.json()) as { products?: ProductDTO[]; error?: string };
    if (!response.ok || !data.products) throw new Error(data.error ?? "تعذر تحديث قائمة المنتجات");
    setProducts(data.products);
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    const targetStoreId = initialStoreId;
    setForm({
      ...EMPTY,
      storeId: targetStoreId,
      category: categories.find((category) => category.storeId === Number(targetStoreId))?.name ?? "عام",
      animalType: "عام",
    });
    setOpen(true);
  }

  function openEdit(product: ProductDTO) {
    setEditing(product);
    setForm({
      storeId: String(product.storeId),
      sku: product.sku ?? "",
      modifiersText: (product.modifiers ?? [])
        .map((modifier) => `${modifier.name}${modifier.required ? "*" : ""}: ${modifier.options.map((option) => `${option.label}${option.priceDelta ? ` (${option.priceDelta > 0 ? "+" : ""}${option.priceDelta})` : ""}`).join(", ")}`)
        .join("\n"),
      name: product.name,
      animalType: product.animalType,
      category: product.category,
      kind: product.kind,
      description: product.description,
      weightKg: String(product.weightKg),
      pricePerKg: String(product.pricePerKg),
      fixedPrice: product.fixedPrice ? String(product.fixedPrice) : "",
      stock: String(product.stock),
      imageUrl: product.imageUrl ?? "",
      origin: product.origin,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
    });
    setOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function uploadProductImage(file?: File) {
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
      update("imageUrl", String(reader.result));
      toast("تم رفع صورة المنتج — احفظ التغييرات لتثبيتها");
    };
    reader.onerror = () => toast("تعذر قراءة الصورة", "error");
    reader.readAsDataURL(file);
  }

  function buildPayload(state: FormState) {
    const modifiers = state.modifiersText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator <= 0) return null;
        const rawName = line.slice(0, separator).trim();
        const required = rawName.endsWith("*");
        const name = required ? rawName.slice(0, -1).trim() : rawName;
        const options = line
          .slice(separator + 1)
          .split(",")
          .map((rawOption) => {
            const option = rawOption.trim();
            const match = option.match(/^(.*?)\s*\(([+-]?\d+(?:\.\d+)?)\)$/);
            const label = (match?.[1] ?? option).trim();
            return label
              ? { label, value: label, priceDelta: match ? Number(match[2]) : 0 }
              : null;
          })
          .filter((option): option is NonNullable<typeof option> => option !== null);
        return name && options.length ? { name, type: "select", required, options } : null;
      })
      .filter((modifier): modifier is NonNullable<typeof modifier> => modifier !== null);

    return {
      storeId: Number(state.storeId) || 1,
      sku: state.sku.trim(),
      modifiers,
      name: state.name,
      animalType: state.animalType,
      category: state.category,
      kind: state.kind,
      description: state.description,
      weightKg: Number(state.weightKg) || 0,
      pricePerKg: Number(state.pricePerKg) || 0,
      fixedPrice: Number(state.fixedPrice) > 0 ? Number(state.fixedPrice) : null,
      stock: Number(state.stock) || 0,
      imageUrl: state.imageUrl.trim() || null,
      origin: state.origin,
      isActive: state.isActive,
      isFeatured: state.isFeatured,
    };
  }

  async function save() {
    const payload = buildPayload(form);
    if (payload.name.trim().length < 2) {
      toast("أدخل اسم المنتج", "error");
      return;
    }
    if (isSlaughterhouseStore && (payload.weightKg <= 0 || payload.pricePerKg <= 0) && !payload.fixedPrice) {
      toast("أدخل الوزن وسعر الوحدة أو سعراً ثابتاً", "error");
      return;
    }
    if (!isSlaughterhouseStore && !payload.fixedPrice) {
      toast("أدخل سعر المنتج", "error");
      return;
    }

    setSaving(true);
    const previous = products;
    const computedTotal = payload.weightKg * payload.pricePerKg;
    const optimistic: ProductDTO = {
      id: editing?.id ?? -Date.now(),
      ...payload,
      sku: payload.sku || editing?.sku || "",
      storeId: payload.storeId,
      kind: payload.kind as ProductDTO["kind"],
      description: payload.description,
      totalPrice: computedTotal,
      price: payload.fixedPrice ?? computedTotal,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    setProducts((current) =>
      editing ? current.map((product) => (product.id === editing.id ? optimistic : product)) : [optimistic, ...current],
    );
    setOpen(false);

    try {
      const response = await fetch(editing ? `/api/products/${editing.id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { product?: ProductDTO; error?: string };
      if (!response.ok || !data.product) throw new Error(data.error ?? "تعذر حفظ المنتج");
      const saved = data.product;
      setProducts((current) => current.map((product) => (product.id === optimistic.id ? saved : product)));
      toast(editing ? "تم تحديث بيانات المنتج" : "تمت إضافة المنتج للمخزون");
      router.refresh();
    } catch (error) {
      setProducts(previous);
      toast(error instanceof Error ? error.message : "تعذر حفظ المنتج", "error");
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  async function toggleActive(product: ProductDTO) {
    const previous = products;
    setProducts((current) =>
      current.map((entry) => (entry.id === product.id ? { ...entry, isActive: !entry.isActive } : entry)),
    );
    setToggling((current) => [...current, product.id]);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: product.storeId,
          sku: product.sku,
          name: product.name,
          animalType: product.animalType,
          category: product.category,
          kind: product.kind,
          description: product.description,
          weightKg: product.weightKg,
          pricePerKg: product.pricePerKg,
          fixedPrice: product.fixedPrice,
          stock: product.stock,
          imageUrl: product.imageUrl,
          origin: product.origin,
          isActive: !product.isActive,
          isFeatured: product.isFeatured,
        }),
      });
      if (!response.ok) throw new Error("تعذر تحديث حالة العرض");
      toast(product.isActive ? "تم إخفاء المنتج من القائمة" : "تم تفعيل عرض المنتج");
      router.refresh();
    } catch (error) {
      setProducts(previous);
      toast(error instanceof Error ? error.message : "تعذر تحديث الحالة", "error");
    } finally {
      setToggling((current) => current.filter((id) => id !== product.id));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const previous = products;
    setProducts((current) => current.filter((product) => product.id !== deleting.id));
    try {
      const response = await fetch(`/api/products/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "تعذر حذف المنتج");
      }
      toast("تم حذف المنتج");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setProducts(previous);
      toast(error instanceof Error ? error.message : "تعذر حذف المنتج", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "منتجات مسجلة", value: `${stats.total} صنف`, icon: "box" as const },
          { label: "وحدات بالمخزون", value: `${stats.heads} منتج`, icon: "products" as const },
          { label: "قيمة المنتجات بالمخزون", value: formatMoney(stats.value), icon: "wallet" as const },
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

      <ProductManagementTools
        key={`${initialStoreId}:${configuredTypes.join("|")}`}
        products={products}
        categories={categories}
        storeId={initialStoreId}
        animalTypes={configuredTypes}
        isSlaughterhouseStore={isSlaughterhouseStore}
        canWrite={canWrite}
        canDelete={canDelete}
        canManageCategories={canManageCategories}
        onAnimalTypesChanged={setConfiguredTypes}
        onProductsChanged={refreshProducts}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold text-ink-500">
          المتجر المحدد: <span className="text-ink-900">{selectedStoreName}</span>
        </div>
        {isSlaughterhouseStore ? (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {["all", ...productTypes].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition",
                filter === type ? "bg-ink-900 text-white" : "bg-stone-100/80 text-ink-500 hover:bg-stone-100",
              )}
            >
              {type === "all" ? "كل الأنواع" : `${animalMeta(type).emoji} ${type}`}
            </button>
          ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Icon name="search" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن منتج..."
              className="input h-10 pr-9 text-xs"
            />
          </div>
          <Button size="sm" icon="plus" onClick={openCreate}>
            منتج جديد
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="products"
            title={products.length === 0 ? "المخزون فارغ" : "لا توجد نتائج"}
            description={
              products.length === 0
                ? "أضف أول منتج مع السعر والصورة والتصنيف ليظهر في المتجر وقائمة الطلبات."
                : "جرّب نوعاً آخر أو كلمة بحث مختلفة."
            }
            action={
              <Button icon="plus" onClick={openCreate}>
                إضافة منتج
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((product) => {
            const meta = animalMeta(product.animalType);
            const isToggling = toggling.includes(product.id);
            return (
              <article
                key={product.id}
                className={cn("card card-hover overflow-hidden", !product.isActive && "opacity-70")}
              >
                <div className="relative h-40 overflow-hidden bg-stone-100">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 to-stone-100 text-4xl">
                      {isSlaughterhouseStore ? meta.emoji : "📦"}
                    </div>
                  )}
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                    <span className={cn("inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold ring-1", meta.ring)}>
                      {isSlaughterhouseStore ? `${meta.emoji} ${product.animalType}` : product.category}
                    </span>
                    <div className="flex gap-1">
                      {product.isFeatured ? (
                        <span className="rounded-full bg-brand-600 px-2 py-1 text-[9px] font-bold text-white">مميز</span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[9px] font-bold",
                          product.stock === 0
                            ? "bg-rose-600 text-white"
                            : product.stock <= 3
                              ? "bg-amber-500 text-white"
                              : "bg-emerald-600 text-white",
                        )}
                      >
                        {product.stock === 0 ? "نفد المخزون" : `${product.stock} متاح`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-ink-900">{product.name}</h3>
                      <p className="mt-0.5 truncate text-[10px] text-ink-400">{product.origin || "غير محدد المصدر"}</p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-brand-700">{formatMoney(product.price)}</span>
                  </div>

                  <p className="mt-2 line-clamp-2 min-h-8 text-[11px] leading-4 text-ink-400">
                    {product.description || "لا يوجد وصف."}
                  </p>

                  {isSlaughterhouseStore ? (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-[10px] font-semibold text-ink-500">
                      <span>{formatWeight(product.weightKg)}</span>
                      <span className="text-stone-300">·</span>
                      <span>{product.fixedPrice ? "سعر ثابت" : `${formatMoney(product.pricePerKg)} / كجم`}</span>
                      <span className="text-stone-300">·</span>
                      <span className={product.isActive ? "text-emerald-600" : "text-ink-400"}>
                        {product.isActive ? "معروض" : "مخفي"}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-[10px] font-semibold text-ink-500">
                      سعر المنتج ثابت حسب السعر المحدد
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800 ring-1 ring-brand-100">
                      {product.category}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 ring-1 ring-inset", KIND_META[product.kind].badge)}>
                      {KIND_META[product.kind].label}
                    </span>
                  </div>

                  {canWrite || canDelete ? (
                    <div className="mt-3 flex items-center gap-1.5">
                      {canWrite ? (
                        <>
                          <Button size="sm" variant="secondary" icon="edit" className="flex-1" onClick={() => openEdit(product)}>
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant={product.isActive ? "ghost" : "subtle"}
                            onClick={() => toggleActive(product)}
                            loading={isToggling}
                            className="flex-1"
                          >
                            {product.isActive ? "إخفاء" : "إظهار"}
                          </Button>
                        </>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => setDeleting(product)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="حذف"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "تعديل المنتج" : "إضافة منتج جديد"}
        description={isSlaughterhouseStore ? "أدخل بيانات المنتج وسعره؛ يمكن استخدام سعر ثابت أو حسابه من الوزن." : "أدخل بيانات المنتج وسعره الثابت ومخزونه."}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" icon="check" onClick={save} loading={saving}>
              {editing ? "حفظ التعديلات" : "إضافة المنتج"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المتجر" required>
            <Select value={form.storeId} disabled>
              <option value={initialStoreId}>{selectedStoreName}</option>
            </Select>
          </Field>
          <Field label="رمز المنتج (SKU)" hint="يُنشأ تلقائيًا إذا تُرك فارغًا">
            <Input value={form.sku} onChange={(event) => update("sku", event.target.value)} placeholder="SKU-001" dir="ltr" />
          </Field>
          <Field label="خيارات المنتج" hint="سطر لكل خيار: المقاس*: S, M, L أو اللون: أسود, أبيض. يمكن إضافة فرق السعر بين قوسين. مثال: XL (+15)" className="sm:col-span-2">
            <Textarea
              value={form.modifiersText}
              onChange={(event) => update("modifiersText", event.target.value)}
              placeholder={"المقاس*: S, M, L, XL\nاللون*: أسود, أبيض"}
              rows={3}
              dir="auto"
            />
          </Field>
          <Field label="اسم المنتج" required className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="مثال: منتج مميز" />
          </Field>
          {isSlaughterhouseStore ? (
            <Field label="نوع الذبيحة" required>
              <Select value={form.animalType} onChange={(event) => update("animalType", event.target.value)}>
                {[...new Set([...productTypes, form.animalType])].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="التصنيف في المتجر" hint="أضف التصنيفات من صفحة التصنيفات">
            <Input list="store-product-categories" value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="اختر أو اكتب تصنيفاً" />
            <datalist id="store-product-categories">{formCategories.map((category) => <option key={category.id} value={category.name} />)}</datalist>
          </Field>
          <Field label="نوع العرض">
            <Select value={form.kind} onChange={(event) => update("kind", event.target.value)}>
              {PRODUCT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_META[kind].label}
                </option>
              ))}
            </Select>
          </Field>
          {isSlaughterhouseStore ? <Field label="المصدر / المزرعة">
            <Input value={form.origin} onChange={(event) => update("origin", event.target.value)} placeholder="مزارع القصيم" />
          </Field> : null}
          {isSlaughterhouseStore ? <Field label="الوزن (كجم)" hint="اختياري عند استخدام سعر ثابت">
            <Input
              type="number"
              min={1}
              step="0.5"
              value={form.weightKg}
              onChange={(event) => update("weightKg", event.target.value)}
              dir="ltr"
            />
          </Field> : null}
          {isSlaughterhouseStore ? <Field label="سعر الوحدة / الكيلو (ر.س)" hint="اختياري عند استخدام سعر ثابت">
            <Input
              type="number"
              min={1}
              value={form.pricePerKg}
              onChange={(event) => update("pricePerKg", event.target.value)}
              dir="ltr"
            />
          </Field> : null}
          <Field label="الكمية المتاحة">
            <Input
              type="number"
              min={0}
              value={form.stock}
              onChange={(event) => update("stock", event.target.value)}
              dir="ltr"
            />
          </Field>
          <Field label={isSlaughterhouseStore ? "سعر ثابت (اختياري)" : "سعر المنتج (ر.س)"} hint={isSlaughterhouseStore ? "للمنتجات ذات السعر الثابت — يتجاوز حساب الوزن" : undefined}>
            <Input
              type="number"
              min={0}
              value={form.fixedPrice}
              onChange={(event) => update("fixedPrice", event.target.value)}
              placeholder={isSlaughterhouseStore ? "1199" : "0"}
              dir="ltr"
            />
          </Field>
          {isSlaughterhouseStore ? <Field label="سعر العرض النهائي" hint="السعر الثابت إن وُجد، وإلا الوزن × سعر الكيلو">
            <div className="input flex items-center justify-between bg-stone-50 font-bold text-brand-700">
              {formatMoney(
                Number(form.fixedPrice) > 0
                  ? Number(form.fixedPrice)
                  : (Number(form.weightKg) || 0) * (Number(form.pricePerKg) || 0),
              )}
            </div>
          </Field> : null}
          <Field label="صورة المنتج — رفع أو رابط" hint="اختر صورة من جهازك أو ألصق رابطاً مباشراً" className="sm:col-span-2">
            <div className="space-y-2">
              <Input value={form.imageUrl.startsWith("data:") ? "تم رفع صورة من الجهاز" : form.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} placeholder="https://..." dir="ltr" />
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-2 text-[10px] font-bold text-ink-600 hover:bg-stone-200">
                <Icon name="plus" className="h-3.5 w-3.5" /> رفع صورة من الجهاز
                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadProductImage(event.target.files?.[0])} />
              </label>
              {form.imageUrl ? <img src={form.imageUrl} alt="معاينة المنتج" className="h-20 w-20 rounded-xl border border-stone-200 bg-white object-cover" /> : null}
            </div>
          </Field>
          <Field label="الوصف" className="sm:col-span-2">
            <Textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="اكتب وصفاً مختصراً للمنتج ومميزاته..."
            />
          </Field>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => update("isActive", event.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-brand-600"
              />
              معروض للطلب
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-600">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => update("isFeatured", event.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-brand-600"
              />
              منتج مميز
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`حذف ${deleting?.name ?? ""}؟`}
        description="سيتم إزالة المنتج من المخزون والقوائم، وتبقى الطلبات السابقة محفوظة."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
