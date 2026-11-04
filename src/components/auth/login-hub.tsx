"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button, Field, Input } from "@/components/ui";
import { ToastProvider, useToast } from "@/components/toast";

export function LoginHub() {
  return (
    <ToastProvider>
      <OwnerLogin />
    </ToastProvider>
  );
}

function OwnerLogin() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const { toast } = useToast();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إرسال رمز التحقق OTP إلى رقم الجوال
  async function handleSendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!phone || phone.trim().length < 9) {
      setError("يرجى إدخال رقم جوال صحيح.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "تعذر إرسال رمز التحقق.");
        return;
      }

      toast("تم إرسال رمز التحقق بنجاح");
      setStep("otp");
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  // التحقق من رمز الـ OTP وتسجيل الدخول للوحة
  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!code || code.trim().length < 4) {
      setError("يرجى إدخال رمز التحقق المكون من 4 أرقام.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "رمز التحقق غير صحيح أو منتهي الصلاحية.");
        return;
      }

      toast("مرحباً بك في لوحة تحكم أهل الكرم");
      window.location.replace("/dashboard");
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  const queryError = errorCode
    ? errorCode === "credentials"
      ? "بيانات الجوال أو رمز التحقق غير صحيحة."
      : errorCode === "unauthorized"
        ? "هذا الرقم غير مسجل كمالك أو موظف."
        : "تعذر تسجيل الدخول، حاول مرة أخرى."
    : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5efe3] px-4 py-10 text-[#211c15]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(188,145,74,.16),transparent_28rem),radial-gradient(circle_at_85%_90%,rgba(23,67,51,.12),transparent_32rem)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#e8dcc7] bg-white shadow-[0_35px_90px_-50px_rgba(49,34,16,.55)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative flex min-h-60 flex-col justify-between overflow-hidden bg-[#173d30] p-7 text-white sm:p-10 lg:min-h-[560px]">
          <div className="pointer-events-none absolute -end-14 -top-16 h-64 w-64 rounded-full border-[30px] border-white/[.06]" />
          <div className="pointer-events-none absolute -bottom-28 -start-12 h-72 w-72 rounded-full border-[24px] border-[#d4aa5c]/10" />
          <Link href="/" className="relative inline-flex w-fit items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#e3c16e] ring-1 ring-white/15">
              <Icon name="fire" className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-base font-black">أهل الكرم</span>
              <span className="block text-[10px] text-white/65">للذبايح والضيافة</span>
            </span>
          </Link>
          <div className="relative mt-8">
            <p className="text-[10px] font-extrabold tracking-[.2em] text-[#e3c16e]">دخول آمن بالتحقق السريع</p>
            <h1 className="mt-3 max-w-md text-3xl leading-tight font-black sm:text-4xl">إدارة المتجر تبدأ من هنا</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
              تسجيل دخول آمن وسريع للمالك والموظفين عبر رمز التحقق (OTP) المباشر على الجوال.
            </p>
          </div>
          <p className="relative mt-10 text-[10px] font-semibold text-white/55">كرم الضيافة… من أول اختيار حتى آخر تفصيلة.</p>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-7">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4ecdc] text-[#173d30]">
              <Icon name="settings" className="h-5 w-5" />
            </span>
            <p className="mt-5 text-[10px] font-extrabold tracking-[.18em] text-[#a78342]">دخول آمن بـ OTP</p>
            <h2 className="mt-1 text-2xl font-black">
              {step === "phone" ? "دخول المالك والموظفين" : "تأكيد رمز التحقق"}
            </h2>
            <p className="mt-2 text-xs leading-6 text-[#807567]">
              {step === "phone"
                ? "أدخل رقم الجوال المسجل بحسابك الإداري ليصلك رمز التحقق."
                : `تم إرسال رمز التحقق إلى الرقم (${phone}).`}
            </p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Field label="رقم الجوال" required>
                <Input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="05xxxxxxxx"
                  autoComplete="tel"
                  required
                />
              </Field>

              {error || queryError ? (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700">
                  {error ?? queryError}
                </p>
              ) : null}

              <Button type="submit" className="h-12 w-full rounded-xl text-sm" loading={loading}>
                إرسال رمز التحقق
                {!loading ? <Icon name="arrowLeft" className="h-4 w-4" /> : null}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Field label="رمز التحقق (OTP)" required>
                <Input
                  type="text"
                  dir="ltr"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="••••"
                  className="text-center text-lg font-bold tracking-[0.3em]"
                  required
                />
              </Field>

              {error ? (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="h-12 w-full rounded-xl text-sm" loading={loading}>
                دخول لوحة التحكم
                {!loading ? <Icon name="arrowLeft" className="h-4 w-4" /> : null}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
                className="w-full text-center text-xs font-bold text-[#a78342] hover:underline"
              >
                تغيير رقم الجوال
              </button>
            </form>
          )}

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#f8f4ed] p-3 text-[10px] leading-5 text-[#756858]">
            <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#98713a]" />
            يدخل المالك والموظفون برقم الجوال المعتمد في الحساب الإداري، وتُحدد صلاحيات اللوحة حسب دور كل حساب.
          </div>
          <Link href="/" className="mt-6 inline-flex items-center justify-center gap-2 text-[11px] font-bold text-[#173d30] hover:text-[#a78342]">
            العودة إلى واجهة المتجر <Icon name="arrowLeft" className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </main>
  );
}