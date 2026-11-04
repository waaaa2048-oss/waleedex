import { redirect } from "next/navigation";
import { TabbyReturnView } from "@/components/store/tabby-return-view";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrderById } from "@/lib/data";
import { confirmTabbyPayment } from "@/lib/tabby";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function TabbyReturnPage({
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
  if (!order || order.customerId !== customer.id) redirect("/checkout");
  const [payment] = await db
    .select({ paymentId: orders.tabbyPaymentId })
    .from(orders)
    .where(eq(orders.id, order.id))
    .limit(1);

  let paid = false;
  let verificationError: string | null = null;
  if (result === "success" && order.paymentMethod === "tabby") {
    try {
      const paymentId = payment?.paymentId;
      if (!paymentId) throw new Error("لم يتم العثور على جلسة الدفع المرتبطة بالطلب");
      const confirmation = await confirmTabbyPayment(paymentId);
      paid = confirmation.found && confirmation.paid;
    } catch (error) {
      console.error("[tabby-return]", error);
      verificationError = "تعذر تأكيد الدفع الآن. لا تعاود الدفع؛ سيتحقق المتجر من العملية تلقائياً.";
    }
  }

  return (
    <TabbyReturnView
      paid={paid}
      error={verificationError}
      orderCode={order.code}
      totalAmount={order.totalAmount}
      result={result}
    />
  );
}
