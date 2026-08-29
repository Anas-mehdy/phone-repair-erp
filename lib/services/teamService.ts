import crypto from "crypto";
import { InvitationStatus, MembershipRole, MembershipStatus } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";

export interface CreateInvitationInput {
  name: string;
  email: string;
  role: MembershipRole;
}

export interface AcceptInvitationInput {
  name?: string;
  password: string;
}

export interface SeatUsageInfo {
  usedSeats: number;
  activeMembersCount: number;
  pendingInvitesCount: number;
  maxSeats: number;
  remainingSeats: number;
  canInvite: boolean;
  isUnlimited: boolean;
}

function entitlementErrorMessage(result: Awaited<ReturnType<typeof entitlementService.checkCanAddEmployee>>) {
  return result.allowed
    ? ""
    : result.message;
}

/**
 * Seat information is derived from the Subscription Entitlement Service.
 * Shop.maxSeats is legacy metadata and is not an authorization source.
 */
export async function getShopSeatUsage(shopId: string): Promise<SeatUsageInfo> {
  const [entitlement, pendingInvitesCount] = await Promise.all([
    entitlementService.getEntitlementContext(shopId),
    prisma.shopInvitation.count({
      where: {
        shopId,
        status: InvitationStatus.PENDING,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  const activeMembersCount = entitlement.usage.activeSeats;
  const usedSeats = activeMembersCount + pendingInvitesCount;
  const limit = entitlement.limits.totalSeats;
  const isUnlimited = limit === null;

  return {
    usedSeats,
    activeMembersCount,
    pendingInvitesCount,
    // Keep numeric fields for the existing UI contract. UI can use isUnlimited
    // to render "غير محدود" instead of this display fallback.
    maxSeats: limit ?? Math.max(usedSeats, 1),
    remainingSeats: limit === null ? 0 : Math.max(0, limit - usedSeats),
    canInvite: entitlement.canAddEmployee,
    isUnlimited,
  };
}

export async function listTeamMembers(shopId: string) {
  const [memberships, pendingInvitations, entitlement] = await Promise.all([
    prisma.membership.findMany({
      where: {
        shopId,
        status: { not: MembershipStatus.REMOVED },
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.shopInvitation.findMany({
      where: {
        shopId,
        status: InvitationStatus.PENDING,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    entitlementService.getEntitlementContext(shopId),
  ]);

  const activeMembersCount = entitlement.usage.activeSeats;
  const pendingInvitesCount = pendingInvitations.length;
  const usedSeats = activeMembersCount + pendingInvitesCount;
  const limit = entitlement.limits.totalSeats;

  const seatUsage: SeatUsageInfo = {
    usedSeats,
    activeMembersCount,
    pendingInvitesCount,
    maxSeats: limit ?? Math.max(usedSeats, 1),
    remainingSeats: limit === null ? 0 : Math.max(0, limit - usedSeats),
    canInvite: entitlement.canAddEmployee,
    isUnlimited: limit === null,
  };

  return {
    memberships,
    pendingInvitations,
    seatUsage,
  };
}

export async function createInvitation(
  shopId: string,
  input: CreateInvitationInput,
  invitedByUserId: string,
) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name || name.length < 2) {
    throw new Error("اسم الموظف مطلوب (حرفان على الأقل).");
  }

  if (input.role === MembershipRole.OWNER) {
    throw new Error("لا يمكن إنشاء أو دعوة مالك متجر جديد. يمكنك فقط دعوة مدير أو فني أو مشاهد.");
  }

  const allowedRoles: MembershipRole[] = [
    MembershipRole.ADMIN,
    MembershipRole.TECHNICIAN,
    MembershipRole.VIEWER,
  ];

  if (!allowedRoles.includes(input.role)) {
    throw new Error("الدور المحدد غير صالح.");
  }

  // Entitlement Service is the authoritative seat/subscription gate.
  // BASIC is owner-only, regardless of legacy Shop.maxSeats.
  const employeeEntitlement = await entitlementService.checkCanAddEmployee(shopId);
  if (!employeeEntitlement.allowed) {
    throw new Error(entitlementErrorMessage(employeeEntitlement));
  }

  const existingMember = await prisma.membership.findFirst({
    where: {
      shopId,
      user: { email },
      deletedAt: null,
      status: { not: MembershipStatus.REMOVED },
    },
  });

  if (existingMember) {
    throw new Error("المستخدم مسجل كعضو بالفعل في هذا المتجر.");
  }

  await prisma.shopInvitation.updateMany({
    where: {
      shopId,
      email,
      status: InvitationStatus.PENDING,
    },
    data: {
      status: InvitationStatus.REVOKED,
      deletedAt: new Date(),
    },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.shopInvitation.create({
    data: {
      shopId,
      name,
      email,
      role: input.role,
      tokenHash,
      status: InvitationStatus.PENDING,
      invitedByUserId,
      expiresAt,
    },
    include: {
      shop: {
        select: { name: true },
      },
    },
  });

  return {
    invitation,
    rawToken,
  };
}

export async function updateMemberRole(
  shopId: string,
  membershipId: string,
  newRole: MembershipRole,
  actorUserId: string,
) {
  if (newRole === MembershipRole.OWNER) {
    throw new Error("لا يمكن ترقية موظف إلى رتبة مالك متجر.");
  }

  const allowedRoles: MembershipRole[] = [
    MembershipRole.ADMIN,
    MembershipRole.TECHNICIAN,
    MembershipRole.VIEWER,
  ];

  if (!allowedRoles.includes(newRole)) {
    throw new Error("الدور المحدد غير صالح.");
  }

  const target = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      shopId,
      deletedAt: null,
    },
  });

  if (!target) {
    throw new Error("العضوية المطلوبة غير موجودة في هذا المتجر.");
  }

  if (target.role === MembershipRole.OWNER) {
    throw new Error("لا يمكن تعديل دور مالك المتجر الأساسي.");
  }

  if (target.userId === actorUserId) {
    throw new Error("لا يمكنك تعديل دورك الخاص بنفسك.");
  }

  return prisma.membership.update({
    where: { id: membershipId },
    data: { role: newRole },
  });
}

export async function toggleMemberStatus(
  shopId: string,
  membershipId: string,
  newStatus: MembershipStatus,
  actorUserId: string,
) {
  if (newStatus !== MembershipStatus.ACTIVE && newStatus !== MembershipStatus.SUSPENDED) {
    throw new Error("الحالة المحددة غير صالحة.");
  }

  const target = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      shopId,
      deletedAt: null,
    },
  });

  if (!target) {
    throw new Error("العضوية المطلوبة غير موجودة في هذا المتجر.");
  }

  if (target.role === MembershipRole.OWNER) {
    throw new Error("لا يمكن تجميد حساب مالك المتجر.");
  }

  if (target.userId === actorUserId) {
    throw new Error("لا يمكنك تجميد حسابك الخاص بنفسك.");
  }

  // Reactivating a suspended worker is a new active seat and therefore must
  // obey the current subscription. Suspending remains allowed at all times.
  if (newStatus === MembershipStatus.ACTIVE && target.status !== MembershipStatus.ACTIVE) {
    const employeeEntitlement = await entitlementService.checkCanAddEmployee(shopId);
    if (!employeeEntitlement.allowed) {
      throw new Error(entitlementErrorMessage(employeeEntitlement));
    }
  }

  return prisma.membership.update({
    where: { id: membershipId },
    data: { status: newStatus },
  });
}

export async function removeMember(
  shopId: string,
  membershipId: string,
  actorUserId: string,
) {
  const target = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      shopId,
      deletedAt: null,
    },
  });

  if (!target) {
    throw new Error("العضوية المطلوبة غير موجودة في هذا المتجر.");
  }

  if (target.role === MembershipRole.OWNER) {
    throw new Error("لا يمكن إزالة مالك المتجر.");
  }

  if (target.userId === actorUserId) {
    throw new Error("لا يمكنك إزالة نفسك من المتجر.");
  }

  return prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: MembershipStatus.REMOVED,
      deletedAt: new Date(),
    },
  });
}

