import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Active threshold: Users seen within the last 5 minutes are considered online
const ONLINE_THRESHOLD_MINUTES = 5;

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !isSuperAdminEmail(session.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const now = new Date();
    const thresholdDate = new Date(now.getTime() - ONLINE_THRESHOLD_MINUTES * 60 * 1000);

    const activeUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: {
          gte: thresholdDate,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        lastActiveAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            currency: true,
          },
        },
        memberships: {
          where: {
            status: "ACTIVE",
            deletedAt: null,
          },
          select: {
            role: true,
            shop: {
              select: {
                id: true,
                name: true,
                phone: true,
                currency: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        lastActiveAt: "desc",
      },
    });

    const activeShopIds = new Set<string>();

    const formattedUsers = activeUsers.map((user) => {
      const activeShop = user.memberships[0]?.shop || user.shop;
      const userRole = user.memberships[0]?.role || user.role;

      if (activeShop?.id) {
        activeShopIds.add(activeShop.id);
      }

      const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : now;
      const secondsAgo = Math.max(0, Math.floor((now.getTime() - lastActive.getTime()) / 1000));

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || activeShop?.phone || null,
        role: userRole,
        shop: activeShop
          ? {
              id: activeShop.id,
              name: activeShop.name,
              currency: activeShop.currency,
            }
          : null,
        lastActiveAt: user.lastActiveAt,
        secondsAgo,
      };
    });

    return NextResponse.json({
      onlineUsers: formattedUsers,
      onlineUsersCount: formattedUsers.length,
      activeShopsCount: activeShopIds.size,
      activeShopIds: Array.from(activeShopIds),
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error("Admin presence API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
