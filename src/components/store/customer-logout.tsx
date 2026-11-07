"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerLogout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true);
        await fetch("/api/customer/logout", { method: "POST" }).catch(() => null);
        router.replace("/");
        router.refresh();
      }}
      disabled={loading}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[12px] font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25 disabled:opacity-60"
    >
      {loading ? "جاري الخروج..." : "تسجيل الخروج"}
    </button>
  );
}
