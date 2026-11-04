"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { Icon } from "@/components/icons";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "تعذر إنشاء الحساب");
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="الاسم الكامل" required>
        <Input
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="مثال: سعد المطيري"
          required
          minLength={3}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="البريد الإلكتروني" required>
          <Input
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="you@dhibhati.sa"
            required
          />
        </Field>
        <Field label="رقم الجوال">
          <Input
            dir="ltr"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="05xxxxxxxx"
          />
        </Field>
      </div>
      <Field label="كلمة المرور" hint="٨ أحرف على الأقل وتشمل حرفاً ورقماً" required>
        <Input
          type="password"
          dir="ltr"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          placeholder="••••••"
          required
          minLength={8}
        />
      </Field>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
          <Icon name="close" className="h-4 w-4" strokeWidth={2.4} />
          {error}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب الموظف"}
      </Button>
    </form>
  );
}
