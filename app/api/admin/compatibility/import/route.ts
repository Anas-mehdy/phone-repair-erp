import { NextRequest, NextResponse } from "next/server";
import { getCompatibilityGovernanceUser } from "@/lib/services/compatibility/admin-context";
import {
  compatibilityImportService,
  type CompatibilityImportInput,
} from "@/lib/services/compatibility/compatibility-import.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCompatibilityGovernanceUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized import request." }, { status: 403 });
    }

    const input = (await request.json()) as CompatibilityImportInput;
    const result = await compatibilityImportService.importDrafts(input, user.id);
    return NextResponse.json({
      success: true,
      message: "Import completed as hidden UNVERIFIED proposals. No record was published.",
      ...result,
    });
  } catch (error) {
    console.error("Compatibility import error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Import failed." },
      { status: 400 }
    );
  }
}
