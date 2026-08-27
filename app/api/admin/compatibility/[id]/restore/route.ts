import { NextRequest, NextResponse } from "next/server";
import { compatibilityService } from "@/lib/services/compatibility";
import { getCompatibilityGovernanceUser } from "@/lib/services/compatibility/admin-context";
import { CompatibilityNotFoundError } from "@/lib/services/compatibility/compatibility.errors";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCompatibilityGovernanceUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 403 });
    }

    const { id } = await params;
    const restored = await compatibilityService.restoreCompatibility(id);

    return NextResponse.json({
      success: true,
      message: "Compatibility record restored successfully.",
      compatibility: restored,
    });

  } catch (error: unknown) {
    console.error("Admin restore compatibility error:", error);
    if (error instanceof CompatibilityNotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Failed to restore compatibility record." }, { status: 500 });
  }
}
