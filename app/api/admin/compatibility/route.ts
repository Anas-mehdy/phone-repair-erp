import { NextRequest, NextResponse } from "next/server";
import { compatibilityService } from "@/lib/services/compatibility";
import { getCompatibilityGovernanceUser } from "@/lib/services/compatibility/admin-context";
import { CompatibilityStatus, PartCategory, VerificationLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCompatibilityGovernanceUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access to admin compatibility dashboard." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");
    const levelParam = searchParams.get("verificationLevel");
    const isArchivedParam = searchParams.get("isArchived");

    let status: CompatibilityStatus | undefined;
    if (statusParam && Object.values(CompatibilityStatus).includes(statusParam as CompatibilityStatus)) {
      status = statusParam as CompatibilityStatus;
    }

    let category: PartCategory | undefined;
    if (categoryParam && Object.values(PartCategory).includes(categoryParam as PartCategory)) {
      category = categoryParam as PartCategory;
    }

    let verificationLevel: VerificationLevel | undefined;
    if (levelParam && Object.values(VerificationLevel).includes(levelParam as VerificationLevel)) {
      verificationLevel = levelParam as VerificationLevel;
    }

    let isArchived: boolean | undefined;
    if (isArchivedParam !== null && isArchivedParam !== undefined) {
      if (isArchivedParam === "true") isArchived = true;
      else if (isArchivedParam === "false") isArchived = false;
    }

    const [stats, result] = await Promise.all([
      compatibilityService.getAdminStats(),
      compatibilityService.listAdminCompatibilities({
        page,
        limit,
        search,
        status,
        category,
        verificationLevel,
        isArchived,
      }),
    ]);

    return NextResponse.json({
      stats,
      ...result,
    });
  } catch (error: unknown) {

    console.error("Admin list compatibilities error:", error);
    return NextResponse.json({ success: false, error: "Internal server error fetching admin compatibility records." }, { status: 500 });
  }
}
