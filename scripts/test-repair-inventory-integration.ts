import { prisma } from "../lib/prisma";
import { repairOrderService } from "../lib/services/repairOrderService";
import { RepairStatus } from "@prisma/client";

async function runTests() {
  console.log("==================================================");
  console.log("TESTING REPAIR ORDER & INVENTORY INTEGRATION");
  console.log("==================================================");

  // 1. Setup temporary Shop, Owner, Customer, and Inventory Items
  const shop = await prisma.shop.create({
    data: {
      name: "Test Repair Shop - " + Date.now(),
      currency: "SAR",
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `tech-${Date.now()}@example.com`,
      name: "Test Technician",
      shopId: shop.id,
      role: "OWNER",
    },
  });

  // Create test inventory items
  const itemA = await prisma.inventoryItem.create({
    data: {
      shopId: shop.id,
      name: "iPhone 13 Screen OLED Original",
      sku: "SCR-IP13-OLED",
      unitCost: 150.0,
      unitPrice: 350.0,
      quantity: 10,
    },
  });

  const itemB = await prisma.inventoryItem.create({
    data: {
      shopId: shop.id,
      name: "iPhone 13 Battery 3227mAh",
      sku: "BAT-IP13-ORIG",
      unitCost: 80.0,
      unitPrice: 200.0,
      quantity: 5,
    },
  });

  const itemLimited = await prisma.inventoryItem.create({
    data: {
      shopId: shop.id,
      name: "Rare Camera Lens",
      sku: "CAM-RARE-01",
      unitCost: 200.0,
      unitPrice: 500.0,
      quantity: 1, // Only 1 in stock for concurrency test
    },
  });

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASSED] ${testName}`);
      testsPassed++;
    } else {
      console.error(`[FAILED] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // TEST 1: Create Repair Order with Internal Part
    console.log("\n--- TEST 1: Internal Part Deduction ---");
    const order1 = await repairOrderService.createRepairOrder(shop.id, user.id, {
      customerName: "Ahmed Ali",
      customerPhone: "0501234567",
      reportedIssue: "Broken screen",
      items: [
        {
          inventoryItemId: itemA.id,
          partName: itemA.name,
          quantity: 2,
          unitPrice: "350",
        },
      ],
    });

    const itemAAfterTest1 = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemA.id } });
    assert(itemAAfterTest1.quantity === 8, "Item A stock deducted from 10 to 8 (qty 2)");

    const movements1 = await prisma.inventoryMovement.findMany({
      where: { repairOrderId: order1.id },
    });
    assert(movements1.length === 1, "Exactly 1 inventory movement created");
    assert(movements1[0].type === "REPAIR_USAGE", "Movement type is REPAIR_USAGE");
    assert(movements1[0].quantityChange === -2, "Movement quantityChange is -2");
    assert(Number(movements1[0].unitCostSnapshot) === 150, "Snapshot unit cost is 150 from DB");

    // TEST 2: Add External Supplier Part (no inventory deduction)
    console.log("\n--- TEST 2: External Part Addition ---");
    const order2 = await repairOrderService.createRepairOrder(shop.id, user.id, {
      customerName: "Saleh Omar",
      customerPhone: "0559876543",
      reportedIssue: "Housing replacement",
      items: [
        {
          inventoryItemId: null,
          supplierName: "Apex Spare Parts",
          partName: "Custom Red Housing",
          quantity: 1,
          unitCost: "90",
          unitPrice: "180",
        },
      ],
    });

    const order2Full = await repairOrderService.getRepairOrderById(shop.id, order2.id);
    assert(order2Full?.items.length === 1, "Order 2 has 1 item");
    assert(order2Full?.items[0].supplierName === "Apex Spare Parts", "External supplier name saved");
    assert(order2Full?.inventoryMovements.length === 0, "No inventory movement for external part");

    // TEST 3: Delta Quantity Update (Increase: 2 -> 3)
    console.log("\n--- TEST 3: Delta Quantity Increase ---");
    const order1Item = (await repairOrderService.getRepairOrderById(shop.id, order1.id))!.items[0];
    await repairOrderService.updateRepairOrderDetails(shop.id, order1.id, user.id, {
      items: [
        {
          id: order1Item.id,
          inventoryItemId: itemA.id,
          partName: itemA.name,
          quantity: 3, // Increased by 1
        },
      ],
    });

    const itemAAfterTest3 = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemA.id } });
    assert(itemAAfterTest3.quantity === 7, "Stock deducted from 8 to 7 for delta +1");

    // TEST 4: Delta Quantity Update (Decrease: 3 -> 1)
    console.log("\n--- TEST 4: Delta Quantity Decrease ---");
    await repairOrderService.updateRepairOrderDetails(shop.id, order1.id, user.id, {
      items: [
        {
          id: order1Item.id,
          inventoryItemId: itemA.id,
          partName: itemA.name,
          quantity: 1, // Decreased by 2
        },
      ],
    });

    const itemAAfterTest4 = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemA.id } });
    assert(itemAAfterTest4.quantity === 9, "Stock returned from 7 to 9 for delta -2");

    const returnMovements = await prisma.inventoryMovement.findMany({
      where: { repairOrderId: order1.id, type: "REPAIR_RETURN" },
    });
    assert(returnMovements.length === 1, "REPAIR_RETURN movement created for return");
    assert(returnMovements[0].quantityChange === 2, "REPAIR_RETURN movement quantityChange is +2");

    // TEST 5: Item Substitution (Change Item A -> Item B)
    console.log("\n--- TEST 5: Item Replacement (Item A -> Item B) ---");
    await repairOrderService.updateRepairOrderDetails(shop.id, order1.id, user.id, {
      items: [
        {
          id: order1Item.id,
          inventoryItemId: itemB.id,
          partName: itemB.name,
          quantity: 1,
        },
      ],
    });

    const itemAAfterTest5 = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemA.id } });
    const itemBAfterTest5 = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemB.id } });
    assert(itemAAfterTest5.quantity === 10, "Old Item A fully restored back to 10");
    assert(itemBAfterTest5.quantity === 4, "New Item B deducted from 5 to 4");

    // TEST 6: Status CANCELLED restores parts
    console.log("\n--- TEST 6: Order Cancellation Restores Stock ---");
    await repairOrderService.updateRepairOrderStatus(shop.id, order1.id, user.id, {
      status: RepairStatus.CANCELLED,
      note: "Customer cancelled",
    });

    const itemBAfterCancel = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemB.id } });
    assert(itemBAfterCancel.quantity === 5, "Item B stock restored back to 5 on cancellation");

    // TEST 7: Double Cancellation Prevention (No Double Restore)
    console.log("\n--- TEST 7: Double Cancellation Prevention ---");
    await repairOrderService.updateRepairOrderStatus(shop.id, order1.id, user.id, {
      status: RepairStatus.CANCELLED,
      note: "Repeated cancellation attempt",
    });

    const itemBAfterDoubleCancel = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemB.id } });
    assert(itemBAfterDoubleCancel.quantity === 5, "Stock remains 5 and was NOT double-restored");

    // TEST 8: Modify Items on CANCELLED ticket blocked
    console.log("\n--- TEST 8: Modification on CANCELLED Ticket Blocked ---");
    let cancelModifyErrorCaught = false;
    try {
      await repairOrderService.updateRepairOrderDetails(shop.id, order1.id, user.id, {
        items: [
          {
            inventoryItemId: itemA.id,
            partName: itemA.name,
            quantity: 1,
          },
        ],
      });
    } catch (err: any) {
      cancelModifyErrorCaught = true;
      assert(err.message.includes("ملغاة"), "Error thrown when trying to modify items on cancelled order");
    }
    assert(cancelModifyErrorCaught, "Modifying cancelled order was blocked");

    // TEST 9: Delete Repair Order Restores Stock
    console.log("\n--- TEST 9: Order Deletion Restores Stock ---");
    const order3 = await repairOrderService.createRepairOrder(shop.id, user.id, {
      customerName: "Tariq",
      customerPhone: "0511112233",
      reportedIssue: "Battery drain",
      items: [
        {
          inventoryItemId: itemB.id,
          partName: itemB.name,
          quantity: 2,
        },
      ],
    });

    const itemBBeforeDelete = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemB.id } });
    assert(itemBBeforeDelete.quantity === 3, "Item B stock at 3 before deletion");

    await repairOrderService.deleteRepairOrder(shop.id, order3.id, user.id);

    const itemBAfterDelete = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemB.id } });
    assert(itemBAfterDelete.quantity === 5, "Item B stock fully restored to 5 after order deletion");

    // TEST 10: Insufficient Stock Atomic Rollback
    console.log("\n--- TEST 10: Insufficient Stock Atomic Rollback ---");
    let insufficientErrorCaught = false;
    try {
      await repairOrderService.createRepairOrder(shop.id, user.id, {
        customerName: "Greedy Customer",
        customerPhone: "0599999999",
        reportedIssue: "Wants 100 items",
        items: [
          {
            inventoryItemId: itemA.id,
            partName: itemA.name,
            quantity: 100, // Available is only 10
          },
        ],
      });
    } catch (err: any) {
      insufficientErrorCaught = true;
      assert(err.message.includes("غير كافية"), "Clear error message for insufficient stock");
    }
    assert(insufficientErrorCaught, "Insufficient stock order was aborted");
    const itemAAfterFailed = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemA.id } });
    assert(itemAAfterFailed.quantity === 10, "Stock untouched after rollback");

    // TEST 11: Concurrent Race Condition on Last Remaining Item
    console.log("\n--- TEST 11: Concurrent Race Condition on Last Item ---");
    // itemLimited has quantity = 1. Launch 2 simultaneous orders wanting quantity = 1.
    const promises = [
      repairOrderService.createRepairOrder(shop.id, user.id, {
        customerName: "Buyer 1",
        customerPhone: "0500000001",
        reportedIssue: "Need lens",
        items: [{ inventoryItemId: itemLimited.id, partName: itemLimited.name, quantity: 1 }],
      }),
      repairOrderService.createRepairOrder(shop.id, user.id, {
        customerName: "Buyer 2",
        customerPhone: "0500000002",
        reportedIssue: "Need lens too",
        items: [{ inventoryItemId: itemLimited.id, partName: itemLimited.name, quantity: 1 }],
      }),
    ];

    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert(fulfilled.length === 1, "Exactly 1 concurrent order succeeded");
    assert(rejected.length === 1, "Exactly 1 concurrent order was rejected due to lack of stock");

    const itemLimitedFinal = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemLimited.id } });
    assert(itemLimitedFinal.quantity === 0, "Final quantity of limited item is 0 (never negative)");

    // TEST 12: Backend Authority on UnitCost
    console.log("\n--- TEST 12: Backend Authority on UnitCost ---");
    const orderSneaky = await repairOrderService.createRepairOrder(shop.id, user.id, {
      customerName: "Sneaky User",
      customerPhone: "0577777777",
      reportedIssue: "Check cost spoofing",
      items: [
        {
          inventoryItemId: itemA.id,
          partName: itemA.name,
          quantity: 1,
          unitCost: "0.01", // Fake cost sent by frontend
        },
      ],
    });

    const orderSneakyDetails = await repairOrderService.getRepairOrderById(shop.id, orderSneaky.id);
    assert(
      Number(orderSneakyDetails!.items[0].unitCost) === 150,
      "Backend strictly enforced DB unitCost (150) and ignored fake frontend unitCost (0.01)",
    );

    console.log("\n==================================================");
    console.log(`ALL INTEGRATION TESTS PASSED: ${testsPassed}/${totalTests}`);
    console.log("==================================================");
  } finally {
    // Cleanup test shop
    await prisma.inventoryMovement.deleteMany({ where: { shopId: shop.id } });
    await prisma.repairOrderItem.deleteMany({ where: { shopId: shop.id } });
    await prisma.repairStatusHistory.deleteMany({ where: { shopId: shop.id } });
    await prisma.repairOrder.deleteMany({ where: { shopId: shop.id } });
    await prisma.inventoryItem.deleteMany({ where: { shopId: shop.id } });
    await prisma.supplier.deleteMany({ where: { shopId: shop.id } });
    await prisma.user.deleteMany({ where: { shopId: shop.id } });
    await prisma.shop.delete({ where: { id: shop.id } });
  }
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
