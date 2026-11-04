import "server-only";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { getCurrentUser } from "./auth";

export async function logActivity(
  action: string,
  entity: string,
  entityId?: string | number | null,
  details = "",
): Promise<void> {
  try {
    const user = await getCurrentUser();
    await db.insert(activityLogs).values({
      actorName: user?.name ?? "النظام",
      action,
      entity,
      entityId: entityId === null || entityId === undefined ? null : String(entityId),
      details,
    });
  } catch (error) {
    console.error("[log]", error);
  }
}
