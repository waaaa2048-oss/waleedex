import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { productInventoryMovements } from "@/db/schema";
import { permissionGuard, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await permissionGuard("products.read");
  if (denied) return denied;
  try {
    const movements = await db
      .select()
      .from(productInventoryMovements)
      .orderBy(desc(productInventoryMovements.createdAt), desc(productInventoryMovements.id))
      .limit(500);
    return NextResponse.json({
      movements: movements.map((movement) => ({
        ...movement,
        createdAt: movement.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return serverError(error, "تعذر تحميل سجل الكميات");
  }
}
