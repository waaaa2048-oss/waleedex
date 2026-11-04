"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog, Field, Input, Modal, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { Icon } from "@/components/icons";
import { ORDER_STATUSES, PAYMENT_METHODS, formatMoney, statusMeta, type OrderStatus } from "@/lib/format";
import type { OrderDTO } from "@/lib/types";

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  new: { status: "confirmed", label: "تأكيد الطلب" },
  confirmed: { status: "preparing", label: "بدء التجهيز" },
  preparing: { status: "cooking", label: "إرسال للمطبخ" },
  cooking: { status: "ready", label: "جاهز للتسليم" },
  ready: { status: "delivered", label: "تم التسليم" },
};

export function OrderActions({ order }: { order: OrderDTO }) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paidAmount, setPaidAmount] = useState(order.paidAmount);
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod);
  const [pending, setPending] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const next = NEXT_STATUS[status];

  async function patchOrder(payload: Record<string, unknown>, message: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { order?: OrderDTO; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error ?? "تعذر تحديث الطلب");
      setStatus(data.order.status);
      setPaidAmount(data.order.paidAmount);
      setPaymentMethod(data.order.paymentMethod);
      toast(message);
      router.refresh();
      return data.order;
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر تحديث الطلب", "error");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function handleStatus(value: OrderStatus) {
    setStatus(value);
    await patchOrder({ status: value }, `${order.code}: ${statusMeta(value).label}`);
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("تعذر حذف الطلب");
      toast("تم حذف الطلب");
      router.replace("/dashboard/orders");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حذف الطلب", "error");
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {order.hasPaymentReceipt ? (
          <a
            href={`/api/orders/${order.id}/receipt`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            <Icon name="wallet" className="h-4 w-4" />
            عرض إيصال التحويل
          </a>
        ) : null}
        {next ? (
          <Button size="sm" icon="check" loading={pending} onClick={() => handleStatus(next.status)}>
            {next.label}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          icon="wallet"
          onClick={() => setPaymentOpen(true)}
          disabled={pending}
        >
          تسجيل دفعة
        </Button>
        <Select
          value={status}
          onChange={(event) => handleStatus(event.target.value as OrderStatus)}
          className="h-9 w-36 !py-0 text-xs font-bold"
          disabled={pending}
        >
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusMeta(value).label}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="ghost"
          icon="trash"
          onClick={() => setDeleteOpen(true)}
          className="text-rose-600 hover:bg-rose-50"
          aria-label="حذف الطلب"
        />
      </div>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="تسجيل دفعة"
        description={`إجمالي الطلب ${formatMoney(order.totalAmount)} — المدفوع حالياً ${formatMoney(paidAmount)}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPaymentOpen(false)}>
              إلغاء
            </Button>
            <Button
              size="sm"
              icon="check"
              loading={pending}
              onClick={async () => {
                const result = await patchOrder(
                  { paidAmount: Math.min(Number(paidAmount) || 0, order.totalAmount), paymentMethod },
                  "تم تحديث حالة الدفع",
                );
                if (result) setPaymentOpen(false);
              }}
            >
              حفظ الدفعة
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="المبلغ المدفوع">
            <Input
              type="number"
              min={0}
              max={order.totalAmount}
              value={paidAmount}
              onChange={(event) => setPaidAmount(Number(event.target.value))}
              dir="ltr"
            />
          </Field>
          <Field label="طريقة الدفع">
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <button
            type="button"
            onClick={() => {
              setPaidAmount(order.totalAmount);
              setPaymentMethod("card");
            }}
            className="flex w-full items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            <span className="flex items-center gap-1.5">
              <Icon name="check" className="h-4 w-4" />
              تسجيل المبلغ كاملاً
            </span>
            <span>{formatMoney(order.totalAmount)}</span>
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title={`حذف الطلب ${order.code}؟`}
        description="سيتم حذف الطلب وبنوده نهائياً."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  );
}
