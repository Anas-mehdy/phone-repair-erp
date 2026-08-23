import {
  InventoryMovementType,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  Prisma,
  PrismaClient,
  RepairStatus,
  SaleStatus,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

const todayAt = (hour: number, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
};

const daysFromNow = (days: number, hour = 10) => {
  const date = todayAt(hour);
  date.setDate(date.getDate() + days);
  return date;
};

const normalizePhone = (phone: string) => {
  const cleaned = phone.replace(/[^\d]/g, "");
  return cleaned.startsWith("00") ? cleaned.slice(2) : cleaned;
};

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

const statusLabels: Record<RepairStatus, string> = {
  PENDING: "قيد الانتظار",
  DIAGNOSING: "قيد التشخيص",
  REPAIRING: "قيد الإصلاح",
  WAITING_PARTS: "بانتظار القطع",
  DONE: "جاهز للتسليم",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

const statusPath = (status: RepairStatus) => {
  switch (status) {
    case RepairStatus.PENDING:
      return [RepairStatus.PENDING];
    case RepairStatus.DIAGNOSING:
      return [RepairStatus.PENDING, RepairStatus.DIAGNOSING];
    case RepairStatus.REPAIRING:
      return [RepairStatus.PENDING, RepairStatus.DIAGNOSING, RepairStatus.REPAIRING];
    case RepairStatus.WAITING_PARTS:
      return [RepairStatus.PENDING, RepairStatus.DIAGNOSING, RepairStatus.WAITING_PARTS];
    case RepairStatus.DONE:
      return [RepairStatus.PENDING, RepairStatus.DIAGNOSING, RepairStatus.REPAIRING, RepairStatus.DONE];
    case RepairStatus.DELIVERED:
      return [
        RepairStatus.PENDING,
        RepairStatus.DIAGNOSING,
        RepairStatus.REPAIRING,
        RepairStatus.DONE,
        RepairStatus.DELIVERED,
      ];
    case RepairStatus.CANCELLED:
      return [RepairStatus.PENDING, RepairStatus.CANCELLED];
  }
};

async function resetDemoDatabase() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.repairStatusHistory.deleteMany();
  await prisma.repairOrder.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shop.deleteMany();
}

async function main() {
  await resetDemoDatabase();

  const shop = await prisma.shop.create({
    data: {
      name: "مركز النخبة لصيانة الجوالات",
      phone: "+966 11 555 8899",
      address: "الرياض، حي العليا، شارع التحلية",
      currency: "SAR",
      taxNumber: "300052345600003",
      taxRate: 15,
    },
  });

  const owner = await prisma.user.create({
    data: {
      shopId: shop.id,
      email: process.env.SEED_OWNER_EMAIL ?? "owner@example.com",
      name: "عبدالله المالكي",
      passwordHash: "$2a$10$wN3M0K66HhL2ZcE6m6oG8e2u/v5aU2R4G3f/F4H4J5K6L7M8N9O0P", // hash of "password123"
      role: UserRole.OWNER,
    },
  });

  const customers = await prisma.$transaction(
    [
      ["أحمد العلي", "+966 50 111 2233", "يفضل التواصل عبر واتساب"],
      ["سارة محمد", "+966 50 222 3344", "عميلة متكررة"],
      ["خالد الحربي", "+966 50 333 4455", null],
      ["نورة القحطاني", "+966 50 444 5566", "استلام بعد الساعة 6 مساء"],
      ["ماجد السالم", "+966 50 555 6677", null],
      ["ريم الناصر", "+966 50 666 7788", "طلبت إشعار قبل التسليم"],
      ["يوسف الدوسري", "+966 50 777 8899", null],
    ].map(([name, phone, notes]) =>
      prisma.customer.create({
        data: {
          shopId: shop.id,
          name: name as string,
          phone: phone as string,
          phoneNormalized: normalizePhone(phone as string),
          notes: notes as string | null,
        },
      }),
    ),
  );

  const inventorySeeds = [
    ["شاشة iPhone 13", "شاشات", "SCR-IP13", 120, 220, 6, 3],
    ["شاشة Samsung A52", "شاشات", "SCR-SA52", 95, 180, 4, 3],
    ["بطارية iPhone 12", "بطاريات", "BAT-IP12", 55, 120, 8, 4],
    ["بطارية Samsung A32", "بطاريات", "BAT-SA32", 45, 100, 3, 4],
    ["مدخل شحن USB-C", "منافذ شحن", "PORT-USBC", 18, 55, 12, 5],
    ["مدخل شحن Lightning", "منافذ شحن", "PORT-LTN", 22, 65, 7, 5],
    ["شاحن سريع 20W", "إكسسوارات", "CHG-20W", 30, 75, 10, 6],
    ["كيبل Type-C", "إكسسوارات", "CBL-TC", 8, 25, 15, 8],
    ["سماعة داخلية iPhone", "سماعات", "SPK-IP-IN", 20, 60, 2, 3],
    ["زجاج حماية", "حماية", "GLASS-STD", 5, 20, 25, 10],
  ] as const;

  const inventory = new Map<
    string,
    {
      id: string;
      name: string;
      quantity: number;
      unitCost: number;
      unitPrice: number;
    }
  >();

  for (const [name, category, sku, unitCost, unitPrice, quantity, reorderLevel] of inventorySeeds) {
    const item = await prisma.inventoryItem.create({
      data: {
        shopId: shop.id,
        name,
        category,
        sku,
        description: `قطعة تجريبية: ${name}`,
        unitCost: money(unitCost),
        unitPrice: money(unitPrice),
        quantity,
        reorderLevel,
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        shopId: shop.id,
        inventoryItemId: item.id,
        createdByUserId: owner.id,
        type: InventoryMovementType.STOCK_IN,
        quantityChange: quantity,
        quantityAfter: quantity,
        unitCostSnapshot: money(unitCost),
        note: "رصيد افتتاحي",
      },
    });

    inventory.set(sku, {
      id: item.id,
      name,
      quantity,
      unitCost,
      unitPrice,
    });
  }

  const repairSeeds = [
    {
      ticketNumber: "RO-DEMO-0001",
      customerIndex: 0,
      status: RepairStatus.PENDING,
      deviceBrand: "Apple",
      deviceModel: "iPhone 13",
      reportedIssue: "الشاشة لا تعمل بعد سقوط الجهاز",
      estimatedTotal: 220,
      dueAt: daysFromNow(1, 17),
    },
    {
      ticketNumber: "RO-DEMO-0002",
      customerIndex: 1,
      status: RepairStatus.DIAGNOSING,
      deviceBrand: "Samsung",
      deviceModel: "Galaxy A52",
      reportedIssue: "الجهاز لا يشحن",
      estimatedTotal: 90,
      dueAt: daysFromNow(2, 16),
      diagnosis: "يتم فحص مدخل الشحن والبطارية",
    },
    {
      ticketNumber: "RO-DEMO-0003",
      customerIndex: 2,
      status: RepairStatus.REPAIRING,
      deviceBrand: "Apple",
      deviceModel: "iPhone 12",
      reportedIssue: "البطارية تفرغ بسرعة",
      estimatedTotal: 120,
      finalTotal: 120,
      dueAt: daysFromNow(1, 18),
      diagnosis: "البطارية تحتاج إلى تبديل",
    },
    {
      ticketNumber: "RO-DEMO-0004",
      customerIndex: 3,
      status: RepairStatus.WAITING_PARTS,
      deviceBrand: "Samsung",
      deviceModel: "Galaxy A32",
      reportedIssue: "كسر في الشاشة",
      estimatedTotal: 180,
      dueAt: daysFromNow(4, 15),
      diagnosis: "بانتظار شاشة متوافقة",
    },
    {
      ticketNumber: "RO-DEMO-0005",
      customerIndex: 4,
      status: RepairStatus.DONE,
      deviceBrand: "Apple",
      deviceModel: "iPhone 11",
      reportedIssue: "مدخل الشحن لا يعمل",
      estimatedTotal: 95,
      finalTotal: 95,
      dueAt: todayAt(18),
      completedAt: todayAt(11),
      diagnosis: "تلف في مدخل الشحن",
      resolutionNotes: "تم تبديل مدخل الشحن واختبار الجهاز",
    },
    {
      ticketNumber: "RO-DEMO-0006",
      customerIndex: 5,
      status: RepairStatus.DELIVERED,
      deviceBrand: "Apple",
      deviceModel: "iPhone 14",
      reportedIssue: "تركيب زجاج حماية وتنظيف سماعة",
      estimatedTotal: 50,
      finalTotal: 50,
      dueAt: daysFromNow(-1, 18),
      completedAt: daysFromNow(-1, 14),
      deliveredAt: todayAt(13),
      resolutionNotes: "تم التسليم للعميلة",
    },
    {
      ticketNumber: "RO-DEMO-0007",
      customerIndex: 6,
      status: RepairStatus.CANCELLED,
      deviceBrand: "Huawei",
      deviceModel: "Nova 7i",
      reportedIssue: "الجهاز لا يفتح",
      estimatedTotal: 0,
      resolutionNotes: "العميل ألغى الطلب قبل التشخيص",
    },
    {
      ticketNumber: "RO-DEMO-0008",
      customerIndex: 1,
      status: RepairStatus.DONE,
      deviceBrand: "Samsung",
      deviceModel: "Galaxy S21",
      reportedIssue: "تبديل بطارية",
      estimatedTotal: 110,
      finalTotal: 110,
      dueAt: todayAt(17),
      completedAt: todayAt(15),
      resolutionNotes: "تم تبديل البطارية",
    },
    {
      ticketNumber: "RO-DEMO-0009",
      customerIndex: 0,
      status: RepairStatus.REPAIRING,
      deviceBrand: "Apple",
      deviceModel: "iPad Air",
      reportedIssue: "صوت السماعة ضعيف",
      estimatedTotal: 160,
      dueAt: daysFromNow(3, 16),
      diagnosis: "السماعة الداخلية تحتاج تنظيف أو تبديل",
    },
    {
      ticketNumber: "RO-DEMO-0010",
      customerIndex: 3,
      status: RepairStatus.DIAGNOSING,
      deviceBrand: "Xiaomi",
      deviceModel: "Redmi Note 11",
      reportedIssue: "الجهاز يعيد التشغيل",
      estimatedTotal: 80,
      dueAt: daysFromNow(2, 13),
      diagnosis: "فحص برمجي وفحص بطارية",
    },
  ];

  const repairOrders = [];
  for (const seed of repairSeeds) {
    const repairOrder = await prisma.repairOrder.create({
      data: {
        shopId: shop.id,
        customerId: customers[seed.customerIndex].id,
        createdByUserId: owner.id,
        ticketNumber: seed.ticketNumber,
        status: seed.status,
        deviceBrand: seed.deviceBrand,
        deviceModel: seed.deviceModel,
        reportedIssue: seed.reportedIssue,
        diagnosis: seed.diagnosis,
        resolutionNotes: seed.resolutionNotes,
        estimatedTotal: money(seed.estimatedTotal),
        finalTotal: seed.finalTotal === undefined ? undefined : money(seed.finalTotal),
        dueAt: seed.dueAt,
        completedAt: seed.completedAt,
        deliveredAt: seed.deliveredAt,
        createdAt:
          seed.status === RepairStatus.DELIVERED ||
          seed.status === RepairStatus.CANCELLED
            ? daysFromNow(-2, 10)
            : todayAt(9),
      },
    });

    const path = statusPath(seed.status);
    for (let index = 0; index < path.length; index += 1) {
      await prisma.repairStatusHistory.create({
        data: {
          shopId: shop.id,
          repairOrderId: repairOrder.id,
          createdByUserId: owner.id,
          fromStatus: index === 0 ? null : path[index - 1],
          toStatus: path[index],
          note:
            index === 0
              ? "تم إنشاء طلب الصيانة"
              : `تغيير الحالة إلى ${statusLabels[path[index]]}`,
          createdAt: daysFromNow(-3 + index, 9 + index),
        },
      });
    }

    repairOrders.push(repairOrder);
  }

  async function createSale(input: {
    receiptNumber: string;
    customerIndex?: number;
    soldAt: Date;
    items: Array<{
      sku?: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discountTotal?: number;
    }>;
  }) {
    const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountTotal = input.items.reduce((sum, item) => sum + (item.discountTotal ?? 0), 0);
    const total = subtotal - discountTotal;

    const sale = await prisma.sale.create({
      data: {
        shopId: shop.id,
        customerId:
          input.customerIndex === undefined ? undefined : customers[input.customerIndex].id,
        createdByUserId: owner.id,
        receiptNumber: input.receiptNumber,
        status: SaleStatus.COMPLETED,
        subtotal: money(subtotal),
        discountTotal: money(discountTotal),
        taxTotal: money(0),
        total: money(total),
        soldAt: input.soldAt,
      },
    });

    for (const itemInput of input.items) {
      const inventoryItem = itemInput.sku ? inventory.get(itemInput.sku) : null;
      const lineTotal =
        itemInput.quantity * itemInput.unitPrice - (itemInput.discountTotal ?? 0);

      if (inventoryItem && inventoryItem.quantity < itemInput.quantity) {
        throw new Error(`Not enough demo inventory for ${inventoryItem.name}`);
      }

      const saleItem = await prisma.saleItem.create({
        data: {
          shopId: shop.id,
          saleId: sale.id,
          inventoryItemId: inventoryItem?.id,
          description: itemInput.description ?? inventoryItem?.name ?? "بند يدوي",
          quantity: itemInput.quantity,
          unitPriceSnapshot: money(itemInput.unitPrice),
          discountTotal: money(itemInput.discountTotal ?? 0),
          lineTotal: money(lineTotal),
        },
      });

      if (inventoryItem) {
        inventoryItem.quantity -= itemInput.quantity;

        await prisma.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: inventoryItem.quantity },
        });

        await prisma.inventoryMovement.create({
          data: {
            shopId: shop.id,
            inventoryItemId: inventoryItem.id,
            saleId: sale.id,
            saleItemId: saleItem.id,
            createdByUserId: owner.id,
            type: InventoryMovementType.SALE,
            quantityChange: -itemInput.quantity,
            quantityAfter: inventoryItem.quantity,
            note: "بيع",
          },
        });
      }
    }

    return sale;
  }

  const sales = [];
  sales.push(
    await createSale({
      receiptNumber: "SALE-DEMO-0001",
      customerIndex: 0,
      soldAt: todayAt(10, 30),
      items: [
        { sku: "GLASS-STD", quantity: 2, unitPrice: 20 },
        { sku: "CHG-20W", quantity: 1, unitPrice: 75 },
        { description: "تركيب زجاج حماية", quantity: 1, unitPrice: 15 },
      ],
    }),
  );
  sales.push(
    await createSale({
      receiptNumber: "SALE-DEMO-0002",
      soldAt: todayAt(12, 15),
      items: [
        { sku: "CBL-TC", quantity: 2, unitPrice: 25 },
        { description: "خدمة تنظيف منفذ الشحن", quantity: 1, unitPrice: 30 },
      ],
    }),
  );
  sales.push(
    await createSale({
      receiptNumber: "SALE-DEMO-0003",
      customerIndex: 3,
      soldAt: daysFromNow(-1, 16),
      items: [
        { sku: "BAT-IP12", quantity: 1, unitPrice: 120 },
        { description: "أجرة تركيب بطارية", quantity: 1, unitPrice: 40 },
      ],
    }),
  );
  sales.push(
    await createSale({
      receiptNumber: "SALE-DEMO-0004",
      customerIndex: 4,
      soldAt: todayAt(15, 40),
      items: [
        { sku: "PORT-USBC", quantity: 1, unitPrice: 55 },
        { description: "أجرة صيانة منفذ الشحن", quantity: 1, unitPrice: 60 },
      ],
    }),
  );
  sales.push(
    await createSale({
      receiptNumber: "SALE-DEMO-0005",
      soldAt: daysFromNow(-2, 18),
      items: [
        { sku: "GLASS-STD", quantity: 1, unitPrice: 20 },
        { sku: "SPK-IP-IN", quantity: 1, unitPrice: 60 },
      ],
    }),
  );

  async function createInvoice(input: {
    invoiceNumber: string;
    type: InvoiceType;
    customerId?: string | null;
    repairOrderId?: string;
    saleId?: string;
    subtotal: number;
    discountTotal?: number;
    taxTotal?: number;
    issuedAt: Date;
    dueAt?: Date;
    payments?: Array<{
      amount: number;
      method: PaymentMethod;
      paidAt: Date;
      reference?: string;
      note?: string;
    }>;
  }) {
    const discountTotal = input.discountTotal ?? 0;
    const taxTotal = input.taxTotal ?? 0;
    const total = input.subtotal - discountTotal + taxTotal;
    const payments = input.payments ?? [];
    const amountPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balanceDue = Math.max(total - amountPaid, 0);
    const status =
      amountPaid <= 0
        ? InvoiceStatus.UNPAID
        : balanceDue <= 0
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

    const invoice = await prisma.invoice.create({
      data: {
        shopId: shop.id,
        customerId: input.customerId,
        repairOrderId: input.repairOrderId,
        saleId: input.saleId,
        createdByUserId: owner.id,
        invoiceNumber: input.invoiceNumber,
        type: input.type,
        status,
        subtotal: money(input.subtotal),
        discountTotal: money(discountTotal),
        taxTotal: money(taxTotal),
        total: money(total),
        amountPaid: money(amountPaid),
        balanceDue: money(balanceDue),
        issuedAt: input.issuedAt,
        dueAt: input.dueAt,
        paidAt: status === InvoiceStatus.PAID ? payments.at(-1)?.paidAt : null,
      },
    });

    for (const payment of payments) {
      await prisma.payment.create({
        data: {
          shopId: shop.id,
          invoiceId: invoice.id,
          createdByUserId: owner.id,
          method: payment.method,
          amount: money(payment.amount),
          reference: payment.reference,
          note: payment.note,
          paidAt: payment.paidAt,
        },
      });
    }

    return invoice;
  }

  await Promise.all([
    createInvoice({
      invoiceNumber: "INV-DEMO-0001",
      type: InvoiceType.REPAIR,
      customerId: repairOrders[4].customerId,
      repairOrderId: repairOrders[4].id,
      subtotal: 95,
      issuedAt: todayAt(11, 20),
      dueAt: todayAt(19),
      payments: [
        {
          amount: 95,
          method: PaymentMethod.CASH,
          paidAt: todayAt(11, 30),
          note: "سداد كامل عند الاستلام",
        },
      ],
    }),
    createInvoice({
      invoiceNumber: "INV-DEMO-0002",
      type: InvoiceType.REPAIR,
      customerId: repairOrders[7].customerId,
      repairOrderId: repairOrders[7].id,
      subtotal: 110,
      issuedAt: todayAt(15, 10),
      dueAt: daysFromNow(2, 18),
      payments: [
        {
          amount: 50,
          method: PaymentMethod.CARD,
          paidAt: todayAt(15, 20),
          reference: "CARD-9821",
          note: "دفعة مقدمة",
        },
      ],
    }),
    createInvoice({
      invoiceNumber: "INV-DEMO-0003",
      type: InvoiceType.REPAIR,
      customerId: repairOrders[3].customerId,
      repairOrderId: repairOrders[3].id,
      subtotal: 180,
      issuedAt: todayAt(9, 45),
      dueAt: daysFromNow(4, 18),
    }),
    createInvoice({
      invoiceNumber: "INV-DEMO-0004",
      type: InvoiceType.SALE,
      customerId: sales[0].customerId,
      saleId: sales[0].id,
      subtotal: 130,
      issuedAt: todayAt(10, 45),
      payments: [
        {
          amount: 130,
          method: PaymentMethod.CASH,
          paidAt: todayAt(10, 50),
          note: "سداد كامل",
        },
      ],
    }),
    createInvoice({
      invoiceNumber: "INV-DEMO-0005",
      type: InvoiceType.SALE,
      customerId: sales[2].customerId,
      saleId: sales[2].id,
      subtotal: 160,
      issuedAt: daysFromNow(-1, 16),
      dueAt: daysFromNow(3, 18),
      payments: [
        {
          amount: 80,
          method: PaymentMethod.BANK_TRANSFER,
          paidAt: daysFromNow(-1, 17),
          reference: "TRX-2044",
          note: "دفعة جزئية",
        },
      ],
    }),
    createInvoice({
      invoiceNumber: "INV-DEMO-0006",
      type: InvoiceType.SALE,
      customerId: sales[3].customerId,
      saleId: sales[3].id,
      subtotal: 115,
      issuedAt: todayAt(16),
      dueAt: daysFromNow(2, 18),
    }),
  ]);

  console.log("Demo seed completed.");
  console.log(`Shop: ${shop.name}`);
  console.log(`Customers: ${customers.length}`);
  console.log(`Inventory items: ${inventorySeeds.length}`);
  console.log(`Repair orders: ${repairOrders.length}`);
  console.log(`Sales: ${sales.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
