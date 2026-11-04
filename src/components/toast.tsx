"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: Tone };

type ToastContextValue = {
  toast: (message: string, tone?: Tone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[120] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 sm:left-6 sm:translate-x-0">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "animate-pop pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ring-1",
              item.tone === "success" && "bg-ink-900 text-white ring-ink-900/20",
              item.tone === "error" && "bg-rose-700 text-white ring-rose-900/20",
              item.tone === "info" && "bg-white text-ink-800 ring-stone-200",
            )}
          >
            <span
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs",
                item.tone === "success" && "bg-emerald-400/20 text-emerald-300",
                item.tone === "error" && "bg-white/20 text-white",
                item.tone === "info" && "bg-brand-100 text-brand-700",
              )}
            >
              {item.tone === "error" ? "!" : "✓"}
            </span>
            <span className="flex-1 leading-6">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { toast: () => undefined } as ToastContextValue;
  }
  return context;
}

export function useMountTransition(delay = 0) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return mounted;
}
