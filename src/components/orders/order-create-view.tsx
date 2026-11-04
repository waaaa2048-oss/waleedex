"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrderForm, type OrderFormSubmit } from "@/components/orders/order-form";
import { useToast } from "@/components/toast";
import type { OrderCustomerOption } from "@/lib/data";
import type { OrderDTO, ProductDTO, ServiceDTO } from "@/lib/types";

export function OrderCreateView({
  customers,
  products,
  services,
  isSlaughterhouseStore,
}: {
  customers: OrderCustomerOption[];
  products: ProductDTO[];
  services: ServiceDTO[];
  isSlaughterhouseStore: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function createOrder(values: OrderFormSubmit) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { order?: OrderDTO; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error ?? "تعذر إنشاء الطلب");
      toast(`تم إنشاء الطلب ${data.order.code} بنجاح`);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر إنشاء الطلب", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink-900">إنشاء طلب جديد</h2>
          <p className="mt-1 text-xs text-ink-400">أدخل بيانات العميل واختر المنتجات المطلوبة.</p>
        </div>
        <Link href="/dashboard" className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink-600 ring-1 ring-stone-200 hover:bg-stone-50">
          العودة للوحة التحكم
        </Link>
      </div>
      <div className="card p-4 sm:p-6">
        {customers.length ? (
          <OrderForm
            customers={customers}
            products={products}
            services={services}
            isSlaughterhouseStore={isSlaughterhouseStore}
            submitting={submitting}
            onSubmit={createOrder}
            onCancel={() => router.push("/dashboard")}
          />
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm font-bold text-ink-800">لا يوجد عملاء لإسناد الطلب إليهم</p>
            <p className="mt-1 text-xs text-ink-400">تواصل مع المدير لإضافة بيانات العميل أو منحك صلاحية إدارة العملاء.</p>
          </div>
        )}
      </div>
    </div>
  );
}
