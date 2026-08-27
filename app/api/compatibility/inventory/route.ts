import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { smartInventoryMatcherService } from "@/lib/services/compatibility/inventory-matcher.service";
import { DeviceNotFoundError } from "@/lib/services/compatibility/compatibility.errors";
import { PartCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول لعرض توافقات المخزون." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const categoryParam = searchParams.get("category");
    const includeOutOfStock = searchParams.get("includeOutOfStock") === "true";
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "deviceId query parameter is required." },
        { status: 400 }
      );
    }

    let category: PartCategory | undefined;
    if (categoryParam && Object.values(PartCategory).includes(categoryParam as PartCategory)) {
      category = categoryParam as PartCategory;
    }

    const response = await smartInventoryMatcherService.getAvailableCompatibleParts(deviceId, {
      shopId: session.shopId,
      category,
      includeOutOfStock,
      limit,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Inventory Matcher API error:", error);
    if (error instanceof DeviceNotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to execute inventory compatibility matching." },
      { status: 500 }
    );
  }
}
