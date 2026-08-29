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

const UPGRADE_URL = "/subscription";

function entitlementDeniedResponse(
  code: "SUBSCRIPTION_EXPIRED" | "COMPATIBILITY_SEARCH_LIMIT_REACHED",
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      allowed: false,
      code,
      message,
      upgradeUrl: UPGRADE_URL,
    },
    { status },
  );
}

export async function GET(request: NextRequest) {
  try {
    // Authentication and tenant resolution happen server-side. The browser never
    // supplies the shopId used for entitlement or usage decisions.
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

    // Opening the page or issuing an empty query must never consume daily usage.
    // Only a real search request that executes the search service is counted.
    if (query) {
      const entitlement = await entitlementService.getEntitlementContext(auth.shop.id);

      if (!entitlement.isOperationallyActive) {
        return entitlementDeniedResponse(
          "SUBSCRIPTION_EXPIRED",
          "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
          403,
        );
      }

      if (entitlement.subscription.effectivePlan === "BASIC") {
        // This single atomic database statement is the authoritative limit check.
        // A separate read-then-increment would allow concurrent requests to exceed 10.
        const newCount = await entitlementService.incrementCompatibilitySearchEnforced(
          auth.shop.id,
          10,
        );

        if (newCount === null) {
          return entitlementDeniedResponse(
            "COMPATIBILITY_SEARCH_LIMIT_REACHED",
            "استخدمت عمليات البحث العشر المتاحة اليوم. يمكنك المحاولة غداً أو الترقية للخطة الاحترافية.",
            429,
          );
        }
      } else {
        // Trial/Professional are unlimited, but recording real searches keeps the
        // read-only usage snapshot truthful without imposing a limit.
        await entitlementService.incrementCompatibilitySearch(auth.shop.id);
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
