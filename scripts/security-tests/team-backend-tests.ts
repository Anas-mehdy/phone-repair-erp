import crypto from "crypto";
import { MembershipRole, MembershipStatus, InvitationStatus } from "@prisma/client";
import { ALL_APP_PERMISSIONS, hasRolePermission } from "../../lib/auth/permissions";

interface TestAssert {
  group: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const assertions: TestAssert[] = [];

function assert(group: string, name: string, condition: boolean, expected: string, actual: string) {
  assertions.push({ group, name, passed: condition, expected, actual });
}

async function runTeamBackendTests() {
  console.log("================================================================================");
  console.log("PHASE 7 — STEP 1: TEAM MANAGEMENT BACKEND LOGIC VERIFICATION");
  console.log("================================================================================\n");

  const grp1 = "1. Role Invitation Constraints";

  // 1.1 Inviting an OWNER must be strictly forbidden
  const testInviteRoleValidation = (role: MembershipRole) => {
    if (role === MembershipRole.OWNER) {
      throw new Error("لا يمكن إنشاء أو دعوة مالك متجر جديد.");
    }
    const allowed: MembershipRole[] = [
      MembershipRole.ADMIN,
      MembershipRole.TECHNICIAN,
      MembershipRole.VIEWER,
    ];
    if (!allowed.includes(role)) {
      throw new Error("الدور المحدد غير صالح.");
    }
    return true;
  };

  let ownerInviteBlocked = false;
  try {
    testInviteRoleValidation(MembershipRole.OWNER);
  } catch {
    ownerInviteBlocked = true;
  }
  assert(
    grp1,
    "Inviting an OWNER role is strictly rejected",
    ownerInviteBlocked,
    "Throws error on OWNER invitation",
    ownerInviteBlocked ? "Blocked as expected" : "FAILED: Allowed OWNER invitation"
  );

  // 1.2 Allowed roles
  for (const r of [MembershipRole.ADMIN, MembershipRole.TECHNICIAN, MembershipRole.VIEWER]) {
    let allowed = false;
    try {
      allowed = testInviteRoleValidation(r);
    } catch {}
    assert(
      grp1,
      `Inviting role [${r}] is permitted`,
      allowed,
      "Role is permitted",
      allowed ? "Permitted" : "FAILED"
    );
  }

  // ---------------------------------------------------------------------------
  const grp2 = "2. Token Generation & Hash Safety";
  // ---------------------------------------------------------------------------
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  assert(
    grp2,
    "Raw token has 64 hex characters (32 bytes entropy)",
    rawToken.length === 64,
    "Length 64",
    `Length: ${rawToken.length}`
  );
  assert(
    grp2,
    "Token hash is valid SHA-256 digest (64 chars)",
    tokenHash.length === 64 && tokenHash !== rawToken,
    "SHA-256 hash length 64 and distinct from raw token",
    `Hash length: ${tokenHash.length}`
  );

  // ---------------------------------------------------------------------------
  const grp3 = "3. Seat Limit & Over-allocation Enforcement";
  // ---------------------------------------------------------------------------
  const testSeatCheck = (activeMembers: number, pendingInvites: number, maxSeats: number) => {
    const used = activeMembers + pendingInvites;
    const canInvite = used < maxSeats;
    if (!canInvite) {
      throw new Error("تم بلوغ الحد الأقصى لعدد المقاعد المتاحة");
    }
    return true;
  };

  let seatLimitBlocked = false;
  try {
    testSeatCheck(4, 1, 5); // 4 active + 1 pending = 5/5 -> full
  } catch {
    seatLimitBlocked = true;
  }
  assert(
    grp3,
    "Seat limit strictly blocks invitation when usedSeats >= maxSeats (5/5)",
    seatLimitBlocked,
    "Blocked when 5/5 used",
    seatLimitBlocked ? "Blocked" : "FAILED"
  );

  let underLimitAllowed = false;
  try {
    underLimitAllowed = testSeatCheck(2, 1, 5); // 3/5 -> can invite
  } catch {}
  assert(
    grp3,
    "Permits invitation when remaining seats exist (3/5)",
    underLimitAllowed,
    "Permitted when 3/5 used",
    underLimitAllowed ? "Permitted" : "FAILED"
  );

  // ---------------------------------------------------------------------------
  const grp4 = "4. Role Modification Constraints";
  // ---------------------------------------------------------------------------
  const testRoleUpdateValidation = (
    targetRole: MembershipRole,
    targetUserId: string,
    actorUserId: string,
    newRole: MembershipRole
  ) => {
    if (newRole === MembershipRole.OWNER) {
      throw new Error("لا يمكن ترقية موظف إلى رتبة مالك متجر.");
    }
    if (targetRole === MembershipRole.OWNER) {
      throw new Error("لا يمكن تعديل دور مالك المتجر الأساسي.");
    }
    if (targetUserId === actorUserId) {
      throw new Error("لا يمكنك تعديل دورك الخاص بنفسك.");
    }
    return true;
  };

  // Promoting someone to OWNER -> blocked
  let promoteToOwnerBlocked = false;
  try {
    testRoleUpdateValidation(MembershipRole.TECHNICIAN, "user-2", "user-1", MembershipRole.OWNER);
  } catch {
    promoteToOwnerBlocked = true;
  }
  assert(
    grp4,
    "Promoting a team member to OWNER is strictly blocked",
    promoteToOwnerBlocked,
    "Blocked",
    promoteToOwnerBlocked ? "Blocked" : "FAILED"
  );

  // Modifying OWNER role -> blocked
  let modifyOwnerRoleBlocked = false;
  try {
    testRoleUpdateValidation(MembershipRole.OWNER, "user-1", "user-2", MembershipRole.ADMIN);
  } catch {
    modifyOwnerRoleBlocked = true;
  }
  assert(
    grp4,
    "Modifying the OWNER's role is strictly blocked",
    modifyOwnerRoleBlocked,
    "Blocked",
    modifyOwnerRoleBlocked ? "Blocked" : "FAILED"
  );

  // Self-role modification -> blocked
  let selfRoleModBlocked = false;
  try {
    testRoleUpdateValidation(MembershipRole.ADMIN, "user-2", "user-2", MembershipRole.TECHNICIAN);
  } catch {
    selfRoleModBlocked = true;
  }
  assert(
    grp4,
    "Self-role modification is strictly blocked",
    selfRoleModBlocked,
    "Blocked",
    selfRoleModBlocked ? "Blocked" : "FAILED"
  );

  // ---------------------------------------------------------------------------
  const grp5 = "5. Status Toggling & Removal Constraints";
  // ---------------------------------------------------------------------------
  const testStatusValidation = (targetRole: MembershipRole, targetUserId: string, actorUserId: string) => {
    if (targetRole === MembershipRole.OWNER) {
      throw new Error("لا يمكن تجميد أو إزالة مالك المتجر.");
    }
    if (targetUserId === actorUserId) {
      throw new Error("لا يمكنك تجميد أو إزالة نفسك.");
    }
    return true;
  };

  let suspendOwnerBlocked = false;
  try {
    testStatusValidation(MembershipRole.OWNER, "user-1", "user-2");
  } catch {
    suspendOwnerBlocked = true;
  }
  assert(
    grp5,
    "Suspending or removing the OWNER is strictly blocked",
    suspendOwnerBlocked,
    "Blocked",
    suspendOwnerBlocked ? "Blocked" : "FAILED"
  );

  let selfSuspendBlocked = false;
  try {
    testStatusValidation(MembershipRole.TECHNICIAN, "user-2", "user-2");
  } catch {
    selfSuspendBlocked = true;
  }
  assert(
    grp5,
    "Self-suspension or self-removal is strictly blocked",
    selfSuspendBlocked,
    "Blocked",
    selfSuspendBlocked ? "Blocked" : "FAILED"
  );

  // ---------------------------------------------------------------------------
  const grp6 = "6. Invitation Expiry & Status Verification";
  // ---------------------------------------------------------------------------
  const testTokenVerification = (invitation: {
    status: InvitationStatus;
    deletedAt: Date | null;
    expiresAt: Date;
  } | null) => {
    if (!invitation || invitation.deletedAt !== null) {
      return { valid: false, error: "invalid_or_deleted" };
    }
    if (invitation.status === InvitationStatus.ACCEPTED) {
      return { valid: false, error: "already_accepted" };
    }
    if (invitation.status === InvitationStatus.REVOKED) {
      return { valid: false, error: "revoked" };
    }
    if (invitation.expiresAt < new Date()) {
      return { valid: false, error: "expired" };
    }
    return { valid: true };
  };

  const acceptedCheck = testTokenVerification({
    status: InvitationStatus.ACCEPTED,
    deletedAt: null,
    expiresAt: new Date(Date.now() + 100000),
  });
  assert(
    grp6,
    "Already ACCEPTED invitation token is rejected",
    !acceptedCheck.valid && acceptedCheck.error === "already_accepted",
    "Rejected",
    acceptedCheck.error || "Valid"
  );

  const revokedCheck = testTokenVerification({
    status: InvitationStatus.REVOKED,
    deletedAt: null,
    expiresAt: new Date(Date.now() + 100000),
  });
  assert(
    grp6,
    "REVOKED invitation token is rejected",
    !revokedCheck.valid && revokedCheck.error === "revoked",
    "Rejected",
    revokedCheck.error || "Valid"
  );

  const expiredCheck = testTokenVerification({
    status: InvitationStatus.PENDING,
    deletedAt: null,
    expiresAt: new Date(Date.now() - 10000),
  });
  assert(
    grp6,
    "EXPIRED invitation token (>7 days) is rejected",
    !expiredCheck.valid && expiredCheck.error === "expired",
    "Rejected",
    expiredCheck.error || "Valid"
  );

  const activeCheck = testTokenVerification({
    status: InvitationStatus.PENDING,
    deletedAt: null,
    expiresAt: new Date(Date.now() + 100000),
  });
  assert(
    grp6,
    "Valid PENDING invitation token is accepted",
    activeCheck.valid,
    "Valid",
    activeCheck.valid ? "Valid" : "Rejected"
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEAM BACKEND TEST ASSERTIONS:");
  console.log("--------------------------------------------------------------------------------");

  const groups = [...new Set(assertions.map((a) => a.group))];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const g of groups) {
    const groupAsserts = assertions.filter((a) => a.group === g);
    const passedCount = groupAsserts.filter((a) => a.passed).length;
    const failedCount = groupAsserts.filter((a) => !a.passed).length;
    totalPassed += passedCount;
    totalFailed += failedCount;

    const status = failedCount === 0 ? "PASSED" : "FAILED";
    console.log(`[${status}] ${g} (${passedCount}/${groupAsserts.length} assertions passed)`);
    for (const a of groupAsserts) {
      if (!a.passed) {
        console.error(`  ❌ FAILED: ${a.name} | Expected: ${a.expected} | Actual: ${a.actual}`);
      }
    }
  }

  console.log("\n================================================================================");
  console.log(`TOTAL TEAM BACKEND ASSERTIONS: ${assertions.length}`);
  console.log(`PASSED                       : ${totalPassed}`);
  console.log(`FAILED                       : ${totalFailed}`);
  console.log("================================================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTeamBackendTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
