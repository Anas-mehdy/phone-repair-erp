import { NextRequest, NextResponse } from "next/server";
import { runLifecycleAutomation } from "@/lib/services/lifecycleAutomationService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function runLimit() {
  const parsed = Number(process.env.GROWTH_LIFECYCLE_RUN_LIMIT ?? "50");
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 250) : 50;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await runLifecycleAutomation({ limit: runLimit() });
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
