"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Moyasar?: {
      init: (options: {
        element: string;
        amount: number;
        currency: "SAR";
        description: string;
        publishable_api_key: string;
        callback_url: string;
        metadata: { order_id: string };
        methods: ("applepay" | "creditcard")[];
        supported_networks: ("mada" | "visa" | "mastercard")[];
        apple_pay: {
          country: "SA";
          label: string;
          validate_merchant_url: string;
        };
      }) => void;
    };
  }
}

const CSS_URL = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
const SCRIPT_URL = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";

export function MoyasarPaymentForm({
  orderId,
  orderCode,
  amount,
  publishableKey,
  appUrl,
  storeName,
}: {
  orderId: number;
  orderCode: string;
  amount: number;
  publishableKey: string;
  appUrl: string;
  storeName: string;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const callbackUrl = new URL("/checkout/moyasar", appUrl);
    callbackUrl.searchParams.set("orderId", String(orderId));
    const element = document.querySelector(".mysr-form");
    element?.replaceChildren();

    const stylesheet = document.querySelector<HTMLLinkElement>(`link[href="${CSS_URL}"]`) ?? document.createElement("link");
    if (!stylesheet.parentNode) {
      stylesheet.rel = "stylesheet";
      stylesheet.href = CSS_URL;
      document.head.appendChild(stylesheet);
    }

    const initialize = () => {
      if (cancelled || !window.Moyasar) {
        if (!cancelled) setError("تعذر تحميل نموذج الدفع من ميسر. أعد تحميل الصفحة أو تواصل مع المتجر.");
        return;
      }
      try {
        element?.replaceChildren();
        window.Moyasar.init({
          element: ".mysr-form",
          amount: Math.round(amount * 100),
          currency: "SAR",
          description: `Store order ${orderCode}`,
          publishable_api_key: publishableKey,
          callback_url: callbackUrl.toString(),
          metadata: { order_id: String(orderId) },
          methods: ["applepay", "creditcard"],
          supported_networks: ["mada", "visa", "mastercard"],
          apple_pay: {
            country: "SA",
            label: storeName,
            validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
          },
        });
      } catch (initializationError) {
        console.error("[moyasar-form]", initializationError);
        setError("تعذر تجهيز نموذج الدفع من ميسر.");
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (window.Moyasar) {
      initialize();
    } else if (existingScript) {
      existingScript.addEventListener("load", initialize, { once: true });
      existingScript.addEventListener("error", initialize, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = initialize;
      script.onerror = initialize;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      existingScript?.removeEventListener("load", initialize);
      existingScript?.removeEventListener("error", initialize);
    };
  }, [amount, appUrl, orderCode, orderId, publishableKey, storeName]);

  return (
    <div className="space-y-3">
      {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
      <div className="mysr-form" />
      <p className="text-center text-[11px] leading-5 text-[#756858]">
        أكمل الدفع في النموذج الآمن. لن يُؤكد الطلب إلا بعد التحقق من العملية لدى ميسر.
      </p>
    </div>
  );
}
