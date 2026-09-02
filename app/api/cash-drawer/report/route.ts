import { NextRequest, NextResponse } from "next/server";
import { getCurrentShopContext } from "@/lib/current-shop";
import { cashDrawerService } from "@/lib/services/cashDrawerService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getCurrentShopContext();
    const startRaw = request.nextUrl.searchParams.get("start");
    const endRaw = request.nextUrl.searchParams.get("end");
    const start = startRaw ? new Date(startRaw) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endRaw ? new Date(endRaw) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: "الفترة غير صحيحة." }, { status: 400 });
    }
    const snapshot = await cashDrawerService.getReportSnapshot(context.shopId, start, end);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تحميل تقرير الدرج." }, { status: 500 });
  }
}