export async function revokeInvitation(shopId: string, invitationId: string) {
  const invitation = await prisma.shopInvitation.findFirst({
    where: {
      id: invitationId,
      shopId,
      deletedAt: null,
    },
  });

  if (!invitation) {
    throw new Error("الدعوة غير موجودة.");
  }

  return prisma.shopInvitation.update({
    where: { id: invitationId },
    data: {
      status: InvitationStatus.REVOKED,
      deletedAt: new Date(),
    },
  });
}

export async function getInvitationByToken(rawToken: string) {
  if (!rawToken || rawToken.length !== 64) {
    return { valid: false, error: "رمز الدعوة غير صالح." as const };
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await prisma.shopInvitation.findUnique({
    where: { tokenHash },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation || invitation.deletedAt !== null) {
    return { valid: false, error: "رابط الدعوة غير صالح أو تم إلغاؤه." as const };
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    return { valid: false, error: "تم قبول هذه الدعوة مسبقاً والتسجيل بها." as const };
  }

  if (invitation.status === InvitationStatus.REVOKED) {
    return { valid: false, error: "تم إلغاء رابط الدعوة من قِبل إدارة المتجر." as const };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: "انتهت صلاحية رابط الدعوة (تجاوز 7 أيام)." as const };
  }

  return { valid: true, invitation };
}

export async function acceptInvitation(rawToken: string, input: AcceptInvitationInput) {
  const check = await getInvitationByToken(rawToken);
  if (!check.valid || !check.invitation) {
    throw new Error(check.error || "الدعوة غير صالحة.");
  }

  const invitation = check.invitation;
  const employeeEntitlement = await entitlementService.checkCanAddEmployee(invitation.shopId);
  if (!employeeEntitlement.allowed) {
    throw new Error(entitlementErrorMessage(employeeEntitlement));
  }

  const name = (input.name?.trim() || invitation.name?.trim()) || "عضو فريق العمل";
  const password = input.password;

  if (!name) {
    throw new Error("الاسم مطلوب.");
  }

  if (!password || password.length < 6) {
    throw new Error("كلمة المرور يجب ألا تقل عن 6 أحرف.");
  }

  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    // Re-read the invitation inside the mutation transaction so a revoked or
    // already-accepted token cannot race with this acceptance.
    const liveInvitation = await tx.shopInvitation.findFirst({
      where: {
        id: invitation.id,
        shopId: invitation.shopId,
        status: InvitationStatus.PENDING,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!liveInvitation) {
      throw new Error("رابط الدعوة لم يعد صالحاً أو تم استخدامه بالفعل.");
    }

    let user = await tx.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    if (user) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name,
          passwordHash,
          version: { increment: 1 },
          deletedAt: null,
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          email: invitation.email.toLowerCase(),
          name,
          passwordHash,
          shopId: invitation.shopId,
          role: "STAFF",
        },
      });
    }

    const membership = await tx.membership.upsert({
      where: {
        shopId_userId: {
          shopId: invitation.shopId,
          userId: user.id,
        },
      },
      create: {
        shopId: invitation.shopId,
        userId: user.id,
        role: invitation.role,
        status: MembershipStatus.ACTIVE,
      },
      update: {
        role: invitation.role,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await tx.shopInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        version: user.version,
      },
      shop: invitation.shop,
      membership,
    };
  });
}

export const teamService = {
  getShopSeatUsage,
  listTeamMembers,
  createInvitation,
  updateMemberRole,
  toggleMemberStatus,
  removeMember,
  revokeInvitation,
  getInvitationByToken,
  acceptInvitation,
};
