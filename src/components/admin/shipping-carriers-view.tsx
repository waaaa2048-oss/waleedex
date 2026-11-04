"use client";

import { useState } from "react";
import { Badge, Button, Field, Input } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";

type Carrier = {
  id: number;
  key: string;
  name: string;
  apiBaseUrl: string | null;
  isEnabled: boolean;
  hasCredentials: boolean;
};

const EMPTY_CREDENTIALS = { apiKey: "", apiSecret: "", accountNumber: "", clientId: "" };

export function ShippingCarriersView({
  initial,
  credentialsEncryptionReady,
}: {
  initial: Carrier[];
  credentialsEncryptionReady: boolean;
}) {
  const { toast } = useToast();
  const [carriers, setCarriers] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [credentials, setCredentials] = useState(EMPTY_CREDENTIALS);
  const [saving, setSaving] = useState(false);
  const carrier = carriers.find((item) => item.id === selected) ?? null;

  function open(carrier: Carrier) {
    setSelected(carrier.id);
    setApiBaseUrl(carrier.apiBaseUrl ?? "");
    setCredentials(EMPTY_CREDENTIALS);
  }

  async function save() {
    if (!carrier) return;
    setSaving(true);
    try {
      const response = await fetch("/api/shipping/carriers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carrier.id, apiBaseUrl, ...credentials }),
      });
      const data = (await response.json()) as { carrier?: Carrier; error?: string };
      if (!response.ok || !data.carrier) throw new Error(data.error ?? "تعذر حفظ إعدادات الناقل");
      setCarriers((current) => current.map((item) => item.id === carrier.id ? data.carrier! : item));
      setSelected(null);
      toast("حُفظت الإعدادات. التفعيل ينتظر اعتماد موصل API الرسمي.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  }

  async function clearCredentials() {
    if (!carrier || !window.confirm(`حذف مفاتيح ${carrier.name} المشفرة؟`)) return;
    setSaving(true);
    try {
      const response = await fetch("/api/shipping/carriers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carrier.id, clearCredentials: true }),
      });
      const data = (await response.json()) as { carrier?: Carrier; error?: string };
      if (!response.ok || !data.carrier) throw new Error(data.error ?? "تعذر حذف المفاتيح");
      setCarriers((current) => current.map((item) => item.id === carrier.id ? data.carrier! : item));
      toast("حُذفت بيانات الاعتماد المشفرة");
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر حذف المفاتيح", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-4">
        <Icon name="truck" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <h2 className="text-sm font-extrabold text-amber-950">وضع التجهيز — لا يوجد إصدار مباشر بعد</h2>
          <p className="mt-1 text-xs leading-6 text-amber-900">
            تُحفظ إعدادات الناقل، لكن إنشاء البوليصات وإظهار خياراته للعميل متوقفان حتى تزويد وثائق API الرسمية واعتماد الموصل. الفوترة حسب اختيارك ستكون على حساب شركة الشحن مباشرة؛ لا توجد محفظة أو خصومات داخلية.
          </p>
        </div>
      </section>

      {!credentialsEncryptionReady ? (
        <section className="card p-4 text-xs leading-6 text-ink-600">
          لضمان حماية المفاتيح، أضف متغير الخادم <code dir="ltr" className="rounded bg-stone-100 px-1.5 py-0.5">SHIPPING_CREDENTIALS_KEY</code> بقيمة Base64 لمفتاح عشوائي بطول 32 بايت. لن تُقبل المفاتيح قبل ذلك.
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {carriers.map((item) => (
          <article key={item.id} className="card flex flex-col gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-ink-900">{item.name}</h3>
                <p className="mt-1 text-[10px] text-ink-400" dir="ltr">{item.key}</p>
              </div>
              <Badge tone={item.isEnabled ? "success" : "neutral"}>{item.isEnabled ? "مفعّل" : "غير مربوط"}</Badge>
            </div>
            <div className="min-h-10 text-[11px] text-ink-500">
              {item.hasCredentials ? "بيانات الاعتماد محفوظة ومشفرة." : "لم تتم إضافة بيانات الاعتماد."}
              <p className="mt-1 text-[10px] text-amber-700">واجهة API الرسمية غير مهيأة؛ الإصدار غير متاح.</p>
            </div>
            <Button variant="secondary" size="sm" icon="settings" className="mt-auto w-full" onClick={() => open(item)}>
              إعداد بيانات الربط
            </Button>
          </article>
        ))}
      </div>

      {carrier ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="shipping-carrier-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <h2 id="shipping-carrier-title" className="text-lg font-black text-ink-900">إعداد {carrier.name}</h2>
            <p className="mt-1 text-xs leading-6 text-ink-500">لا تلصق المفاتيح في أي مكان عام. تُشفّر عند الحفظ ولا يعيدها الخادم إلى المتصفح.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="رابط API الرسمي" hint="اتركه فارغاً إذا لم يصلك من الشركة">
                <Input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} dir="ltr" placeholder="https://api.carrier.example" />
              </Field>
              <Field label="رقم الحساب">
                <Input type="password" autoComplete="new-password" value={credentials.accountNumber} onChange={(event) => setCredentials({ ...credentials, accountNumber: event.target.value })} dir="ltr" placeholder={carrier.hasCredentials ? "مخزن — أدخل قيمة جديدة للتحديث" : "غير مطلوب قبل اعتماد API"} disabled={!credentialsEncryptionReady} />
              </Field>
              <Field label="Client ID">
                <Input type="password" autoComplete="new-password" value={credentials.clientId} onChange={(event) => setCredentials({ ...credentials, clientId: event.target.value })} dir="ltr" disabled={!credentialsEncryptionReady} />
              </Field>
              <Field label="API Key">
                <Input type="password" autoComplete="new-password" value={credentials.apiKey} onChange={(event) => setCredentials({ ...credentials, apiKey: event.target.value })} dir="ltr" disabled={!credentialsEncryptionReady} />
              </Field>
              <Field label="API Secret">
                <Input type="password" autoComplete="new-password" value={credentials.apiSecret} onChange={(event) => setCredentials({ ...credentials, apiSecret: event.target.value })} dir="ltr" disabled={!credentialsEncryptionReady} />
              </Field>
            </div>
            <p className="mt-4 rounded-xl bg-stone-50 p-3 text-[10px] leading-5 text-ink-500">
              لن نفعّل الشركة أو نظهرها في Checkout قبل اختبار الشحن والتتبع والإلغاء على بيئة الشركة الرسمية. تجنب إدخال مفاتيح حقيقية الآن ما دامت وثائق الربط غير متوفرة.
            </p>
            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <div>{carrier.hasCredentials ? <Button variant="danger" size="sm" onClick={clearCredentials} loading={saving}>حذف المفاتيح</Button> : null}</div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>إغلاق</Button>
                <Button size="sm" icon="check" onClick={save} loading={saving}>حفظ الإعدادات</Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
