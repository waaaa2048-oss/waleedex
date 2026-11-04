import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/profile-form";
import { Badge } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الملف الشخصي | أهل الكرم" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone, role: user.role }} />
      <div className="card p-5">
        <h3 className="text-sm font-bold text-ink-900">حسابك</h3>
        <dl className="mt-4 space-y-3 text-xs">
          {[
            ["الاسم", user.name],
            ["البريد", user.email],
            ["الجوال", user.phone ?? "—"],
            ["الدور", user.role === "admin" ? "مالك المتجر" : "موظف"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b border-dashed border-stone-100 pb-2.5 last:border-0">
              <dt className="text-ink-400">{label}</dt>
              <dd className="font-bold text-ink-800">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <Badge tone={user.role === "admin" ? "brand" : "neutral"}>
            {user.role === "admin" ? "صلاحيات كاملة" : "صلاحيات محدودة"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
