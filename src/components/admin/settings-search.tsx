"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/format";

type Section = { title: string; items: { label: string; href?: string; icon: IconName; note?: string }[] };

export function SettingsSearch({ sections }: { sections: Section[] }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => `${section.title} ${item.label}`.toLowerCase().includes(normalized)),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, normalized]);

  return (
    <div className="space-y-4">
      <div className="card p-3">
        <label className="field-label" htmlFor="settings-search">ابحث في الإعدادات</label>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            id="settings-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثال: الملف الشخصي، المتجر، الضرائب، المنتجات..."
            className="input h-11 pr-10 text-xs"
          />
          {query ? <button type="button" onClick={() => setQuery("")} className="absolute top-1/2 left-3 -translate-y-1/2 text-[10px] font-bold text-brand-700">مسح</button> : null}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((section) => (
            <section key={section.title} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                <h3 className="text-xs font-bold text-ink-900">{section.title}</h3>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-ink-500">{section.items.filter((item) => item.href).length} متاح</span>
              </div>
              <ul className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
                {section.items.map((item) => item.href ? (
                  <li key={item.label}>
                    <Link href={item.href} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-semibold text-ink-600 transition hover:bg-brand-50/60 hover:text-brand-800">
                      <Icon name={item.icon} className="h-3.5 w-3.5 text-ink-400" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <Icon name="chevronLeft" className="h-3 w-3 text-ink-300" />
                    </Link>
                  </li>
                ) : (
                  <li key={item.label} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-semibold text-ink-300">
                    <Icon name={item.icon} className="h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[8px] font-bold text-ink-400">{item.note ?? "قريباً"}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="card grid place-items-center p-10 text-center">
          <span className="text-2xl">🔎</span>
          <p className="mt-2 text-sm font-bold text-ink-800">ما لقينا الإعداد</p>
          <p className="mt-1 text-[11px] text-ink-400">جرّب كلمة مختلفة مثل «الشحن» أو «الحساب».</p>
        </div>
      )}
      {normalized ? <p className="text-center text-[10px] text-ink-400">نتائج البحث عن: {query}</p> : null}
    </div>
  );
}
