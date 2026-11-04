import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrderById } from "@/lib/data";
import { confirmMoyasarPayment } from "@/lib/moyasar";
import { MoyasarReturnView } from "@/components/store/moyasar-return-view";

export const dynamic = "force-dynamic";

export default async function MoyasarReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; id?: string; status?: string; message?: string }>;
}) {
  const [{ orderId, id: paymentId, status: callbackStatus }, customer] = await Promise.all([
    searchParams,
    getCurrentCustomer(),
  ]);
  if (!customer) redirect("/customer/login?next=/checkout");
  const parsedOrderId = Number(orderId);
  const order = Number.isInteger(parsedOrderId) && parsedOrderId > 0
    ? await getOrderById(parsedOrderId)
    : null;
  if (!order || order.customerId !== customer.id || order.paymentMethod !== "moyasar") redirect("/checkout");

  let paid = false;
  let paymentStatus: string | null = callbackStatus ?? null;
  let verificationError: string | null = null;
  if (paymentId) {
    try {
      const result = await confirmMoyasarPayment(paymentId, order.id, customer.id);
      paid = result.found && result.paid;
      paymentStatus = result.found ? result.status : paymentStatus;
    } catch (error) {
      console.error("[moyasar-return]", error);
      verificationError = "تعذر التحقق من الدفع الآن. لا تحاول الدفع مرة أخرى؛ سيتحقق المتجر من العملية.";
    }
  }

  return (
    <MoyasarReturnView
      paid={paid}
      status={paymentStatus}
      error={verificationError}
      orderCode={order.code}
      totalAmount={order.totalAmount}
    />
  );
}
