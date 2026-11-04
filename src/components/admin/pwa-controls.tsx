"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import type { AppDownloadSettings } from "@/lib/store-defaults";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PWAControls({
  compact = false,
  settings,
}: {
  compact?: boolean;
  settings?: Pick<AppDownloadSettings, "showInstallButton" | "showUpdateButton" | "showControlsDescription" | "installButtonText" | "updateButtonText" | "updateReadyText" | "controlsDescription">;
}) {
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onInstall);

    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" })
        .then((reg) => {
          setRegistration(reg);
          if (reg.waiting) setUpdateReady(true);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
            });
          });
          void reg.update().catch(() => undefined);
        })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      toast("من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».", "info");
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") toast("تم تثبيت تطبيق أهل الكرم");
    setInstallPrompt(null);
  }

  async function checkUpdates() {
    setChecking(true);
    try {
      const reg = registration ?? ("serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/") : undefined);
      if (!reg) {
        toast("ثبّت التطبيق من قائمة المتصفح أولاً لتفعيل التحديثات.", "info");
        return;
      }
      await reg.update();
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
        setUpdateReady(false);
        toast("جاري تطبيق أحدث نسخة...");
      } else {
        toast("تطبيقك على أحدث نسخة");
      }
    } catch {
      toast("تعذر التحقق من التحديث. تحقق من اتصال الإنترنت.", "error");
    } finally {
      setChecking(false);
    }
  }

  const showInstallButton = settings?.showInstallButton ?? true;
  const showUpdateButton = settings?.showUpdateButton ?? true;
  const showControlsDescription = settings?.showControlsDescription ?? true;

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-2 sm:grid-cols-2"}>
      {showInstallButton ? (
        <Button size={compact ? "sm" : "md"} icon="box" onClick={install}>
          {settings?.installButtonText ?? "تثبيت التطبيق على الجهاز"}
        </Button>
      ) : null}
      {showUpdateButton ? (
        <Button size={compact ? "sm" : "md"} variant={updateReady ? "subtle" : "secondary"} icon="reports" onClick={checkUpdates} loading={checking}>
          {updateReady ? settings?.updateReadyText ?? "تحديث متاح — طبّق الآن" : settings?.updateButtonText ?? "التحقق من وجود تحديثات"}
        </Button>
      ) : null}
      {!compact && showControlsDescription ? (
        <p className="text-[10px] leading-5 text-ink-400 sm:col-span-2">
          <Icon name="sparkles" className="me-1 inline h-3 w-3" />
          {settings?.controlsDescription ?? "التطبيق يُثبّت على الكمبيوتر أو الجوال كتطبيق ويب، والتحديثات تصل تلقائياً بعد النشر."}
        </p>
      ) : null}
    </div>
  );
}
