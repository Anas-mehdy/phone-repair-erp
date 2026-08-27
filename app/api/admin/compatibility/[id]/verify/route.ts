import { NextRequest, NextResponse } from "next/server";
import { compatibilityService } from "@/lib/services/compatibility";
import { getCompatibilityGovernanceUser } from "@/lib/services/compatibility/admin-context";
import {
  VerificationEvidenceRequiredError,
  InsufficientVerificationPermissionError,
  InvalidVerificationLevelError,
  ArchivedCompatibilityCannotBeVerifiedError,
  CompatibilityNotFoundError,
} from "@/lib/services/compatibility/compatibility.errors";
import { VerificationLevel, CompatibilityType, VerificationSourceType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCompatibilityGovernanceUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized verification request." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const verificationLevel = body.verificationLevel as VerificationLevel;
    const compatibilityType = body.compatibilityType as CompatibilityType | undefined;
    const technicalNotes = body.technicalNotes as string | undefined;
    const evidence = body.evidence as {
      sourceType: VerificationSourceType;
      sourceReference: string;
      evidenceDetails: string;
    };

    if (!verificationLevel || !evidence || !evidence.sourceType || !evidence.sourceReference || !evidence.evidenceDetails) {
      return NextResponse.json(
        { success: false, error: "Missing required verification data or evidence reference." },
        { status: 400 }
      );
    }

    const updated = await compatibilityService.verifyCompatibility(
      {
        compatibilityId: id,
        verificationLevel,
        compatibilityType,
        technicalNotes,
        evidence,
      },
      user
    );

    return NextResponse.json({
      success: true,
      message: "Compatibility published by the platform owner after evidence review.",
      compatibility: updated,
    });
  } catch (error: unknown) {
    console.error("Admin verify compatibility error:", error);
    if (error instanceof VerificationEvidenceRequiredError) {
      return NextResponse.json({ success: false, code: "EVIDENCE_REQUIRED", error: error.message }, { status: 400 });
    }
    if (error instanceof InsufficientVerificationPermissionError) {
      return NextResponse.json({ success: false, code: "INSUFFICIENT_PERMISSION", error: error.message }, { status: 403 });
    }
    if (error instanceof InvalidVerificationLevelError) {
      return NextResponse.json({ success: false, code: "INVALID_LEVEL", error: error.message }, { status: 400 });
    }
    if (error instanceof ArchivedCompatibilityCannotBeVerifiedError) {
      return NextResponse.json({ success: false, code: "ARCHIVED_CANNOT_VERIFY", error: error.message }, { status: 400 });
    }
    if (error instanceof CompatibilityNotFoundError) {
      return NextResponse.json({ success: false, code: "NOT_FOUND", error: error.message }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: "Failed to verify compatibility." }, { status: 500 });
  }
}
