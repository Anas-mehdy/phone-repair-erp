import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { searchCompatibilityDirectory } from "@/lib/services/compatibility/compatibility-directory.service";
import { isCompatibilityDatasetKey } from "@/lib/services/compatibility/compatibility-datasets";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول لاستخدام دليل التوافقات." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const requestedDataset = (searchParams.get("dataset") || searchParams.get("category") || "SCREEN").toUpperCase();
    const dataset = isCompatibilityDatasetKey(requestedDataset) ? requestedDataset : "SCREEN";
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "30", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 30;

    if (query.length < 2) {
      return NextResponse.json({ success: true, query, results: [] });
    }

    const results = await searchCompatibilityDirectory(query, {
      shopId: session.shopId,
      dataset,
      limit,
    });
    return NextResponse.json({ success: true, query, results });
  } catch (error) {
    console.error("Compatibility directory API error:", error);
    return NextResponse.json(
      { success: false, error: "تعذر البحث في دليل التوافقات حالياً." },
      { status: 500 }
    );
  }
}
