"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ThemeLoader({
  enabled,
  allPages,
  duration,
  background,
  image,
  logo,
  logoSize,
  skip,
  storeName,
  tagline,
}: {
  enabled: boolean;
  allPages: boolean;
  duration: number;
  background: string;
  image: string | null;
  logo: string | null;
  logoSize: number;
  skip: boolean;
  storeName: string;
  tagline: string;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const showOnPage = allPages || pathname === "/";

  useEffect(() => {
    let hideTimer: number | undefined;
    const startTimer = window.setTimeout(() => {
      if (!enabled || !showOnPage) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(false);
        return;
      }
      try {
        const alreadyShown = window.sessionStorage.getItem("store-loader-shown");
        if (alreadyShown && !allPages) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setVisible(false);
          return;
        }
      } catch {
        // Session storage may be unavailable; continue without persistence.
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      hideTimer = window.setTimeout(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(false);
        try {
          window.sessionStorage.setItem("store-loader-shown", "1");
        } catch {
          // Ignore storage restrictions; the loader still hides on schedule.
        }
      }, Math.max(1, duration) * 1000);
    }, 0);
    return () => {
      window.clearTimeout(startTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, [enabled, showOnPage, duration, allPages]);

  if (!enabled || !showOnPage || !visible) return null;

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center overflow-hidden" style={{ backgroundColor: background }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-25 blur-[2px]" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--store-primary)]/90 via-[var(--store-primary)]/75 to-[var(--store-ink)]/90" />
      <div className="absolute -top-24 -start-20 h-72 w-72 animate-pulse rounded-full bg-[var(--store-accent)]/25 blur-3xl" />
      <div className="absolute -bottom-24 -end-20 h-80 w-80 animate-pulse rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-4 px-5 text-center text-white">
        <div className="relative grid place-items-center">
          <span className="absolute h-32 w-32 animate-ping rounded-full border border-[var(--store-accent)]/30" />
          <span className="absolute h-24 w-24 animate-spin rounded-full border-2 border-transparent border-t-[var(--store-accent)]/90" />
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={storeName} style={{ width: Math.max(56, Math.min(240, logoSize)), height: Math.max(56, Math.min(240, logoSize)) }} className="relative rounded-3xl bg-white/95 object-contain p-2 shadow-2xl" />
          ) : (
            <span className="relative grid h-20 w-20 place-items-center rounded-3xl bg-white/95 text-4xl shadow-2xl">✦</span>
          )}
        </div>
        <div className="animate-rise">
          <p className="text-lg font-bold sm:text-2xl">{storeName}</p>
          <p className="mt-1 text-xs font-bold text-[var(--store-accent)]">{tagline}</p>
          <p className="mt-2 text-[11px] text-white/70">نجهّز لك تجربة المتجر…</p>
        </div>
        <div className="h-1 w-36 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full w-1/2 animate-[loader-progress_1.5s_ease-in-out_infinite] rounded-full bg-[var(--store-accent)]" />
        </div>
      </div>

      {skip ? (
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            try { window.sessionStorage.setItem("store-loader-shown", "1"); } catch { /* ignore */ }
          }}
          className="absolute bottom-8 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
        >
          تخطي
        </button>
      ) : null}
    </div>
  );
}
