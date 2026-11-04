"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/toast";
import type { StoreSettings } from "@/lib/store-defaults";
import type { PaymentCredentials } from "@/lib/payment-credentials";
import type { GlobalPaymentMethods } from "@/lib/payment-methods";

type CredentialStatus = {
  moyasar: boolean;
  tabby: boolean;
  tamara: boolean;
  encryptionKeyConfigured: boolean;
  schemaReady: boolean;
};

type CredentialField = keyof PaymentCredentials;

const CREDENTIAL_GROUPS: {
  title: string;
  provider: "moyasar" | "tabby" | "tamara";
  fields: { key: CredentialField; label: string }[];
}[] = [
  {
    title: "ميسر",
    provider: "moyasar",
    fields: [
      { key: "moyasarPublishableKey", label: "Publishable Key" },
      { key: "moyasarSecretKey", label: "Secret Key" },
    ],
  },
  {
    title: "تابي",
    provider: "tabby",
    fields: [
      { key: "tabbyPublicKey", label: "Public Key" },
      { key: "tabbySecretKey", label: "Secret Key" },
      { key: "tabbyMerchantCode", label: "Merchant Code" },
      { key: "tabbyWebhookSecret", label: "Webhook Secret" },
    ],
  },
  {
    title: "تمارا",
    provider: "tamara",
    fields: [
      { key: "tamaraToken", label: "API Token / Secret Key" },
      { key: "tamaraNotificationToken", label: "Notification Token" },
    ],
  },
];

function PaymentToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-3 text-xs font-semibold text-ink-700 ring-1 ring-stone-100">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-stone-300"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${checked ? "right-0.5" : "right-[18px]"}`} />
      </button>
    </div>
  );
}

export function PaymentsSettingsView({
  initialSettings,
  initialMethods,
  initialStatus,
  storeId = 1,
}: {
  initialSettings: StoreSettings;
  initialMethods: GlobalPaymentMethods;
  initialStatus: CredentialStatus;
  storeId?: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [methods, setMethods] = useState(initialMethods);
  const [status, setStatus] = useState(initialStatus);
  const [credentials, setCredentials] = useState<Partial<Record<CredentialField, string>>>({});
  const [savingMethods, setSavingMethods] = useState(false);
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);

  async function saveMethods() {
    setSavingMethods(true);
    try {
      const response = await fetch("/api/settings/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods }),
      });
      const result = (await response.json()) as { error?: string; methods?: GlobalPaymentMethods };
      if (!response.ok || !result.methods) throw new Error(result.error ?? "تعذر حفظ طرق الدفع");
      setMethods(result.methods);
      toast("تم تطبيق طرق الدفع على جميع المتاجر");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ طرق الدفع", "error");
    } finally {
      setSavingMethods(false);
    }
  }

  async function saveBankDetails() {
    setSavingBankDetails(true);
    try {
      const response = await fetch(`/api/settings?storeId=${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: settings.bankName,
          bankAccountName: settings.bankAccountName,
          bankIban: settings.bankIban,
          taxRate: settings.taxRate,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "تعذر حفظ إعدادات الدفع");
      toast("تم حفظ بيانات التحويل لهذا المتجر");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر الحفظ", "error");
    } finally {
      setSavingBankDetails(false);
    }
  }

  async function saveCredentials() {
    const updates = Object.fromEntries(
      Object.entries(credentials).filter(([, value]) => typeof value === "string" && value.trim()),
    );
    if (Object.keys(updates).length === 0) {
      toast("أدخل مفتاحاً واحداً على الأقل لحفظه", "error");
      return;
    }
    setSavingCredentials(true);
    try {
      const response = await fetch("/api/settings/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const result = (await response.json()) as { error?: string; status?: CredentialStatus };
      if (!response.ok || !result.status) throw new Error(result.error ?? "تعذر حفظ مفاتيح الدفع");
      setStatus(result.status);
      setCredentials({});
      toast("تم حفظ المفاتيح مشفّرة. لن تظهر قيمها مرة أخرى.");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ المفاتيح", "error");
    } finally {
      setSavingCredentials(false);
    }
  }

  function setCredential(key: CredentialField, value: string) {
    setCredentials((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-bold text-ink-900">طرق الدفع لجميع المتاجر</h2>
          <p className="mt-1 text-xs leading-6 text-ink-500">
            هذه هي الصفحة الوحيدة للتحكم بطرق الدفع. أي تغيير هنا يُطبّق على صفحة إتمام الطلب في كل المتاجر.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <PaymentToggle checked={methods.codEnabled} label="الدفع عند الاستلام" onChange={(value) => setMethods({ ...methods, codEnabled: value })} />
          <PaymentToggle checked={methods.bankTransferEnabled} label="التحويل البنكي" onChange={(value) => setMethods({ ...methods, bankTransferEnabled: value })} />
          <PaymentToggle checked={methods.moyasarEnabled} label="ميسر · مدى / Visa / Apple Pay" onChange={(value) => setMethods({ ...methods, moyasarEnabled: value })} />
          <PaymentToggle checked={methods.tabbyEnabled} label="تابي · تقسيط" onChange={(value) => setMethods({ ...methods, tabbyEnabled: value })} />
          <PaymentToggle checked={methods.tamaraEnabled} label="تمارا · تقسيط" onChange={(value) => setMethods({ ...methods, tamaraEnabled: value })} />
        </div>
        <div className="flex justify-end">
          <Button icon="check" loading={savingMethods} onClick={saveMethods}>حفظ طرق الدفع لكل المتاجر</Button>
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-bold text-ink-900">بيانات التحويل والضريبة لهذا المتجر</h2>
          <p className="mt-1 text-xs leading-6 text-ink-500">اختر المتجر من أعلى لوحة التحكم لإدارة بيانات حسابه البنكي. إتاحة التحويل نفسها تُدار من القسم العام أعلاه.</p>
        </div>
        <div className="grid gap-3 rounded-xl bg-stone-50 p-3 sm:grid-cols-3">
          <Field label="اسم البنك">
            <Input value={settings.bankName} onChange={(event) => setSettings({ ...settings, bankName: event.target.value })} placeholder="اسم البنك" />
          </Field>
          <Field label="اسم صاحب الحساب">
            <Input value={settings.bankAccountName} onChange={(event) => setSettings({ ...settings, bankAccountName: event.target.value })} placeholder="اسم صاحب الحساب" />
          </Field>
          <Field label="الآيبان" hint="آيبان سعودي صحيح يبدأ بـ SA ويتكون من 24 خانة">
            <Input value={settings.bankIban} onChange={(event) => setSettings({ ...settings, bankIban: event.target.value.replace(/\s/g, "").toUpperCase() })} dir="ltr" maxLength={24} placeholder="SA..." />
          </Field>
        </div>
        <Field label="ضريبة القيمة المضافة (%)" hint="أدخل النسبة المعتمدة من 0% إلى 100%">
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={settings.taxRate}
            onChange={(event) => setSettings({ ...settings, taxRate: Number(event.target.value) })}
          />
        </Field>
        {methods.bankTransferEnabled && !/^SA\d{22}$/.test(settings.bankIban.replace(/\s/g, "").toUpperCase()) ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            خيار التحويل البنكي لا يظهر لهذا المتجر حتى إدخال آيبان سعودي صالح.
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button icon="check" loading={savingBankDetails} onClick={saveBankDetails}>حفظ بيانات هذا المتجر</Button>
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-bold text-ink-900">مفاتيح بوابات الدفع</h2>
          <p className="mt-1 text-xs leading-6 text-ink-500">
            أدخل بيانات الشركات هنا. تُشفّر على الخادم ولا تُعرض أو تُرسل إلى المتصفح. اترك الحقل فارغاً للاحتفاظ بالمفتاح الحالي.
          </p>
        </div>
        {!status.schemaReady ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-6 text-rose-800">
            طبّق ترحيل قاعدة البيانات 0011_encrypted_payment_credentials.sql قبل تخزين المفاتيح.
          </p>
        ) : null}
        {!status.encryptionKeyConfigured ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-6 text-rose-800">
            قبل حفظ الأسرار، أضف متغير الخادم PAYMENT_CREDENTIALS_ENCRYPTION_KEY بقيمة عشوائية قوية من 32 حرفاً على الأقل إلى إعدادات الاستضافة، ثم أعد تشغيل/نشر التطبيق.
          </p>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-3">
          {CREDENTIAL_GROUPS.map((group) => (
            <div key={group.provider} className="space-y-3 rounded-2xl border border-stone-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-ink-900">{group.title}</h3>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status[group.provider] ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {status[group.provider] ? "المفاتيح مكتملة" : "بانتظار المفاتيح"}
                </span>
              </div>
              {group.fields.map((field) => (
                <Field key={field.key} label={field.label} hint="القيمة لا تُعرض بعد الحفظ">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={credentials[field.key] ?? ""}
                    onChange={(event) => setCredential(field.key, event.target.value)}
                    dir="ltr"
                    placeholder="أدخل قيمة جديدة أو اتركه فارغاً"
                  />
                </Field>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] leading-5 text-ink-400">تمارا تتطلب API Token وNotification Token للتحقق من إشعارات الدفع.</p>
          <Button icon="check" loading={savingCredentials} disabled={!status.encryptionKeyConfigured || !status.schemaReady} onClick={saveCredentials}>
            حفظ مفاتيح الشركات
          </Button>
        </div>
      </section>
    </div>
  );
}
