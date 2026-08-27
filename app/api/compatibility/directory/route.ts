import { PartCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { searchCompatibilityDirectory } from "@/lib/services/compatibility/compatibility-directory.service";

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
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "30", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 30;

    if (query.length < 2) {
      return NextResponse.json({ success: true, query, results: [] });
    }

    const results = await searchCompatibilityDirectory(query, {
      category: PartCategory.SCREEN,
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

