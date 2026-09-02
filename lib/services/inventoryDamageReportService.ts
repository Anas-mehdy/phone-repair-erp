import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getInventoryDamageReportSummary(shopId: string, start: Date, end: Date) {
  const rows = await prisma.$queryRaw<Array<{ totalValue: Prisma.Decimal | number | string; movementCount: bigint | number }>>`
    SELECT COALESCE(SUM("quantity" * COALESCE("unitCostSnapshot", 0)), 0) AS "totalValue", COUNT(*) AS "movementCount"
    FROM "InventoryDamage"
    WHERE "shopId" = ${shopId}::uuid AND "createdAt" >= ${start} AND "createdAt" < ${end}
  `;
  return { totalValue: Number(rows[0]?.totalValue ?? 0), movementCount: Number(rows[0]?.movementCount ?? 0) };
}
