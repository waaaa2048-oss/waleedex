import { NextResponse } from "next/server";
import { guard, permissionGuard, serverError } from "@/lib/api";
import { getActivityLogs } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await permissionGuard("reports.read");
  if (denied) return denied;
  try {
    return NextResponse.json({ logs: await getActivityLogs() });
  } catch (error) {
    return serverError(error);
  }
}
