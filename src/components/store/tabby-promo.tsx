"use client";

import { useEffect, useId } from "react";

declare global {
  interface Window {
    TabbyPromo?: new (options: {
      selector: string;
      currency: "SAR";
      price: string;
      lang: "ar";
      source: "product" | "cart";
      publicKey: string;
      merchantCode: string;
    }) => unknown;
  }
}

export function TabbyPromo({
  price,
  source,
  publicKey,
  merchantCode,
}: {
  price: number;
  source: "product" | "cart";
  publicKey: string;
  merchantCode: string;
}) {
  const instanceId = useId().replace(/:/g, "");

  useEffect(() => {
    const scriptUrl = "https://checkout.tabby.ai/tabby-promo.js";
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    const initialize = () => {
      if (!window.TabbyPromo) return;
      document.getElementById(instanceId)?.replaceChildren();
      new window.TabbyPromo({
        selector: `#${instanceId}`,
        currency: "SAR",
        price: price.toFixed(2),
        lang: "ar",
        source,
        publicKey,
        merchantCode,
      });
    };
    if (window.TabbyPromo) {
      initialize();
      return;
    }
    const script = existingScript ?? document.createElement("script");
    const handleLoad = () => initialize();
    script.addEventListener("load", handleLoad);
    if (!existingScript) {
      script.src = scriptUrl;
      script.async = true;
      document.body.appendChild(script);
    }
    return () => script.removeEventListener("load", handleLoad);
  }, [instanceId, merchantCode, price, publicKey, source]);

  return <div id={instanceId} className="mt-3 min-h-12" />;
}
