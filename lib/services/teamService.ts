import crypto from "crypto";
import { MembershipRole, MembershipStatus, InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export interface CreateInvitationInput {
  email: string;
  role: MembershipRole;
}

export interface AcceptInvitationInput {
  name: string;
  password: string;
}

export interface SeatUsageInfo {
  usedSeats: number;
  activeMembersCount: number;
  pendingInvitesCount: number;
  maxSeats: number;
  remainingSeats: number;
  canInvite: boolean;
}

/**
 * Calculates current seat usage for a shop (active memberships + pending invitations).
 */
export async function getShopSeatUsage(shopId: string): Promise<SeatUsageInfo> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { maxSeats: true },
  });

  const maxSeats = shop?.maxSeats ?? 5;

  const [activeMembersCount, pendingInvitesCount] = await Promise.all([
    prisma.membership.count({
      where: {
        shopId,
        status: { not: MembershipStatus.REMOVED },
        deletedAt: null,
      },
    }),
    prisma.shopInvitation.count({
      where: {
        shopId,
        status: InvitationStatus.PENDING,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  const usedSeats = activeMembersCount + pendingInvitesCount;
  const remainingSeats = Math.max(0, maxSeats - usedSeats);
  const canInvite = usedSeats < maxSeats;

  return {
    usedSeats,
    activeMembersCount,
    pendingInvitesCount,
    maxSeats,
    remainingSeats,
    canInvite,
  };
}

/**
 * Lists all active team members and pending invitations for a shop.
 */
export async function listTeamMembers(shopId: string) {
  const [memberships, pendingInvitations, seatUsage] = await Promise.all([
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
      orderBy: [
        { role: "asc" },
        { createdAt: "asc" },
      ],
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
    getShopSeatUsage(shopId),
  ]);

  return {
    memberships,
    pendingInvitations,
    seatUsage,
  };
}

/**
 * Creates a cryptographically secure invitation for an employee to join a shop.
 */
export async function createInvitation(
  shopId: string,
  input: CreateInvitationInput,
  invitedByUserId: string
) {
  const email = input.email.trim().toLowerCase();

  // Validate allowed roles (Strictly forbid inviting an OWNER)
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

  // Check if email already has an active membership in this shop
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

  // Check seat capacity
  const seatUsage = await getShopSeatUsage(shopId);
  if (!seatUsage.canInvite) {
    throw new Error(
      `تم بلوغ الحد الأقصى لعدد المقاعد المتاحة في هذا المتجر (${seatUsage.maxSeats} مقاعد). يرجى ترقية الباقة لإضافة المزيد.`
    );
  }

  // Revoke any previous pending invitation for this email in this shop
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

  // Generate 32-byte cryptographically secure token and SHA-256 hash
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // 7-day expiration window
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.shopInvitation.create({
    data: {
      shopId,
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

/**
 * Updates a team member's role (ADMIN ↔ TECHNICIAN ↔ VIEWER).
 */
export async function updateMemberRole(
  shopId: string,
  membershipId: string,
  newRole: MembershipRole,
  actorUserId: string
) {
  // Disallow assigning OWNER role
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

/**
 * Toggles a member's status (ACTIVE ↔ SUSPENDED).
 */
export async function toggleMemberStatus(
  shopId: string,
  membershipId: string,
  newStatus: MembershipStatus,
  actorUserId: string
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
    throw new Error("لا يمكنك تجميد حسابك الخاص.");
  }

  return prisma.membership.update({
    where: { id: membershipId },
    data: { status: newStatus },
  });
}

/**
 * Removes a member from the shop (Soft-delete membership).
 */
export async function removeMember(
  shopId: string,
  membershipId: string,
  actorUserId: string
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

/**
 * Revokes a pending invitation.
 */
export async function revokeInvitation(
  shopId: string,
  invitationId: string
) {
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

/**
 * Verifies an invitation token for public acceptance.
 */
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

/**
 * Accepts an invitation: sets password, activates membership, and marks invitation as accepted.
 */
export async function acceptInvitation(
  rawToken: string,
  input: AcceptInvitationInput
) {
  const check = await getInvitationByToken(rawToken);
  if (!check.valid || !check.invitation) {
    throw new Error(check.error || "الدعوة غير صالحة.");
  }

  const invitation = check.invitation;
  const name = input.name.trim();
  const password = input.password;

  if (!name) {
    throw new Error("الاسم مطلوب.");
  }

  if (!password || password.length < 6) {
    throw new Error("كلمة المرور يجب ألا تقل عن 6 أحرف.");
  }

  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    // Check seat limit inside atomic transaction
    const activeCount = await tx.membership.count({
      where: {
        shopId: invitation.shopId,
        status: { not: MembershipStatus.REMOVED },
        deletedAt: null,
      },
    });

    const shop = await tx.shop.findUnique({
      where: { id: invitation.shopId },
      select: { maxSeats: true },
    });

    const maxSeats = shop?.maxSeats ?? 5;
    if (activeCount >= maxSeats) {
      throw new Error("عفواً، لا يمكن الانضمام حالياً بسبب اكتمال عدد المقاعد المتاحة في المتجر.");
    }

    // Find or create User record
    let user = await tx.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    if (user) {
      // User already exists in database -> update name & password
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name,
          passwordHash,
          deletedAt: null,
        },
      });
    } else {
      // New user record
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

    // Create or reactivate Membership
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

    // Mark invitation as ACCEPTED
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
