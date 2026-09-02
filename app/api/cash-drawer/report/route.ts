import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentShopContext } from "@/lib/current-shop";
import { prisma } from "@/lib/prisma";
import { cashDrawerService } from "@/lib/services/cashDrawerService";
import { financialTransferService } from "@/lib/services/financialTransferService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getCurrentShopContext();
    const startRaw = request.nextUrl.searchParams.get("start");
    const endRaw = request.nextUrl.searchParams.get("end");
    const start = startRaw ? new Date(startRaw) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endRaw ? new Date(endRaw) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return NextResponse.json({ error: "الفترة غير صحيحة." }, { status: 400 });

    const wallets = await financialTransferService.listWallets(context.shopId);
    const [drawer, walletPeriod] = await Promise.all([
      cashDrawerService.getReportSnapshot(context.shopId, start, end),
      prisma.$queryRaw<Array<{ inflow: Prisma.Decimal; outflow: Prisma.Decimal }>>`
        SELECT
          COALESCE(SUM("walletAmount") FILTER (WHERE "status" = 'ACTIVE' AND "operationType" IN ('CUSTOMER_WITHDRAWAL','WALLET_TOPUP')), 0) AS "inflow",
          COALESCE(SUM("walletAmount") FILTER (WHERE "status" = 'ACTIVE' AND "operationType" IN ('CUSTOMER_DEPOSIT','WALLET_WITHDRAWAL')), 0) AS "outflow"
        FROM "FinancialTransfer"
        WHERE "shopId" = ${context.shopId}::uuid AND "deletedAt" IS NULL
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
      `,
    ]);
    const walletBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.currentBalance), 0);
    const walletInflow = Number(walletPeriod[0]?.inflow ?? 0);
    const walletOutflow = Number(walletPeriod[0]?.outflow ?? 0);

    return NextResponse.json({
      ...drawer,
      walletBalance,
      totalLiquidFunds: drawer.currentBalance + walletBalance,
      walletInflow,
      walletOutflow,
      walletNetMovement: walletInflow - walletOutflow,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تحميل تقرير السيولة." }, { status: 500 });
  }
}
