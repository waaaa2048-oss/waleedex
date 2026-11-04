"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatMoney } from "@/lib/format";

type Shipment = {
  id: number;
  orderId: number;
  orderCode: string;
  carrierId: number | null;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  status: string;
  cancellationStatus: string;
  shippingCost: number | null;
  billingReference: string | null;
  notes: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, { label: string; tone: "neutral" | "brand" | "success" | "warning" | "danger" }> = {
  pending: { label: "بانتظار الإصدار", tone: "warning" },
  created: { label: "أُنشئت", tone: "brand" },
  in_transit: { label: "في الطريق", tone: "brand" },
  delivered: { label: "تم التسليم", tone: "success" },
  cancelled: { label: "ملغاة", tone: "danger" },
  failed: { label: "تعذّر الإصدار", tone: "danger" },
};

export function ShippingShipmentsView({
  initial,
  carriers,
}: {
  initial: Shipment[];
  carriers: { id: number; name: string }[];
}) {
  const [carrierId, setCarrierId] = useState("all");
  const [status, setStatus] = useState("all");
  const visible = useMemo(() => initial.filter((shipment) =>
    (carrierId === "all" || String(shipment.carrierId) === carrierId) &&
    (status === "all" || shipment.status === status),
  ), [initial, carrierId, status]);

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <Icon name="truck" className="mt-0.5 h-5 w-5 text-brand-700" />
          <div>
            <h2 className="text-sm font-extrabold text-ink-900">أرشيف الشحنات والبوليصات</h2>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-500">سيظهر هنا رقم التتبع ورابط الطباعة وحالة الإلغاء بعد ربط API الناقل. حالياً سجل الأرشيف جاهز ولا يتم إنشاء بوليصات وهمية.</p>
          </div>
        </div>
        <Button disabled title="يتطلب وثائق API واعتماد موصل الناقل">إصدار بوليصة · غير متاح بعد</Button>
      </section>

      <section className="card grid gap-3 p-4 sm:grid-cols-3">
        <label className="field-label mb-0">الناقل
          <Select value={carrierId} onChange={(event) => setCarrierId(event.target.value)}>
            <option value="all">كل الشركات</option>
            {carriers.map((carrier) => <option key={carrier.id} value={carrier.id}>{carrier.name}</option>)}
          </Select>
        </label>
        <label className="field-label mb-0">حالة الشحنة
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </Select>
        </label>
        <div className="flex items-end text-xs font-bold text-ink-500">عرض {visible.length} من {initial.length} شحنة</div>
      </section>

      {visible.length ? (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[850px] text-right text-xs">
            <thead className="bg-stone-50 text-ink-500">
              <tr>{["رقم الطلب", "شركة الشحن", "التتبع", "الحالة", "التكلفة / مرجع الفوترة", "تاريخ الإنشاء", "البوليصة"].map((item) => <th key={item} className="px-4 py-3 font-bold">{item}</th>)}</tr>
            </thead>
            <tbody>
              {visible.map((shipment) => {
                const state = STATUS_LABELS[shipment.status] ?? { label: shipment.status, tone: "neutral" as const };
                return (
                  <tr key={shipment.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-extrabold">{shipment.orderCode}</td>
                    <td className="px-4 py-3">{shipment.carrierName ?? "ناقل محذوف"}</td>
                    <td className="px-4 py-3">{shipment.trackingUrl ? <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">{shipment.trackingNumber ?? "تتبع الشحنة"}</a> : shipment.trackingNumber ?? "—"}</td>
                    <td className="px-4 py-3"><Badge tone={state.tone}>{state.label}</Badge></td>
                    <td className="px-4 py-3">{shipment.shippingCost === null ? "حسب فاتورة الناقل" : formatMoney(shipment.shippingCost)}{shipment.billingReference ? <span className="mt-1 block text-[10px] text-ink-400">مرجع: {shipment.billingReference}</span> : null}</td>
                    <td className="px-4 py-3">{new Date(shipment.createdAt).toLocaleDateString("ar-SA")}</td>
                    <td className="px-4 py-3">{shipment.labelUrl ? <a href={shipment.labelUrl} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">فتح / طباعة</a> : "غير متاحة"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="card grid place-items-center px-5 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Icon name="truck" className="h-7 w-7" /></span>
          <h3 className="mt-4 text-sm font-extrabold text-ink-900">لا توجد بوليصات في الأرشيف</h3>
          <p className="mt-2 max-w-md text-xs leading-6 text-ink-500">بعد توفير وثائق API وربط شركة الشحن رسمياً ستُسجل البوليصات وتفاصيل الفوترة هنا.</p>
        </section>
      )}
    </div>
  );
}
