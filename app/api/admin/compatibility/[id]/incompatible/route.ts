import { NextRequest, NextResponse } from "next/server";
import { compatibilityService } from "@/lib/services/compatibility";
import { getCompatibilityGovernanceUser } from "@/lib/services/compatibility/admin-context";
import { CompatibilityNotFoundError } from "@/lib/services/compatibility/compatibility.errors";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCompatibilityGovernanceUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "Technical reason is mandatory when marking compatibility as INCOMPATIBLE." },
        { status: 400 }
      );
    }

    const updated = await compatibilityService.markIncompatible(
      {
        compatibilityId: id,
        reason,
      },
      user
    );

    return NextResponse.json({
      success: true,
      message: "Compatibility marked as INCOMPATIBLE.",
      compatibility: updated,
    });
  } catch (error: unknown) {
    console.error("Admin mark incompatible error:", error);
    if (error instanceof CompatibilityNotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Failed to mark compatibility as incompatible." }, { status: 500 });
  }
}
