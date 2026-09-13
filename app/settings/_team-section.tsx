"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Copy, Edit3, Shield, Trash2, UserCheck, UserPlus, Users, UserX, X } from "lucide-react";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { buildAppUrl } from "@/lib/app-url";
import {
  inviteTeamMemberAction,
  removeMemberAction,
  revokeInvitationAction,
  toggleMemberStatusAction,
  updateMemberRoleAction,
} from "@/app/actions/teamActions";
import {
  assignSalesEmployeeProfileAction,
  getSalesEmployeeProfileMapAction,
  inviteSalesEmployeeAction,
  removeSalesEmployeeProfileAction,
  revokeSalesEmployeeInvitationAction,
} from "@/app/actions/salesEmployeeTeamActions";

export interface TeamMemberItem {
  id: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: Date | string;
  createdAt: Date | string;
  user: { id: string; name: string; email: string; phone?: string | null; createdAt: Date | string };
}
export interface PendingInviteItem {
  id: string;
  name?: string | null;
  email: string;
  role: MembershipRole;
  status: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  invitedBy?: { name?: string | null; email?: string | null } | null;
}
export interface SeatUsageData { usedSeats: number; activeMembersCount: number; pendingInvitesCount: number; maxSeats: number; remainingSeats: number; canInvite: boolean }

type AssignableRole = MembershipRole | "SALES_EMPLOYEE";
const roleLabel: Record<AssignableRole, string> = {
  OWNER: "المالك الأساسي",
  ADMIN: "مدير فرع",
  TECHNICIAN: "فني صيانة",
  SALES_EMPLOYEE: "موظف مبيعات",
  VIEWER: "مشاهد تقارير",
};

