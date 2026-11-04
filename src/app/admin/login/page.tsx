import { Suspense } from "react";
import { LoginHub } from "@/components/auth/login-hub";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  await ensureSeeded();
  return (
    <Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}>
      <LoginHub />
    </Suspense>
  );
}