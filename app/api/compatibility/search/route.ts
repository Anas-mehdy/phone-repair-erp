import { NextRequest, NextResponse } from "next/server";
import { compatibilitySearchService } from "@/lib/services/compatibility/compatibility-search.service";
import { PartCategory, CompatibilityStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const categoryParam = searchParams.get("category");
    const brand = searchParams.get("brand") || undefined;
    const networkVariant = searchParams.get("networkVariant") || undefined;
    const statusParam = searchParams.get("status");
    const includeIncompatible = searchParams.get("includeIncompatible") === "true";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let category: PartCategory | undefined;
    if (categoryParam && Object.values(PartCategory).includes(categoryParam as PartCategory)) {
      category = categoryParam as PartCategory;
    }

    let status: CompatibilityStatus | undefined;
    if (statusParam && Object.values(CompatibilityStatus).includes(statusParam as CompatibilityStatus)) {
      status = statusParam as CompatibilityStatus;
    }

    const response = await compatibilitySearchService.searchCompatibilities({
      query,
      category,
      brand,
      networkVariant,
      status,
      includeIncompatible,
      includeArchived,
      page,
      limit,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Compatibility search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute compatibility search.",
      },
      { status: 500 }
    );
  }
}
