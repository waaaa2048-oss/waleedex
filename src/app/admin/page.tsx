import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminEntryPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/customer/login?role=staff");
}
