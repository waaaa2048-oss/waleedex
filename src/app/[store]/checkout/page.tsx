import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { CheckoutFlow } from "@/components/store/checkout-flow";
import { ensureSeeded } from "@/db/seed";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { getStoreSettings } from "@/lib/admin-data";
import { getGlobalPaymentMethods } from "@/lib/payment-methods";
import { getPaymentCredentialStatus } from "@/lib/payment-credentials";
import { prisma } from "@/lib/prisma";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StoreCheckoutPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store: storeSlug } = await params;
  await ensureSeeded();

  const [store] = await db.select().from(stores).where(eq(stores.slug, storeSlug.toLowerCase())).limit(1);
  if (!store || store.status !== "PUBLISHED") notFound();

  const cookieStore = await cookies();
  const phone = cookieStore.get("user_phone")?.value;
  if (!phone) {
    redirect(`/${store.slug}/customer/login?next=/${store.slug}/checkout`);
  }

  const customer = await prisma.customers.findFirst({ where: { phone } });
  if (!customer) {
    redirect(`/${store.slug}/customer/login?next=/${store.slug}/checkout`);
  }

  const [settings, methods, credentialStatus] = await Promise.all([
    getStoreSettings(store.id),
    getGlobalPaymentMethods(),
    getPaymentCredentialStatus(),
  ]);
  const validIban = /^SA\d{22}$/.test(settings.bankIban.replace(/\s/g, "").toUpperCase());
  const paymentOptions = [];
  if (methods.codEnabled) paymentOptions.push({ value: "cash", label: "الدفع عند الاستلام" });
  if (methods.bankTransferEnabled && validIban) paymentOptions.push({ value: "transfer", label: "تحويل بنكي" });
  if (methods.moyasarEnabled && credentialStatus.moyasar) paymentOptions.push({ value: "moyasar", label: "بطاقة مدى / ابل باي (ميسر)" });
  if (methods.tabbyEnabled && credentialStatus.tabby) paymentOptions.push({ value: "tabby", label: "قسمها على 4 دفعات مع تابي" });
  if (methods.tamaraEnabled && credentialStatus.tamara) paymentOptions.push({ value: "tamara", label: "قسمها على 4 دفعات مع تمارا" });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <CheckoutFlow
        customer={customer}
        paymentOptions={paymentOptions}
        tabbyConfig={null}
        bankInfo={{
          name: settings.bankName || "",
          accountName: settings.bankAccountName || "",
          iban: settings.bankIban || "",
          whatsapp: settings.whatsapp || settings.phone || "",
        }}
        paymentSetupMessage={null}
        moyasarConfig={null}
        storeId={store.id}
        storeSlug={store.slug}
        storeType={store.storeType}
      />
    </main>
  );
}
