import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const THROTTLE_MS = 45 * 1000;

export async function POST() {
  try {
    // getSession already checks that this user exists and that the session is valid.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - THROTTLE_MS);
    const result = await prisma.user.updateMany({
      where: {
        id: session.userId,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lte: cutoff } }],
      },
      data: { lastActiveAt: now },
    });

    return NextResponse.json({
      success: true,
      status: result.count ? "updated" : "throttled",
    });
  } catch (error) {
    console.error("Presence heartbeat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
