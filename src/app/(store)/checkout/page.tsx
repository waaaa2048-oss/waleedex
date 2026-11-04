import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const storeSlug = cookieStore.get("waleedex.last-store-slug")?.value;

  if (!storeSlug || !/^[a-z0-9-]+$/.test(storeSlug)) {
    redirect("/");
  }

  redirect(`/${storeSlug}/checkout`);
}
