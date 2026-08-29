import { CompatibilityStatus, PartCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  AuthenticationError,
  AuthorizationError,
  getAuthContext,
} from "@/lib/auth/context";
import { compatibilitySearchService } from "@/lib/services/compatibility/compatibility-search.service";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";

export const dynamic = "force-dynamic";

function subscriptionExpiredResponse(message: string) {
  return NextResponse.json(
    {
      success: false,
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message,
      upgradeUrl: "/support",
    },
    { status: 403 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext({ allowRedirect: false });

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
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

    // The comprehensive plan has unlimited compatibility searches. A real search
    // is still blocked when the subscription is no longer operationally active.
    if (query) {
      const entitlement = await entitlementService.checkCanPerformCompatibilitySearch(
        auth.shop.id,
      );

      if (!entitlement.allowed) {
        return subscriptionExpiredResponse(entitlement.message);
      }
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
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          success: false,
          error: "يرجى تسجيل الدخول أولاً لاستخدام دليل التوافقات.",
        },
        { status: 401 },
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 403 },
      );
    }

    console.error("Compatibility search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "تعذر تنفيذ بحث التوافقات حالياً. حاول مرة أخرى.",
      },
      { status: 500 },
    );
  }
}
