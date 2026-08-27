import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/adminAuth";
import { compatibilityService } from "@/lib/services/compatibility";
import { CompatibilityNotFoundError } from "@/lib/services/compatibility/compatibility.errors";

export const dynamic = "force-dynamic";

async function getAdminUserContext() {
  const session = await getSession();
  if (!session) return null;
  const isSuper = isSuperAdminEmail(session.email);
  const isOwnerOrAdmin = session.role === "OWNER" || session.role === "ADMIN" || isSuper;
  if (!isOwnerOrAdmin) return null;

  return {
    id: session.userId,
    email: session.email,
    role: session.role,
    isSuperAdmin: isSuper,
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUserContext();
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
