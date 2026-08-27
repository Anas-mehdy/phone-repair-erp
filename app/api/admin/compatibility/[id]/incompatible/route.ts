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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUserContext();
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
