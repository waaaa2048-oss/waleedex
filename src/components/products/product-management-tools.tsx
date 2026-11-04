"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { PRODUCT_KINDS, animalMeta, formatDateTime } from "@/lib/format";
import type { ProductDTO } from "@/lib/types";
import type { StoreCategoryDTO } from "@/lib/admin-data";

type InventoryMovement = {
  id: number;
  productName: string;
  previousStock: number;
  newStock: number;
  reason: string;
  actorName: string;
  createdAt: string;
};

type Props = {
  products: ProductDTO[];
  categories: StoreCategoryDTO[];
  animalTypes: string[];
  isSlaughterhouseStore?: boolean;
  storeId: string;
  canWrite: boolean;
  canDelete: boolean;
  canManageCategories: boolean;
  onAnimalTypesChanged: (types: string[]) => void;
  onProductsChanged: () => Promise<void>;
};

const TYPE_EMOJI: Record<string, string> = {
  عام: "📦",
  خروف: "🐑",
  تيس: "🐐",
  "لحم مفروم": "🥩",
  حاشي: "🐪",
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("ملف CSV يحتوي على علامات اقتباس غير مكتملة");
  return rows;
}

function csvValue(value: string | number | boolean): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function ProductManagementTools({
  products,
  categories,
  animalTypes: initialTypes,
  isSlaughterhouseStore = true,
  storeId,
  canWrite,
  canDelete,
  canManageCategories,
  onAnimalTypesChanged,
  onProductsChanged,
}: Props) {
  const { toast } = useToast();
  const [typesOpen, setTypesOpen] = useState(false);
  const [types, setTypes] = useState(initialTypes);
  const [newType, setNewType] = useState("");
  const [typesSaving, setTypesSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState<"products" | "prices" | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAnimalType, setBulkAnimalType] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkActive, setBulkActive] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [fixedPrice, setFixedPrice] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryMovement[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);

  const availableTypes = useMemo(
    () => Array.from(new Set([...types, ...products.map((product) => product.animalType)])),
    [products, types],
  );
  const selectedCount = selectedIds.length;

  function toggleSelected(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id],
    );
  }

  function openBulk(mode: "products" | "prices") {
    setSelectedIds([]);
    setBulkMode(mode);
    setBulkAnimalType("");
    setBulkCategory("");
    setBulkActive("");
    setPricePerKg("");
    setFixedPrice("");
  }

  async function applyBulkUpdates(updates: Record<string, string | number | boolean | null>) {
    if (!selectedIds.length) {
      toast("حدد منتجاً واحداً على الأقل", "error");
      return;
    }
    const parsedUpdates = { ...updates } as Record<string, unknown>;
    if (parsedUpdates.pricePerKg !== undefined) parsedUpdates.pricePerKg = Number(parsedUpdates.pricePerKg);
    if (parsedUpdates.fixedPrice !== undefined && parsedUpdates.fixedPrice !== null) {
      parsedUpdates.fixedPrice = Number(parsedUpdates.fixedPrice);
    }
    setBulkSaving(true);
    try {
      const response = await fetch("/api/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, updates: parsedUpdates }),
      });
      const data = (await response.json()) as { updatedCount?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر تعديل المنتجات");
      toast(`تم تحديث ${data.updatedCount ?? selectedIds.length} منتج`);
      setBulkMode(null);
      await onProductsChanged();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر تطبيق التعديلات", "error");
    } finally {
      setBulkSaving(false);
    }
  }

  async function saveTypes() {
    setTypesSaving(true);
    try {
      const response = await fetch(`/api/products/types?storeId=${storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types }),
      });
      const data = (await response.json()) as { types?: string[]; error?: string };
      if (!response.ok || !data.types) throw new Error(data.error ?? "تعذر حفظ خيارات الأنواع");
      setTypes(data.types);
      onAnimalTypesChanged(data.types);
      setTypesOpen(false);
      toast("تم حفظ أنواع المنتجات بنجاح");
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ الأنواع", "error");
    } finally {
      setTypesSaving(false);
    }
  }

  function addType() {
    const value = newType.trim();
    if (!value || types.includes(value)) {
      toast(value ? "هذا النوع موجود بالفعل" : "اكتب اسم النوع أولاً", "error");
      return;
    }
    if (value.length > 32 || types.length >= 30) {
      toast("الحد الأقصى 30 نوعاً، وطول الاسم 32 حرفاً", "error");
      return;
    }
    setTypes((current) => [...current, value]);
    setNewType("");
  }

  function exportProducts() {
    const headers = isSlaughterhouseStore
      ? ["name", "animalType", "category", "kind", "description", "weightKg", "pricePerKg", "fixedPrice", "stock", "origin", "isActive", "isFeatured"]
      : ["name", "category", "kind", "description", "fixedPrice", "stock", "origin", "isActive", "isFeatured"];
    const rows = products.map((product) =>
      isSlaughterhouseStore
        ? [
            product.name, product.animalType, product.category, product.kind, product.description,
            product.weightKg, product.pricePerKg, product.fixedPrice ?? "", product.stock,
            product.origin, product.isActive, product.isFeatured,
          ]
        : [
            product.name, product.category, product.kind, product.description, product.fixedPrice ?? product.price,
            product.stock, product.origin, product.isActive, product.isFeatured,
          ],
    );
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "products.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importProducts(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("حجم ملف الاستيراد يجب ألا يتجاوز 5 ميجابايت", "error");
      return;
    }
    setImporting(true);
    let imported = 0;
    const failures: string[] = [];
    try {
      const rows = parseCsv(await file.text());
      const [header, ...records] = rows;
      if (!header?.length || records.length > 500) {
        throw new Error(records.length > 500 ? "الحد الأقصى 500 منتج في الملف الواحد" : "الملف فارغ أو بلا عناوين أعمدة");
      }
      const normalizedHeaders = header.map((value) => value.toLowerCase().replaceAll(" ", ""));
      const column = (...names: string[]) => names.map((name) => normalizedHeaders.indexOf(name)).find((index) => index >= 0);
      const nameIndex = column("name", "productname", "اسمالمنتج", "الاسم");
      if (nameIndex === undefined) throw new Error("يجب أن يحتوي الملف على عمود name أو اسم المنتج");
      const typeIndex = column("animaltype", "type", "نوعالحيوان", "النوع");
      const categoryIndex = column("category", "التصنيف");
      const kindIndex = column("kind", "نوعالعرض");
      const descriptionIndex = column("description", "الوصف");
      const weightIndex = column("weightkg", "weight", "الوزنكجم", "الوزن");
      const priceIndex = column("priceperkg", "سعرالكيلو");
      const fixedPriceIndex = column("fixedprice", "السعرالثابت");
      const stockIndex = column("stock", "quantity", "الكمية");
      const originIndex = column("origin", "المصدر");

      for (let index = 0; index < records.length; index += 1) {
        const row = records[index];
        const read = (position: number | undefined, fallback = "") => position === undefined ? fallback : row[position] ?? fallback;
        const name = read(nameIndex).trim();
        const payload = {
          storeId: Number(storeId),
          name,
          animalType: read(typeIndex, "عام") || "عام",
          category: read(categoryIndex, categories[0]?.name ?? "عام") || categories[0]?.name || "عام",
          kind: PRODUCT_KINDS.includes(read(kindIndex, "ready") as (typeof PRODUCT_KINDS)[number])
            ? read(kindIndex, "ready")
            : "ready",
          description: read(descriptionIndex),
          weightKg: Number(read(weightIndex)) || 0,
          pricePerKg: Number(read(priceIndex)) || 0,
          fixedPrice: Number(read(fixedPriceIndex)) > 0 ? Number(read(fixedPriceIndex)) : null,
          stock: Math.max(0, Math.floor(Number(read(stockIndex)) || 0)),
          imageUrl: null,
          origin: read(originIndex),
          isActive: true,
          isFeatured: false,
        };
        if (name.length < 2 || ((!payload.weightKg || !payload.pricePerKg) && !payload.fixedPrice)) {
          failures.push(`السطر ${index + 2}: الاسم أو السعر/الوزن غير صالح`);
          continue;
        }
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          imported += 1;
        } else {
          const data = (await response.json()) as { error?: string };
          failures.push(`السطر ${index + 2}: ${data.error ?? "تعذر الحفظ"}`);
        }
      }
      if (imported) await onProductsChanged();
      if (failures.length) {
        toast(`تم استيراد ${imported} من ${records.length}؛ تعذر ${failures.length}. ${failures.slice(0, 2).join(" — ")}`, "error");
      } else {
        toast(`تم استيراد ${imported} منتج بنجاح`);
        setImportOpen(false);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر قراءة ملف CSV", "error");
    } finally {
      setImporting(false);
    }
  }

  async function openInventory() {
    setInventoryOpen(true);
    setInventoryLoading(true);
    try {
      const response = await fetch("/api/products/inventory");
      const data = (await response.json()) as { movements?: InventoryMovement[]; error?: string };
      if (!response.ok || !data.movements) throw new Error(data.error ?? "تعذر تحميل السجل");
      setInventory(data.movements);
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر تحميل سجل الكميات", "error");
      setInventoryOpen(false);
    } finally {
      setInventoryLoading(false);
    }
  }

  async function deleteAllProducts() {
    if (deleteConfirmation !== "حذف جميع المنتجات") return;
    setDeletingAll(true);
    try {
      const response = await fetch("/api/products/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: products.map((product) => product.id) }),
      });
      const data = (await response.json()) as { deletedCount?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر حذف المنتجات");
      toast(`تم حذف ${data.deletedCount ?? products.length} منتج`);
      setDeleteAllOpen(false);
      setDeleteConfirmation("");
      await onProductsChanged();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حذف المنتجات", "error");
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          {canManageCategories ? (
            <Link href={`/dashboard/categories?storeId=${storeId}`} className="inline-flex h-9 items-center rounded-xl bg-stone-100 px-3 text-xs font-bold text-ink-700 transition hover:bg-stone-200">
              تصنيفات المنتجات
            </Link>
          ) : null}
          {canWrite && isSlaughterhouseStore ? <Button size="sm" variant="secondary" onClick={() => setTypesOpen(true)}>إدارة فلاتر أنواع الذبائح</Button> : null}
          {canWrite ? (
            <>
              <Button size="sm" variant={bulkMode === "products" ? "dark" : "secondary"} onClick={() => openBulk("products")}>تعديل المنتجات</Button>
              <Button size="sm" variant="secondary" onClick={() => openBulk("prices")}>تعديل الأسعار</Button>
            </>
          ) : null}
          <Button size="sm" variant="secondary" onClick={openInventory}>سجل الكميات</Button>
          {canWrite ? <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>استيراد المنتجات</Button> : null}
          <Button size="sm" variant="secondary" onClick={exportProducts}>تصدير المنتجات</Button>
          {canDelete ? (
            <Button size="sm" variant="danger" disabled={!products.length} onClick={() => { setDeleteConfirmation(""); setDeleteAllOpen(true); }}>
              حذف جميع المنتجات
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] leading-5 text-ink-400">
          الاستيراد والتصدير بصيغة CSV. التعديلات الجماعية تعمل على المنتجات التي تحددها، وسجل الكميات يعرض آخر 500 حركة.
        </p>
      </section>

      {bulkMode ? (
        <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-ink-800">حدد المنتجات للتعديل الجماعي ({selectedCount} محدد)</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(products.map((product) => product.id))}>تحديد الكل</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>إلغاء التحديد</Button>
              <Button size="sm" variant="secondary" onClick={() => setBulkMode(null)}>إغلاق</Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {products.map((product) => (
              <label key={product.id} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold ring-1 ring-stone-200">
                <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleSelected(product.id)} className="accent-brand-600" />
                {product.name}
              </label>
            ))}
          </div>
          {bulkMode === "products" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {isSlaughterhouseStore ? <Field label="نوع الذبيحة">
                <Select value={bulkAnimalType} onChange={(event) => setBulkAnimalType(event.target.value)}>
                  <option value="">بدون تغيير</option>
                  {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </Select>
              </Field> : null}
              <Field label="تصنيف المتجر">
                <Select value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}>
                  <option value="">بدون تغيير</option>
                  {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                </Select>
              </Field>
              <Field label="حالة العرض">
                <Select value={bulkActive} onChange={(event) => setBulkActive(event.target.value)}>
                  <option value="">بدون تغيير</option>
                  <option value="true">إظهار</option>
                  <option value="false">إخفاء</option>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button size="sm" loading={bulkSaving} onClick={() => applyBulkUpdates({
                  ...(bulkAnimalType ? { animalType: bulkAnimalType } : {}),
                  ...(bulkCategory ? { category: bulkCategory } : {}),
                  ...(bulkActive ? { isActive: bulkActive === "true" } : {}),
                })}>تطبيق التعديلات</Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {isSlaughterhouseStore ? <Field label="سعر الكيلو الجديد (اختياري)">
                <Input type="number" min="0.01" step="0.01" value={pricePerKg} onChange={(event) => setPricePerKg(event.target.value)} dir="ltr" />
              </Field> : null}
              <Field label="السعر الثابت الجديد (اختياري)">
                <Input type="number" min="0.01" step="0.01" value={fixedPrice} onChange={(event) => setFixedPrice(event.target.value)} dir="ltr" />
              </Field>
              <div className="flex items-end">
                <Button size="sm" loading={bulkSaving} onClick={() => {
                  if (!pricePerKg && !fixedPrice) {
                    toast("أدخل سعر الكيلو أو السعر الثابت", "error");
                    return;
                  }
                  void applyBulkUpdates({
                    ...(pricePerKg ? { pricePerKg } : {}),
                    ...(fixedPrice ? { fixedPrice } : {}),
                  });
                }}>تطبيق الأسعار</Button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <Modal
        open={typesOpen}
        onClose={() => setTypesOpen(false)}
        title="إدارة فلاتر أنواع المنتجات"
        description="عدّل الخيارات التي تظهر أعلى قائمة المنتجات وعند إضافة منتج. حذف خيار لا يغيّر الأنواع المسجلة على المنتجات الحالية."
        footer={<><Button size="sm" variant="secondary" onClick={() => setTypesOpen(false)}>إلغاء</Button><Button size="sm" onClick={saveTypes} loading={typesSaving}>حفظ الخيارات</Button></>}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={newType} onChange={(event) => setNewType(event.target.value)} placeholder="أضف نوعاً جديداً" maxLength={32} />
            <Button size="sm" onClick={addType}>إضافة</Button>
          </div>
          <div className="space-y-2">
            {types.map((type) => (
              <div key={type} className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2">
                <span className="text-sm font-semibold">{TYPE_EMOJI[type] ?? animalMeta(type).emoji} {type}</span>
                <Button size="sm" variant="danger" onClick={() => setTypes((current) => current.filter((entry) => entry !== type))}>حذف الخيار</Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={inventoryOpen} onClose={() => setInventoryOpen(false)} title="سجل الكميات" description="آخر 500 حركة موثقة عند إنشاء منتج أو تعديل كميته." size="lg">
        {inventoryLoading ? <p className="py-8 text-center text-sm text-ink-400">جارٍ تحميل السجل...</p> : inventory.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-right text-xs">
              <thead><tr className="border-b border-stone-200 text-ink-400"><th className="p-2">المنتج</th><th className="p-2">السابق</th><th className="p-2">الجديد</th><th className="p-2">السبب</th><th className="p-2">المستخدم</th><th className="p-2">التاريخ</th></tr></thead>
              <tbody>{inventory.map((movement) => (
                <tr key={movement.id} className="border-b border-stone-100">
                  <td className="p-2 font-semibold">{movement.productName}</td>
                  <td className="p-2">{movement.previousStock}</td>
                  <td className="p-2">{movement.newStock}</td>
                  <td className="p-2">{movement.reason}</td>
                  <td className="p-2">{movement.actorName}</td>
                  <td className="p-2 whitespace-nowrap">{formatDateTime(movement.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="py-8 text-center text-sm text-ink-400">لا توجد حركات مخزون مسجلة بعد.</p>}
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="استيراد المنتجات"
        description={isSlaughterhouseStore
          ? "اختر ملف CSV بترميز UTF-8. الأعمدة المطلوبة: name, weightKg, pricePerKg أو fixedPrice."
          : "اختر ملف CSV بترميز UTF-8. الأعمدة المطلوبة: name وfixedPrice."}
        size="sm"
      >
        <Field label="ملف المنتجات CSV">
          <Input type="file" accept=".csv,text/csv" disabled={importing} onChange={(event) => void importProducts(event.target.files?.[0])} />
        </Field>
        <p className="mt-3 text-[11px] leading-5 text-ink-400">تتم إضافة المنتجات الصالحة، وتظهر لك أرقام الأسطر التي تعذر استيرادها. الحد 500 منتج في الملف.</p>
      </Modal>

      <Modal
        open={deleteAllOpen}
        onClose={() => { setDeleteAllOpen(false); setDeleteConfirmation(""); }}
        title="حذف جميع المنتجات؟"
        description={`سيتم حذف ${products.length} منتج من المخزون. لا يمكن التراجع عن ذلك، وتبقى تفاصيل الطلبات السابقة محفوظة.`}
        size="sm"
        footer={
          <>
            <Button size="sm" variant="secondary" onClick={() => { setDeleteAllOpen(false); setDeleteConfirmation(""); }}>تراجع</Button>
            <Button size="sm" variant="danger" icon="trash" loading={deletingAll} disabled={deleteConfirmation !== "حذف جميع المنتجات"} onClick={() => void deleteAllProducts()}>حذف نهائي</Button>
          </>
        }
      >
        <Field label='اكتب "حذف جميع المنتجات" للتأكيد'>
          <Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" />
        </Field>
      </Modal>
    </>
  );
}
