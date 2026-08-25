import { PrismaClient, MembershipRole, MembershipStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function runMembershipMigration() {
  console.log("==================================================");
  console.log("🚀 Starting Safe Data Migration: Users -> Memberships");
  console.log("==================================================");

  // 1. Fetch all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      shopId: true,
      role: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  console.log(`📊 Found ${users.length} total user(s) in database.`);

  let createdCount = 0;
  let skippedCount = 0;
  let orphanCount = 0;

  for (const user of users) {
    if (!user.shopId) {
      console.warn(`⚠️ User [${user.email}] (${user.id}) has NO legacy shopId. Skipping direct migration.`);
      orphanCount++;
      continue;
    }

    // Check if membership already exists for (shopId, userId)
    const existingMembership = await prisma.membership.findUnique({
      where: {
        shopId_userId: {
          shopId: user.shopId,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      skippedCount++;
      continue;
    }

    // Map legacy UserRole to MembershipRole
    const membershipRole: MembershipRole =
      user.role === "OWNER" ? MembershipRole.OWNER : MembershipRole.TECHNICIAN;

    await prisma.membership.create({
      data: {
        shopId: user.shopId,
        userId: user.id,
        role: membershipRole,
        status: user.deletedAt ? MembershipStatus.REMOVED : MembershipStatus.ACTIVE,
        joinedAt: user.createdAt,
      },
    });

    createdCount++;
    console.log(`✅ Created Membership for [${user.email}] -> Shop [${user.shopId}] as ${membershipRole}`);
  }

  // 2. Verification of Shop Ownership
  const shops = await prisma.shop.findMany({
    select: {
      id: true,
      name: true,
      memberships: {
        where: { role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE },
        select: { userId: true },
      },
    },
  });

  let shopsWithoutOwner = 0;
  for (const shop of shops) {
    if (shop.memberships.length === 0) {
      console.error(`❌ Shop [${shop.name}] (${shop.id}) has NO Active OWNER membership!`);
      shopsWithoutOwner++;
    }
  }

  console.log("\n==================================================");
  console.log("📈 Migration Summary:");
  console.log(`- Total Users: ${users.length}`);
  console.log(`- New Memberships Created: ${createdCount}`);
  console.log(`- Existing Memberships Skipped: ${skippedCount}`);
  console.log(`- Orphan Users without Shop: ${orphanCount}`);
  console.log(`- Total Shops Verified: ${shops.length}`);
  console.log(`- Shops without Owner: ${shopsWithoutOwner}`);
  console.log("==================================================");

  if (shopsWithoutOwner > 0) {
    throw new Error(`Migration completed with warnings: ${shopsWithoutOwner} shop(s) lack an OWNER.`);
  }

  console.log("🎉 Membership Data Migration completed successfully!");
}

if (require.main === module) {
  runMembershipMigration()
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
