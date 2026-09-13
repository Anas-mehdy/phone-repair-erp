"use server";

import { MembershipRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildAppUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { accessProfileService, SALES_EMPLOYEE_PROFILE } from "@/lib/services/accessProfileService";
import { teamService } from "@/lib/services/teamService";

export type SalesEmployeeInviteState = { error?: string; inviteUrl?: string; email?: string };

export async function getSalesEmployeeProfileMapAction() {
  const auth = await requirePermission("team:read");
  const profiles = await accessProfileService.getShopProfiles(auth.shop.id);
  return {
    memberships: [...profiles.memberships.entries()].filter(([, profile]) => profile === SALES_EMPLOYEE_PROFILE).map(([id]) => id),
    invitations: [...profiles.invitations.entries()].filter(([, profile]) => profile === SALES_EMPLOYEE_PROFILE).map(([id]) => id),
  };
}

export async function inviteSalesEmployeeAction(_state: SalesEmployeeInviteState, formData: FormData): Promise<SalesEmployeeInviteState> {
  try {
    const auth = await requirePermission("team:invite");
    const input = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email() }).parse({ name: formData.get("name"), email: formData.get("email") });
    const result = await teamService.createInvitation(auth.shop.id, { name: input.name, email: input.email, role: MembershipRole.TECHNICIAN }, auth.user.id);
    await accessProfileService.setInvitationProfile(auth.shop.id, result.invitation.id, SALES_EMPLOYEE_PROFILE);
    revalidatePath("/settings");
    return { inviteUrl: buildAppUrl(`/invite/${result.rawToken}`), email: result.invitation.email };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر إنشاء دعوة موظف المبيعات." };
  }
}

export async function assignSalesEmployeeProfileAction(formData: FormData) {
  const auth = await requirePermission("team:manage");
  const membershipId = z.string().uuid().parse(formData.get("membershipId"));
  const target = await prisma.membership.findFirst({ where: { id: membershipId, shopId: auth.shop.id, deletedAt: null }, select: { id: true, userId: true, role: true } });
  if (!target) throw new Error("الموظف غير موجود.");
  if (target.role === MembershipRole.OWNER) throw new Error("لا يمكن تغيير صلاحية المالك.");
  if (target.userId === auth.user.id) throw new Error("لا يمكنك تحويل حسابك الحالي إلى موظف مبيعات.");
  await prisma.membership.update({ where: { id: target.id }, data: { role: MembershipRole.TECHNICIAN } });
  await accessProfileService.setMembershipProfile(auth.shop.id, target.id, SALES_EMPLOYEE_PROFILE);
  revalidatePath("/settings");
}

export async function removeSalesEmployeeProfileAction(formData: FormData) {
  const auth = await requirePermission("team:manage");
  const membershipId = z.string().uuid().parse(formData.get("membershipId"));
  const target = await prisma.membership.findFirst({ where: { id: membershipId, shopId: auth.shop.id, deletedAt: null }, select: { id: true, role: true } });
  if (!target || target.role === MembershipRole.OWNER) throw new Error("الموظف غير موجود أو لا يمكن تعديله.");
  await accessProfileService.setMembershipProfile(auth.shop.id, target.id, null);
  await prisma.membership.update({ where: { id: target.id }, data: { role: MembershipRole.TECHNICIAN } });
  revalidatePath("/settings");
}

export async function revokeSalesEmployeeInvitationAction(formData: FormData) {
  const auth = await requirePermission("team:manage");
  const invitationId = z.string().uuid().parse(formData.get("invitationId"));
  await teamService.revokeInvitation(auth.shop.id, invitationId);
  await accessProfileService.setInvitationProfile(auth.shop.id, invitationId, null);
  revalidatePath("/settings");
}
