import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Friendly short link for staff/owner sign-in. */
export default function StaffEntryPage() {
  redirect("/customer/login?role=staff");
}