export function TeamManagementSection({ memberships, pendingInvitations, seatUsage, currentUserId, canManageTeam, canInviteTeam }: {
  memberships: TeamMemberItem[];
  pendingInvitations: PendingInviteItem[];
  seatUsage: SeatUsageData;
  currentUserId: string;
  isOwner?: boolean;
  canManageTeam: boolean;
  canInviteTeam: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMemberItem | null>(null);
  const [profileMembers, setProfileMembers] = useState<Set<string>>(new Set());
  const [profileInvites, setProfileInvites] = useState<Set<string>>(new Set());
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function refreshProfiles() {
    try {
      const result = await getSalesEmployeeProfileMapAction();
      setProfileMembers(new Set(result.memberships));
      setProfileInvites(new Set(result.invitations));
    } catch { /* authorization is already enforced by the page */ }
  }
  useEffect(() => { void refreshProfiles(); }, []);

  const activeCount = memberships.filter((member) => member.status === MembershipStatus.ACTIVE).length;
  const roleOf = (member: TeamMemberItem): AssignableRole => profileMembers.has(member.id) ? "SALES_EMPLOYEE" : member.role;
  const inviteRoleOf = (invite: PendingInviteItem): AssignableRole => profileInvites.has(invite.id) ? "SALES_EMPLOYEE" : invite.role;

  function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const requestedRole = String(data.get("role") || "TECHNICIAN") as AssignableRole;
    setInviteError(null);
    setInviteUrl(null);
    startTransition(async () => {
      if (requestedRole === "SALES_EMPLOYEE") {
        const result = await inviteSalesEmployeeAction({}, data);
        if (result.error) setInviteError(result.error);
        else if (result.inviteUrl) setInviteUrl(result.inviteUrl);
      } else {
        const result = await inviteTeamMemberAction(data);
        if (!result.success) setInviteError(result.error || "تعذر إنشاء الدعوة");
        else if (result.rawToken) setInviteUrl(buildAppUrl(`/invite/${result.rawToken}`));
      }
      await refreshProfiles();
    });
  }

  function submitRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || isPending) return;
    const data = new FormData(event.currentTarget);
    data.set("membershipId", editing.id);
    const nextRole = String(data.get("role")) as AssignableRole;
    const currentlySales = profileMembers.has(editing.id);
    startTransition(async () => {
      try {
        if (nextRole === "SALES_EMPLOYEE") {
          await assignSalesEmployeeProfileAction(data);
        } else {
          if (currentlySales) await removeSalesEmployeeProfileAction(data);
          const normalData = new FormData();
          normalData.set("membershipId", editing.id);
          normalData.set("role", nextRole);
          const result = await updateMemberRoleAction(normalData);
          if (!result.success) throw new Error(result.error || "تعذر تحديث الدور");
        }
        setEditing(null);
        await refreshProfiles();
      } catch (error) { alert(error instanceof Error ? error.message : "تعذر تحديث الدور"); }
    });
  }

  function toggleStatus(member: TeamMemberItem) {
    if (isPending) return;
    const status = member.status === MembershipStatus.ACTIVE ? MembershipStatus.SUSPENDED : MembershipStatus.ACTIVE;
    if (!window.confirm(status === MembershipStatus.SUSPENDED ? `تجميد حساب ${member.user.name}؟` : `إعادة تنشيط ${member.user.name}؟`)) return;
    const data = new FormData(); data.set("membershipId", member.id); data.set("status", status);
    startTransition(async () => { const result = await toggleMemberStatusAction(data); if (!result.success) alert(result.error); });
  }

  function remove(member: TeamMemberItem) {
    if (!window.confirm(`إزالة ${member.user.name} من المتجر؟`)) return;
    const data = new FormData(); data.set("membershipId", member.id);
    startTransition(async () => { const result = await removeMemberAction(data); if (!result.success) alert(result.error); });
  }

  function revoke(invite: PendingInviteItem) {
    if (!window.confirm(`إلغاء دعوة ${invite.email}؟`)) return;
    const data = new FormData(); data.set("invitationId", invite.id);
    startTransition(async () => {
      if (profileInvites.has(invite.id)) await revokeSalesEmployeeInvitationAction(data);
      else { const result = await revokeInvitationAction(data); if (!result.success) alert(result.error); }
      await refreshProfiles();
    });
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return <section className="erp-card p-6 space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Users className="h-5 w-5" /></div><div><h3 className="text-sm font-black text-slate-800 dark:text-slate-100">فريق العمل والموظفون</h3><p className="mt-0.5 text-[11px] font-bold text-slate-400">الأدوار: مدير فرع، فني صيانة، موظف مبيعات، ومشاهد تقارير.</p></div></div>
      <div className="flex items-center gap-2"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">المقاعد {seatUsage.usedSeats}/{seatUsage.maxSeats} • نشط {activeCount}</span>{canInviteTeam ? <Button type="button" disabled={!seatUsage.canInvite || isPending} onClick={() => { setInviteOpen(true); setInviteError(null); setInviteUrl(null); }} className="rounded-xl font-black"><UserPlus className="ml-1.5 h-4 w-4" />دعوة موظف</Button> : null}</div>
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800"><table className="w-full min-w-[820px] text-right text-xs"><thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="p-3">الموظف</th><th className="p-3">البريد</th><th className="p-3">الدور</th><th className="p-3">الحالة</th><th className="p-3">الانضمام</th>{canManageTeam ? <th className="p-3 text-center">الإجراءات</th> : null}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{memberships.map((member) => {
      const role = roleOf(member); const owner = member.role === MembershipRole.OWNER; const self = member.user.id === currentUserId;
      return <tr key={member.id}><td className="p-3 font-black">{member.user.name}{self ? <span className="mr-1 text-[9px] text-slate-400">(حسابك)</span> : null}</td><td className="p-3 font-medium text-slate-500" dir="ltr">{member.user.email}</td><td className="p-3"><span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-black ${role === "SALES_EMPLOYEE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}><Shield className="h-3 w-3" />{roleLabel[role]}</span></td><td className="p-3"><span className={member.status === MembershipStatus.ACTIVE ? "font-black text-emerald-700" : "font-black text-rose-700"}>{member.status === MembershipStatus.ACTIVE ? "نشط" : "مجمد"}</span></td><td className="p-3 text-slate-500">{formatDate(member.joinedAt || member.createdAt)}</td>{canManageTeam ? <td className="p-3"><div className="flex justify-center gap-1">{owner || self ? <span className="text-[10px] font-bold text-slate-400">محمي</span> : <><Button type="button" variant="outline" size="sm" onClick={() => setEditing(member)}><Edit3 className="ml-1 h-3 w-3" />الدور</Button><Button type="button" variant="outline" size="sm" onClick={() => toggleStatus(member)}>{member.status === MembershipStatus.ACTIVE ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}</Button><Button type="button" variant="outline" size="sm" onClick={() => remove(member)} className="text-rose-600"><Trash2 className="h-3 w-3" /></Button></>}</div></td> : null}</tr>;
    })}</tbody></table></div>

    {pendingInvitations.length ? <div className="space-y-2"><h4 className="text-xs font-black text-amber-700">الدعوات المعلقة ({pendingInvitations.length})</h4>{pendingInvitations.map((invite) => <div key={invite.id} className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-black">{invite.name || "موظف جديد"} • <span dir="ltr">{invite.email}</span></div><div className="mt-1 text-[10px] font-bold text-slate-500">{roleLabel[inviteRoleOf(invite)]} • {formatDate(invite.createdAt)}</div></div>{canManageTeam ? <Button type="button" variant="ghost" size="sm" onClick={() => revoke(invite)} className="text-rose-600">إلغاء الدعوة</Button> : null}</div>)}</div> : null}

    {inviteOpen ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950"><div className="mb-5 flex items-center justify-between"><h3 className="text-sm font-black">دعوة موظف جديد</h3><button type="button" onClick={() => setInviteOpen(false)}><X className="h-5 w-5" /></button></div>{inviteUrl ? <div className="space-y-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800"><Check className="ml-1 inline h-4 w-4" />تم إنشاء الدعوة. أرسل الرابط للموظف.</div><div className="flex gap-2" dir="ltr"><input readOnly value={inviteUrl} className="erp-input flex-1 text-xs" /><Button type="button" variant="outline" onClick={copyInvite}><Copy className="mr-1 h-4 w-4" />{copied ? "تم" : "نسخ"}</Button></div></div> : <form onSubmit={submitInvite} className="space-y-4"><label className="grid gap-1.5 text-xs font-bold">الاسم<input name="name" minLength={2} required className="erp-input" /></label><label className="grid gap-1.5 text-xs font-bold">البريد<input name="email" type="email" required className="erp-input" dir="ltr" /></label><label className="grid gap-1.5 text-xs font-bold">الدور<select name="role" defaultValue="TECHNICIAN" className="erp-input"><option value="ADMIN">مدير فرع</option><option value="TECHNICIAN">فني صيانة</option><option value="SALES_EMPLOYEE">موظف مبيعات — صلاحيات محدودة</option><option value="VIEWER">مشاهد تقارير</option></select></label>{inviteError ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{inviteError}</div> : null}<Button type="submit" disabled={isPending} className="w-full rounded-xl font-black">{isPending ? "جاري إنشاء الدعوة..." : "إنشاء رابط الدعوة"}</Button></form>}</div></div> : null}

    {editing ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-black">تغيير دور {editing.user.name}</h3><p className="mt-1 text-[10px] font-bold text-slate-400">موظف المبيعات يُنقل لمساحة عمل محدودة ولا يرى الأقسام الحساسة.</p></div><button type="button" onClick={() => setEditing(null)}><X className="h-5 w-5" /></button></div><form onSubmit={submitRole} className="space-y-4"><label className="grid gap-1.5 text-xs font-bold">الدور<select name="role" defaultValue={roleOf(editing)} className="erp-input"><option value="ADMIN">مدير فرع</option><option value="TECHNICIAN">فني صيانة</option><option value="SALES_EMPLOYEE">موظف مبيعات</option><option value="VIEWER">مشاهد تقارير</option></select></label><Button type="submit" disabled={isPending} className="w-full rounded-xl font-black">حفظ الدور</Button></form></div></div> : null}
  </section>;
}
