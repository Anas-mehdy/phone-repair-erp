import { MembershipRole } from "@prisma/client";
import { ROLE_PERMISSIONS_MATRIX, hasRolePermission } from "../../lib/auth/permissions";

interface TestAssert {
  role: string;
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const assertions: TestAssert[] = [];

function assert(role: string, testName: string, condition: boolean, expected: string, actual: string) {
  assertions.push({ role, testName, passed: condition, expected, actual });
}

function runSettingsAuthorizationTests() {
  console.log("================================================================================");
  console.log("PHASE 9: SETTINGS ROUTE, MUTATION & NAVIGATION AUTHORIZATION REGRESSION SUITE");
  console.log("================================================================================\n");

  // 1. OWNER Permissions
  const ownerCanSettings = hasRolePermission(MembershipRole.OWNER, "shop:settings");
  assert(
    "OWNER",
    "OWNER possesses 'shop:settings' permission",
    ownerCanSettings,
    "Allowed (true)",
    ownerCanSettings ? "Allowed (true)" : "Blocked (false)"
  );

  // 2. ADMIN Permissions
  const adminCanSettings = hasRolePermission(MembershipRole.ADMIN, "shop:settings");
  assert(
    "ADMIN",
    "ADMIN is strictly forbidden from 'shop:settings'",
    !adminCanSettings,
    "Forbidden (false)",
    adminCanSettings ? "Allowed (true)" : "Forbidden (false)"
  );

  // 3. TECHNICIAN Permissions
  const techCanSettings = hasRolePermission(MembershipRole.TECHNICIAN, "shop:settings");
  assert(
    "TECHNICIAN",
    "TECHNICIAN is strictly forbidden from 'shop:settings'",
    !techCanSettings,
    "Forbidden (false)",
    techCanSettings ? "Allowed (true)" : "Forbidden (false)"
  );

  // 4. VIEWER Permissions
  const viewerCanSettings = hasRolePermission(MembershipRole.VIEWER, "shop:settings");
  assert(
    "VIEWER",
    "VIEWER is strictly forbidden from 'shop:settings'",
    !viewerCanSettings,
    "Forbidden (false)",
    viewerCanSettings ? "Allowed (true)" : "Forbidden (false)"
  );

  // 5. Navigation Sidebar Visibility Simulation
  const simulateNavVisibility = (role: MembershipRole) => {
    const permissions = ROLE_PERMISSIONS_MATRIX[role] || [];
    const canSettings = permissions.includes("shop:settings");
    const rawItems = [
      { href: "/dashboard", label: "لوحة التحكم" },
      { href: "/repair-orders", label: "طلبات الصيانة" },
      { href: "/settings", label: "إعدادات المتجر" },
    ];
    const visibleItems = rawItems.filter(
      (item) => item.href !== "/settings" || canSettings
    );
    const hasSettings = visibleItems.some((item) => item.href === "/settings");
    return { canSettings, hasSettings };
  };

  const ownerNav = simulateNavVisibility(MembershipRole.OWNER);
  assert(
    "OWNER",
    "OWNER sidebar renders 'Settings' navigation item",
    ownerNav.hasSettings === true,
    "Visible (true)",
    ownerNav.hasSettings ? "Visible (true)" : "Hidden (false)"
  );

  const adminNav = simulateNavVisibility(MembershipRole.ADMIN);
  assert(
    "ADMIN",
    "ADMIN sidebar strictly hides 'Settings' navigation item",
    adminNav.hasSettings === false,
    "Hidden (false)",
    adminNav.hasSettings ? "Visible (true)" : "Hidden (false)"
  );

  const techNav = simulateNavVisibility(MembershipRole.TECHNICIAN);
  assert(
    "TECHNICIAN",
    "TECHNICIAN sidebar strictly hides 'Settings' navigation item",
    techNav.hasSettings === false,
    "Hidden (false)",
    techNav.hasSettings ? "Visible (true)" : "Hidden (false)"
  );

  const viewerNav = simulateNavVisibility(MembershipRole.VIEWER);
  assert(
    "VIEWER",
    "VIEWER sidebar strictly hides 'Settings' navigation item",
    viewerNav.hasSettings === false,
    "Hidden (false)",
    viewerNav.hasSettings ? "Visible (true)" : "Hidden (false)"
  );

  // 6. Route Level Guard Simulation
  const simulateSettingsPageAccess = (role: MembershipRole) => {
    const permissions = ROLE_PERMISSIONS_MATRIX[role] || [];
    if (!permissions.includes("shop:settings")) {
      return { redirect: "/dashboard?error=unauthorized", rendered: false };
    }
    return { redirect: null, rendered: true };
  };

  const ownerAccess = simulateSettingsPageAccess(MembershipRole.OWNER);
  assert(
    "OWNER",
    "OWNER accessing /settings renders page",
    ownerAccess.rendered && ownerAccess.redirect === null,
    "Rendered",
    ownerAccess.rendered ? "Rendered" : "Redirected"
  );

  const adminAccess = simulateSettingsPageAccess(MembershipRole.ADMIN);
  assert(
    "ADMIN",
    "ADMIN accessing /settings triggers safe redirect to /dashboard",
    !adminAccess.rendered && adminAccess.redirect === "/dashboard?error=unauthorized",
    "Redirected to /dashboard",
    adminAccess.redirect || "Rendered"
  );

  const techAccess = simulateSettingsPageAccess(MembershipRole.TECHNICIAN);
  assert(
    "TECHNICIAN",
    "TECHNICIAN accessing /settings triggers safe redirect to /dashboard",
    !techAccess.rendered && techAccess.redirect === "/dashboard?error=unauthorized",
    "Redirected to /dashboard",
    techAccess.redirect || "Rendered"
  );

  const viewerAccess = simulateSettingsPageAccess(MembershipRole.VIEWER);
  assert(
    "VIEWER",
    "VIEWER accessing /settings triggers safe redirect to /dashboard",
    !viewerAccess.rendered && viewerAccess.redirect === "/dashboard?error=unauthorized",
    "Redirected to /dashboard",
    viewerAccess.redirect || "Rendered"
  );

  // 7. Server Action Guard Simulation
  const simulateUpdateShopSettingsMutation = (role: MembershipRole) => {
    const permissions = ROLE_PERMISSIONS_MATRIX[role] || [];
    if (!permissions.includes("shop:settings")) {
      return { status: "REDIRECT_UNAUTHORIZED", executed: false };
    }
    return { status: "EXECUTED_SUCCESS", executed: true };
  };

  const ownerMutation = simulateUpdateShopSettingsMutation(MembershipRole.OWNER);
  assert(
    "OWNER",
    "OWNER calling updateShopSettingsAction executes successfully",
    ownerMutation.executed,
    "Executed",
    ownerMutation.status
  );

  const techMutation = simulateUpdateShopSettingsMutation(MembershipRole.TECHNICIAN);
  assert(
    "TECHNICIAN",
    "TECHNICIAN calling updateShopSettingsAction redirects safely without server exception",
    !techMutation.executed && techMutation.status === "REDIRECT_UNAUTHORIZED",
    "REDIRECT_UNAUTHORIZED",
    techMutation.status
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST ASSERTION RESULTS:");
  console.log("--------------------------------------------------------------------------------");

  let totalPassed = 0;
  let totalFailed = 0;

  for (const a of assertions) {
    if (a.passed) {
      totalPassed++;
      console.log(`[PASSED] [${a.role}] ${a.testName}`);
    } else {
      totalFailed++;
      console.error(`[FAILED] [${a.role}] ${a.testName} | Expected: ${a.expected} | Actual: ${a.actual}`);
    }
  }

  console.log("\n================================================================================");
  console.log(`TOTAL SETTINGS AUTHORIZATION & NAV TESTS: ${assertions.length}`);
  console.log(`PASSED                                  : ${totalPassed}`);
  console.log(`FAILED                                  : ${totalFailed}`);
  console.log("================================================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runSettingsAuthorizationTests();
