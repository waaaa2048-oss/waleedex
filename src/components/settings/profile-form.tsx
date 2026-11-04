"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/toast";

export function ProfileForm({
  user,
}: {
  user: { name: string; email: string; phone: string | null; role: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function updateProfile() {
    setSavingProfile(true);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر تحديث الملف");
      toast("تم تحديث بيانات الحساب");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر تحديث الملف", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function updatePassword() {
    if (!currentPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast("أدخل كلمة المرور الحالية وجديدة (٨ أحرف وتشمل حرفاً ورقماً)", "error");
      return;
    }
    setSavingPassword(true);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, currentPassword, newPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر تغيير كلمة المرور");
      toast("تم تغيير كلمة المرور");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر تغيير كلمة المرور", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-sm font-bold text-ink-900">بيانات الحساب</h3>
        <p className="mt-0.5 text-[11px] text-ink-400">تظهر هذه البيانات لفريق العمل في لوحة التحكم.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="رقم الجوال">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" placeholder="05xxxxxxxx" />
          </Field>
          <Field label="البريد الإلكتروني" hint="لا يمكن تعديل البريد من هنا">
            <Input value={user.email} readOnly dir="ltr" className="bg-stone-50 text-ink-400" />
          </Field>
          <Field label="الدور">
            <Input value={user.role === "admin" ? "مدير النظام" : "موظف"} readOnly className="bg-stone-50 text-ink-400" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" icon="check" onClick={updateProfile} loading={savingProfile}>
            حفظ البيانات
          </Button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-ink-900">تغيير كلمة المرور</h3>
        <p className="mt-0.5 text-[11px] text-ink-400">استخدم كلمة مرور قوية لحماية بيانات الطلبات.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="كلمة المرور الحالية">
            <Input
              type="password"
              dir="ltr"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="••••••"
            />
          </Field>
          <Field label="كلمة المرور الجديدة" hint="٨ أحرف وتشمل حرفاً ورقماً">
            <Input
              type="password"
              dir="ltr"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="••••••"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="dark" icon="settings" onClick={updatePassword} loading={savingPassword}>
            تحديث كلمة المرور
          </Button>
        </div>
      </div>
    </div>
  );
}
