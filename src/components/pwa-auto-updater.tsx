"use client";

import { useEffect } from "react";

export function PwaAutoUpdater() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.location.protocol !== "https:") return;

    let registration: ServiceWorkerRegistration | null = null;
    let updateInterval = 0;
    let hadController = Boolean(navigator.serviceWorker.controller);
    let reloadQueued = false;

    const checkForUpdates = () => {
      if (!registration) return;
      void registration.update().then(() => {
        if (registration?.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }).catch(() => undefined);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdates();
    };
    const onControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (reloadQueued) return;
      reloadQueued = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((result) => {
      registration = result;
      if (result.waiting && navigator.serviceWorker.controller) {
        result.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      checkForUpdates();
      updateInterval = window.setInterval(checkForUpdates, 60 * 60 * 1000);
    }).catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(updateInterval);
    };
  }, []);

  return null;
}