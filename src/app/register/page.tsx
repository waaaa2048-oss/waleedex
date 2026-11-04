import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Staff accounts are created by the store owner from Dashboard → Employees. */
export default function RegisterPage() {
  redirect("/customer/login?role=staff");
}
