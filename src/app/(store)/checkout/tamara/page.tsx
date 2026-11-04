import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { TamaraReturnView } from "@/components/store/tamara-return-view";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrderById } from "@/lib/data";
import { confirmTamaraPayment } from "@/lib/tamara";

export const dynamic = "force-dynamic";

export default async function TamaraReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; result?: string }>;
}) {
  const [{ orderId, result }, customer] = await Promise.all([searchParams, getCurrentCustomer()]);
  if (!customer) redirect("/customer/login?next=/checkout");
  const parsedOrderId = Number(orderId);
  const order = Number.isInteger(parsedOrderId) && parsedOrderId > 0
    ? await getOrderById(parsedOrderId)
    : null;
  if (!order || order.customerId !== customer.id || order.paymentMethod !== "tamara") redirect("/checkout");

  const [payment] = await db.select({ tamaraOrderId: orders.tamaraOrderId })
    .from(orders)
    .where(and(eq(orders.id, order.id), eq(orders.customerId, customer.id)))
    .limit(1);

  let paid = false;
  let status: string | null = null;
  let verificationError: string | null = null;
  if (result === "success") {
    if (!payment?.tamaraOrderId) {
      verificationError = "لم يتم العثور على جلسة الدفع المرتبطة بالطلب. سيتحقق المتجر من العملية تلقائياً.";
    } else {
      try {
        const confirmation = await confirmTamaraPayment(payment.tamaraOrderId);
        paid = confirmation.found && confirmation.paid;
        status = confirmation.found ? confirmation.status : null;
      } catch (error) {
        console.error("[tamara-return]", error);
        verificationError = "تعذر التحقق من حالة تمارا الآن. لا تعاود الدفع؛ سيتحقق المتجر من العملية تلقائياً.";
      }
    }
  }

  return (
    <TamaraReturnView
      paid={paid}
      status={status}
      error={verificationError}
      orderCode={order.code}
      totalAmount={order.totalAmount}
      result={result}
    />
  );
}
