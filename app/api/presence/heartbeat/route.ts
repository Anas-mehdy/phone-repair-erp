import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Minimal throttling interval in milliseconds (45 seconds)
const THROTTLE_MS = 45 * 1000;

export async function POST() {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Query only the lastActiveAt timestamp to determine if an update is needed
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lastActiveAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If active recently within the throttle window, return immediately without write operation
    if (user.lastActiveAt && now.getTime() - user.lastActiveAt.getTime() < THROTTLE_MS) {
      return NextResponse.json({ success: true, status: "throttled" });
    }

    // Update lastActiveAt
    await prisma.user.update({
      where: { id: session.userId },
      data: { lastActiveAt: now },
    });

    return NextResponse.json({ success: true, status: "updated" });
  } catch (error) {
    console.error("Presence heartbeat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
