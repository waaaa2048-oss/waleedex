import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentMethods, storeSettings } from "@/db/schema";

export type GlobalPaymentMethods = Pick<
  typeof paymentMethods.$inferSelect,
  "codEnabled" | "bankTransferEnabled" | "moyasarEnabled" | "tabbyEnabled" | "tamaraEnabled"
>;

const DEFAULT_PAYMENT_METHODS: GlobalPaymentMethods = {
  codEnabled: false,
  bankTransferEnabled: true,
  moyasarEnabled: false,
  tabbyEnabled: false,
  tamaraEnabled: false,
};

export async function getGlobalPaymentMethods(): Promise<GlobalPaymentMethods> {
  const [existing] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, 1)).limit(1);
  if (existing) return existing;

  await db.insert(paymentMethods).values({ id: 1, ...DEFAULT_PAYMENT_METHODS }).onConflictDoNothing();
  const [created] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, 1)).limit(1);
  if (!created) throw new Error("تعذر تهيئة إعدادات الدفع العامة");
  return created;
}

export async function saveGlobalPaymentMethods(methods: GlobalPaymentMethods): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(paymentMethods)
      .values({ id: 1, ...methods, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: paymentMethods.id,
        set: { ...methods, updatedAt: new Date() },
      });

    await tx.update(storeSettings).set({ ...methods, updatedAt: new Date() });
  });
}
