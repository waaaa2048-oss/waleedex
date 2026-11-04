"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn, formatDateTime } from "@/lib/format";
import type { ActivityLogDTO } from "@/lib/admin-data";

export function LogsView({ logs }: { logs: ActivityLogDTO[] }) {
  const [entity, setEntity] = useState("all");
  const [query, setQuery] = useState("");

  const entities = useMemo(() => Array.from(new Set(logs.map((log) => log.entity))), [logs]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (entity !== "all" && log.entity !== entity) return false;
      if (!term) return true;
      return (
        log.action.toLowerCase().includes(term) ||
        log.actorName.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term)
      );
    });
  }, [logs, entity, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {["all", ...entities].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setEntity(item)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition",
                entity === item ? "bg-ink-900 text-white" : "bg-stone-100/80 text-ink-500 hover:bg-stone-100",
              )}
            >
              {item === "all" ? "كل السجلات" : item}
            </button>
          ))}
        </div>
        <div className="relative sm:w-56">
          <Icon name="search" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في السجلات..." className="input h-10 pr-9 text-xs" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState icon="reports" title="لا توجد سجلات" description="ستظهر هنا كل العمليات التي يقوم بها المالك والموظفون." />
        ) : (
          <ul className="divide-y divide-stone-100">
            {visible.map((log) => (
              <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name="clock" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink-900">{log.action}</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-ink-500">{log.details || "—"}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-ink-400">
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 font-semibold">{log.entity}</span>
                    <span>بواسطة {log.actorName}</span>
                    <span>· {formatDateTime(log.createdAt)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
