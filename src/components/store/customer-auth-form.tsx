"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Button, Field, Input } from "@/components/ui";

type AuthStep = "phone" | "otp" | "details";

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  return digits.length === 9 ? `0${digits}` : value;
}

export function CustomerAuthForm({
  initialMode,
  storeName,
  storeSlug = "",
}: {
  initialMode: "login" | "register";
  storeName: string;
  storeSlug?: string;
}) {
  const searchParams = useSearchParams();
  const storeBasePath = storeSlug ? `/${storeSlug}` : "";

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // إعادة التوجيه وتحديث الكوكي في المتصفح فوراً
  function redirectUser() {
    const requestedDestination = searchParams.get("next");
    const destination =
      requestedDestination === "/checkout" || /^\/[a-z0-9-]+\/checkout$/.test(requestedDestination ?? "")
        ? requestedDestination!
        : `${storeBasePath}/account`;
    window.location.href = destination;
  }

  // الخطوة الأولى: إرسال كود الواتساب
  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const formattedPhone = normalizePhone(phone);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "تعذر إرسال رمز التحقق");
      }

      setStep("otp");
      setSuccessMsg(`تم إرسال رمز التحقق إلى الواتساب للرقم: ${formattedPhone}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الإرسال");
    } finally {
      setSubmitting(false);
    }
  }

  // الخطوة الثانية: التأكد من كود الـ OTP
  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formattedPhone = normalizePhone(phone);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, code: otpCode.trim() }),
      });

      const data = (await response.json()) as { error?: string; isNewUser?: boolean };

      if (!response.ok) {
        throw new Error(data.error ?? "رمز التحقق غير صحيح");
      }

      if (data.isNewUser) {
        setStep("details");
        setSuccessMsg("أهلاً بك! يرجى إكمال بيانات حسابك الجديد");
      } else {
        redirectUser();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر التحقق من الرمز");
    } finally {
      setSubmitting(false);
    }
  }

  // الخطوة الثالثة: حفظ بيانات المستخدم الجديد
  async function handleRegisterDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formattedPhone = normalizePhone(phone);

    try {
      const response = await fetch("/api/auth/register-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: formattedPhone }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "تعذر حفظ البيانات");
      }

      redirectUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--store-line)] bg-white shadow-[0_28px_80px_-48px_rgba(60,39,18,.45)]">
        <div className="bg-[var(--store-primary)] p-6 text-white sm:p-8">
          <Link href={storeBasePath || "/"} className="text-xs font-bold text-white/75 transition hover:text-white">
            العودة للمتجر
          </Link>
          <p className="mt-7 text-[10px] font-extrabold tracking-[.18em] text-[var(--store-accent)]">
            يا مرحبا بضيوفنا
          </p>
          <h1 className="mt-2 text-2xl font-black">حساب {storeName}</h1>
          <p className="mt-2 text-xs leading-6 text-white/70">
            {step === "details"
              ? "أكمل بيانات حسابك الشخصي للاستمرار."
              : "أدخل رقم جوالك ليصلك رمز التحقق المباشر عبر الواتساب."}
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4 p-6 sm:p-8">
            <Field label="رقم الجوال" hint="سيصلك كود التحقق عبر الواتساب" required>
              <Input
                type="tel"
                inputMode="tel"
                dir="ltr"
                placeholder="05xxxxxxxx"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                required
              />
            </Field>

            {error ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="h-12 w-full rounded-xl text-sm" loading={submitting}>
              إرسال رمز التحقق عبر الواتساب
              {!submitting ? <Icon name="arrowLeft" className="h-4 w-4" /> : null}
            </Button>
          </form>
        ) : step === "otp" ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4 p-6 sm:p-8">
            {successMsg ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[11px] font-bold text-emerald-700">
                {successMsg}
              </p>
            ) : null}

            <Field label="رمز التحقق (OTP)" required>
              <Input
                type="text"
                dir="ltr"
                maxLength={6}
                placeholder="****"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                className="text-center text-lg tracking-widest"
                required
              />
            </Field>

            {error ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-1/3 rounded-xl text-xs"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                  setSuccessMsg(null);
                }}
              >
                تغيير الرقم
              </Button>
              <Button type="submit" className="h-12 w-2/3 rounded-xl text-sm" loading={submitting}>
                تأكيد الدخول
                {!submitting ? <Icon name="arrowLeft" className="h-4 w-4" /> : null}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterDetails} className="space-y-4 p-6 sm:p-8">
            {successMsg ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[11px] font-bold text-emerald-700">
                {successMsg}
              </p>
            ) : null}

            <Field label="رقم الجوال (تم التحقق)" required>
              <Input
                type="tel"
                dir="ltr"
                value={normalizePhone(phone)}
                disabled
                className="bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </Field>

            <Field label="الاسم الكامل" required>
              <Input
                type="text"
                placeholder="أدخل اسمك الكامل"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>

            <Field label="البريد الإلكتروني" required>
              <Input
                type="email"
                dir="ltr"
                placeholder="example@domain.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>

            {error ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="h-12 w-full rounded-xl text-sm" loading={submitting}>
              إتمام التسجيل والدخول
              {!submitting ? <Icon name="arrowLeft" className="h-4 w-4" /> : null}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}