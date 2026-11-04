import type { Metadata } from "next";
import { LogsView } from "@/components/admin/logs-view";
import { getActivityLogs } from "@/lib/admin-data";

import { requirePermission } from "@/lib/require-permission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "سجل العمليات | أهل الكرم" };

export default async function LogsPage() {
  await requirePermission("reports.read");

  return <LogsView logs={await getActivityLogs()} />;
}
