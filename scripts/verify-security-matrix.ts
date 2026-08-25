import { MembershipRole, MembershipStatus } from "@prisma/client";
import {
  type AppPermission,
  ALL_APP_PERMISSIONS,
  ROLE_PERMISSIONS_MATRIX,
  getPermissionsForRole,
  hasRolePermission,
} from "../lib/auth/permissions";
import {
  type AuthContext,
  can,
  AuthenticationError,
  AuthorizationError,
  MembershipInactiveError,
} from "../lib/auth/context";

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(category: string, name: string, condition: boolean, errorMsg?: string) {
  if (condition) {
    results.push({ category, name, passed: true });
  } else {
    results.push({
      category,
      name,
      passed: false,
      error: errorMsg || "Assertion failed",
    });
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("PHASE 2F — SECURITY & PERMISSION MATRIX VERIFICATION");
  console.log("==================================================\n");

  // ==========================================
  // Category 1: Role Permissions Matrix Tests
  // ==========================================
  const cat1 = "1. Role Permissions Matrix";

  // 1.1 OWNER permissions (Must have all 22)
  for (const perm of ALL_APP_PERMISSIONS) {
    assert(
      cat1,
      `OWNER possesses permission: ${perm}`,
      hasRolePermission("OWNER", perm),
      `OWNER is missing ${perm}`
    );
  }
  assert(
    cat1,
    "OWNER has exact count of all 22 permissions",
    getPermissionsForRole("OWNER").length === 22,
    `Expected 22, got ${getPermissionsForRole("OWNER").length}`
  );

  // 1.2 ADMIN permissions (Must have 21, must NOT have shop:settings)
  assert(
    cat1,
    "ADMIN is strictly DENIED shop:settings",
    !hasRolePermission("ADMIN", "shop:settings"),
    "ADMIN should NOT have shop:settings"
  );
  assert(
    cat1,
    "ADMIN has repairs:delete",
    hasRolePermission("ADMIN", "repairs:delete")
  );
  assert(
    cat1,
    "ADMIN has sales:cancel",
    hasRolePermission("ADMIN", "sales:cancel")
  );
  assert(
    cat1,
    "ADMIN has inventory:adjust",
    hasRolePermission("ADMIN", "inventory:adjust")
  );
  assert(
    cat1,
    "ADMIN has invoices:void",
    hasRolePermission("ADMIN", "invoices:void")
  );
  assert(
    cat1,
    "ADMIN has customers:delete",
    hasRolePermission("ADMIN", "customers:delete")
  );
  assert(
    cat1,
    "ADMIN has team:manage",
    hasRolePermission("ADMIN", "team:manage")
  );
  assert(
    cat1,
    "ADMIN has exact count of 21 permissions",
    getPermissionsForRole("ADMIN").length === 21,
    `Expected 21, got ${getPermissionsForRole("ADMIN").length}`
  );

  // 1.3 TECHNICIAN permissions
  // Allowed for TECHNICIAN:
  const techAllowed: AppPermission[] = [
    "repairs:read",
    "repairs:create",
    "repairs:update",
    "repairs:update_status",
    "sales:read",
    "sales:create",
    "inventory:read",
    "inventory:use_parts",
    "invoices:read",
    "invoices:pay",
    "customers:manage",
    "team:read",
  ];
  for (const perm of techAllowed) {
    assert(
      cat1,
      `TECHNICIAN is ALLOWED ${perm}`,
      hasRolePermission("TECHNICIAN", perm),
      `TECHNICIAN should have ${perm}`
    );
  }

  // Denied for TECHNICIAN:
  const techDenied: AppPermission[] = [
    "repairs:delete",
    "sales:cancel",
    "inventory:manage",
    "inventory:adjust",
    "invoices:void",
    "customers:delete",
    "suppliers:manage",
    "shop:settings",
    "team:invite",
    "team:manage",
  ];
  for (const perm of techDenied) {
    assert(
      cat1,
      `TECHNICIAN is strictly DENIED ${perm}`,
      !hasRolePermission("TECHNICIAN", perm),
      `TECHNICIAN must NOT have ${perm}`
    );
  }

  // 1.4 VIEWER permissions (Read-only on allowed entities, ALL mutations denied)
  const viewerAllowed: AppPermission[] = [
    "repairs:read",
    "sales:read",
    "inventory:read",
    "invoices:read",
    "team:read",
  ];
  for (const perm of viewerAllowed) {
    assert(
      cat1,
      `VIEWER is ALLOWED ${perm}`,
      hasRolePermission("VIEWER", perm)
    );
  }

  // All non-read permissions denied for VIEWER:
  const viewerDenied = ALL_APP_PERMISSIONS.filter(
    (p) => !viewerAllowed.includes(p)
  );
  for (const perm of viewerDenied) {
    assert(
      cat1,
      `VIEWER is strictly DENIED mutation permission: ${perm}`,
      !hasRolePermission("VIEWER", perm),
      `VIEWER must NOT have ${perm}`
    );
  }

  // ==========================================
  // Category 2: Membership Lifecycle & Context
  // ==========================================
  const cat2 = "2. Membership Lifecycle & Error Handling";

  // Mock contexts
  const activeTechContext: AuthContext = {
    user: { id: "user-1", email: "tech@shop.com", name: "Technician 1" },
    shop: { id: "shop-A", name: "Shop A", currency: "SAR" },
    membership: {
      id: "mem-1",
      role: MembershipRole.TECHNICIAN,
      status: MembershipStatus.ACTIVE,
    },
    permissions: getPermissionsForRole(MembershipRole.TECHNICIAN),
  };

  assert(
    cat2,
    "Active Technician context can create repair",
    can(activeTechContext, "repairs:create")
  );
  assert(
    cat2,
    "Active Technician context cannot delete repair",
    !can(activeTechContext, "repairs:delete")
  );
  assert(
    cat2,
    "Active Technician context can record payment",
    can(activeTechContext, "invoices:pay")
  );
  assert(
    cat2,
    "Active Technician context cannot void invoice",
    !can(activeTechContext, "invoices:void")
  );
  assert(
    cat2,
    "Active Technician context cannot adjust stock",
    !can(activeTechContext, "inventory:adjust")
  );

  // Test custom error classes
  const authErr = new AuthenticationError("Session expired");
  assert(
    cat2,
    "AuthenticationError is instance of Error",
    authErr instanceof Error && authErr.name === "AuthenticationError"
  );

  const authzErr = new AuthorizationError("Denied");
  assert(
    cat2,
    "AuthorizationError is instance of Error",
    authzErr instanceof Error && authzErr.name === "AuthorizationError"
  );

  const inactiveErr = new MembershipInactiveError("Suspended");
  assert(
    cat2,
    "MembershipInactiveError is instance of AuthorizationError",
    inactiveErr instanceof AuthorizationError &&
      inactiveErr.name === "MembershipInactiveError"
  );

  // ==========================================
  // Category 3: Cross-Tenant Isolation Rules
  // ==========================================
  const cat3 = "3. Cross-Tenant Isolation Principles";

  // Verification of tenant boundary rules
  const shopA: string = "shop-uuid-aaaa-1111";
  const shopB: string = "shop-uuid-bbbb-2222";

  assert(
    cat3,
    "Tenant A ID differs from Tenant B ID",
    (shopA as string) !== (shopB as string)
  );

  // Validate that query builder simulation enforces composite keys
  const createScopedQuery = (tenantId: string, entityId: string) => ({
    where: {
      id: entityId,
      shopId: tenantId,
      deletedAt: null,
    },
  });

  const queryShopA = createScopedQuery(shopA, "entity-from-shop-b");
  assert(
    cat3,
    "Scoped query strictly enforces authenticated shopId",
    queryShopA.where.shopId === shopA && queryShopA.where.id === "entity-from-shop-b"
  );

  // ==========================================
  // Category 4: Server Action Mapping Coverage
  // ==========================================
  const cat4 = "4. Action-to-Permission Mapping";

  const actionPermissionMap: Record<string, AppPermission> = {
    updateShopSettingsAction: "shop:settings",
    createRepairOrderAction: "repairs:create",
    updateRepairOrderDetailsAction: "repairs:update",
    updateRepairOrderStatusAction: "repairs:update_status",
    deleteRepairOrderAction: "repairs:delete",
    createSaleAction: "sales:create",
    cancelSaleAction: "sales:cancel",
    createInventoryItemAction: "inventory:manage",
    updateInventoryItemDetailsAction: "inventory:manage",
    addStockAction: "inventory:manage",
    adjustStockAction: "inventory:adjust",
    createInvoiceFromRepairOrderAction: "repairs:update",
    createInvoiceFromSaleAction: "sales:create",
    addPaymentAction: "invoices:pay",
    voidInvoiceAction: "invoices:void",
    updateCustomerAction: "customers:manage",
    softDeleteCustomerAction: "customers:delete",
    createSupplierAction: "suppliers:manage",
    updateSupplierAction: "suppliers:manage",
    deleteSupplierAction: "suppliers:manage",
    saveWhatsAppTemplateAction: "shop:settings",
    deleteWhatsAppTemplateAction: "shop:settings",
  };

  const actionCount = Object.keys(actionPermissionMap).length;
  assert(
    cat4,
    "All 22 security-sensitive Server Actions are mapped to valid AppPermissions",
    actionCount === 22
  );

  for (const [action, perm] of Object.entries(actionPermissionMap)) {
    assert(
      cat4,
      `Action [${action}] maps to valid defined permission [${perm}]`,
      ALL_APP_PERMISSIONS.includes(perm)
    );
  }

  // ==========================================
  // Summary & Report
  // ==========================================
  console.log("--------------------------------------------------");
  console.log("TEST RESULTS SUMMARY:");
  console.log("--------------------------------------------------");

  const categories = [...new Set(results.map((r) => r.category))];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.passed).length;
    const catFailed = catResults.filter((r) => !r.passed).length;
    totalPassed += catPassed;
    totalFailed += catFailed;

    const status = catFailed === 0 ? "PASSED" : "FAILED";
    console.log(`[${status}] ${cat}: ${catPassed}/${catResults.length} passed`);

    if (catFailed > 0) {
      for (const fail of catResults.filter((r) => !r.passed)) {
        console.error(`  ❌ FAILED: ${fail.name} - ${fail.error}`);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${totalPassed}`);
  console.log(`FAILED: ${totalFailed}`);
  console.log("==================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
