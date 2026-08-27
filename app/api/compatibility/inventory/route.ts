import { NextRequest, NextResponse } from "next/server";
import { smartInventoryMatcherService } from "@/lib/services/compatibility/inventory-matcher.service";
import { DeviceNotFoundError } from "@/lib/services/compatibility/compatibility.errors";
import { PartCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const shopId = searchParams.get("shopId") || undefined;
    const categoryParam = searchParams.get("category");
    const includeOutOfStock = searchParams.get("includeOutOfStock") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

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
      shopId,
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


