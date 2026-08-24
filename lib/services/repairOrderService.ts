import { InvoiceStatus, Prisma, RepairStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const repairOrderInclude = {
  customer: true,
  supplier: true,
  statusHistory: {
    orderBy: {
      createdAt: "asc",
    },
  },
  invoices: {
    where: {
      deletedAt: null,
      status: {
        not: InvoiceStatus.VOID,
      },
    },
    orderBy: {
      issuedAt: "desc",
    },
  },
} satisfies Prisma.RepairOrderInclude;

export type RepairOrderListFilters = {
  status?: RepairStatus | "ALL";
  search?: string;
};

export type CreateRepairOrderInput = {
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerial?: string;
  reportedIssue: string;
  estimatedTotal?: string;
  dueAt?: string;
  notes?: string;
  supplierId?: string;
  supplierName?: string;
  partName?: string;
  partCost?: string;
  deductPartCost?: boolean;
  supplierNotes?: string;
};

export type UpdateRepairOrderDetailsInput = {
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerial?: string;
  reportedIssue?: string;
  diagnosis?: string;
  resolutionNotes?: string;
  estimatedTotal?: string;
  finalTotal?: string;
  dueAt?: string;
  supplierId?: string;
  supplierName?: string;
  partName?: string;
  partCost?: string;
  deductPartCost?: boolean;
  supplierNotes?: string;
};

export type UpdateRepairOrderStatusInput = {
  status: RepairStatus;
  note?: string;
};

export function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  return hasPlus ? `+${digits}` : digits;
}

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function decimalOrNull(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(",", ".");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Prisma.Decimal(parsed);
}

function dateOrNull(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function findOrCreateCustomerForRepair(
  shopId: string,
  input: Pick<CreateRepairOrderInput, "customerName" | "customerPhone" | "customerNotes">,
) {
  const phone = input.customerPhone.trim();
  const phoneNormalized = normalizePhone(phone);

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      shopId,
      deletedAt: null,
      OR: [
        ...(phoneNormalized ? [{ phoneNormalized }] : []),
        { phone },
      ],
    },
  });

  if (existingCustomer) {
    return existingCustomer;
  }

  return prisma.customer.create({
    data: {
      shopId,
      name: input.customerName.trim(),
      phone,
      phoneNormalized,
      notes: emptyToNull(input.customerNotes),
    },
  });
}

export async function generateTicketNumber(shopId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `RO-${year}${month}-`;

  const count = await prisma.repairOrder.count({
    where: {
      shopId,
      ticketNumber: {
        startsWith: prefix,
      },
    },
  });

  for (let offset = 1; offset <= 50; offset += 1) {
    const ticketNumber = `${prefix}${String(count + offset).padStart(4, "0")}`;
    const existing = await prisma.repairOrder.findUnique({
      where: {
        shopId_ticketNumber: {
          shopId,
          ticketNumber,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return ticketNumber;
    }
  }

  return `${prefix}${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function listRepairOrders(
  shopId: string,
  filters: RepairOrderListFilters = {},
) {
  const search = filters.search?.trim();
  const status =
    filters.status && filters.status !== "ALL" ? filters.status : undefined;

  return prisma.repairOrder.findMany({
    where: {
      shopId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search, mode: "insensitive" } },
              { deviceModel: { contains: search, mode: "insensitive" } },
              { reportedIssue: { contains: search, mode: "insensitive" } },
              { supplierName: { contains: search, mode: "insensitive" } },
              { partName: { contains: search, mode: "insensitive" } },
              {
                customer: {
                  is: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { phone: { contains: search, mode: "insensitive" } },
                      {
                        phoneNormalized: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      customer: true,
      supplier: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getRepairOrderById(shopId: string, repairOrderId: string) {
  return prisma.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      shopId,
      deletedAt: null,
    },
    include: repairOrderInclude,
  });
}

export async function createRepairOrder(
  shopId: string,
  createdByUserId: string | null,
  input: CreateRepairOrderInput,
) {
  const customer = await findOrCreateCustomerForRepair(shopId, input);
  const ticketNumber = await generateTicketNumber(shopId);

  let supplierId = input.supplierId ? input.supplierId.trim() : null;
  let supplierName = input.supplierName ? input.supplierName.trim() : null;

  if (supplierName && !supplierId) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        shopId,
        deletedAt: null,
        name: { equals: supplierName, mode: "insensitive" },
      },
    });
    if (existingSupplier) {
      supplierId = existingSupplier.id;
      supplierName = existingSupplier.name;
    } else {
      const newSupplier = await prisma.supplier.create({
        data: {
          shopId,
          name: supplierName,
        },
      });
      supplierId = newSupplier.id;
    }
  } else if (supplierId && !supplierName) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: { id: supplierId, shopId, deletedAt: null },
      select: { name: true },
    });
    if (existingSupplier) {
      supplierName = existingSupplier.name;
    }
  }

  return prisma.$transaction(async (tx) => {
    const repairOrder = await tx.repairOrder.create({
      data: {
        shopId,
        customerId: customer.id,
        createdByUserId,
        ticketNumber,
        status: RepairStatus.PENDING,
        deviceBrand: emptyToNull(input.deviceBrand),
        deviceModel: emptyToNull(input.deviceModel),
        deviceSerial: emptyToNull(input.deviceSerial),
        reportedIssue: input.reportedIssue.trim(),
        resolutionNotes: emptyToNull(input.notes),
        estimatedTotal: decimalOrNull(input.estimatedTotal),
        supplierId: supplierId || null,
        supplierName: supplierName || null,
        partName: emptyToNull(input.partName),
        partCost: decimalOrNull(input.partCost),
        deductPartCost: input.deductPartCost ?? true,
        supplierNotes: emptyToNull(input.supplierNotes),
        dueAt: dateOrNull(input.dueAt),
      },
    });

    await tx.repairStatusHistory.create({
      data: {
        shopId,
        repairOrderId: repairOrder.id,
        createdByUserId,
        fromStatus: null,
        toStatus: RepairStatus.PENDING,
        note: "تم إنشاء طلب الصيانة",
      },
    });

    return repairOrder;
  });
}

export async function updateRepairOrderDetails(
  shopId: string,
  repairOrderId: string,
  input: UpdateRepairOrderDetailsInput,
) {
  const existing = await prisma.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      shopId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error("طلب الصيانة غير موجود.");
  }

  let supplierId = input.supplierId !== undefined ? (input.supplierId ? input.supplierId.trim() : null) : undefined;
  let supplierName = input.supplierName !== undefined ? (input.supplierName ? input.supplierName.trim() : null) : undefined;

  if (supplierName && !supplierId) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        shopId,
        deletedAt: null,
        name: { equals: supplierName, mode: "insensitive" },
      },
    });
    if (existingSupplier) {
      supplierId = existingSupplier.id;
      supplierName = existingSupplier.name;
    } else {
      const newSupplier = await prisma.supplier.create({
        data: {
          shopId,
          name: supplierName,
        },
      });
      supplierId = newSupplier.id;
    }
  } else if (supplierId && supplierName === undefined) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: { id: supplierId, shopId, deletedAt: null },
      select: { name: true },
    });
    if (existingSupplier) {
      supplierName = existingSupplier.name;
    }
  }

  return prisma.repairOrder.update({
    where: {
      id: repairOrderId,
    },
    data: {
      deviceBrand: emptyToNull(input.deviceBrand),
      deviceModel: emptyToNull(input.deviceModel),
      deviceSerial: emptyToNull(input.deviceSerial),
      reportedIssue: input.reportedIssue?.trim(),
      diagnosis: emptyToNull(input.diagnosis),
      resolutionNotes: emptyToNull(input.resolutionNotes),
      estimatedTotal: decimalOrNull(input.estimatedTotal),
      finalTotal: decimalOrNull(input.finalTotal),
      supplierId: supplierId,
      supplierName: supplierName,
      partName: input.partName !== undefined ? emptyToNull(input.partName) : undefined,
      partCost: input.partCost !== undefined ? decimalOrNull(input.partCost) : undefined,
      deductPartCost: input.deductPartCost !== undefined ? input.deductPartCost : undefined,
      supplierNotes: input.supplierNotes !== undefined ? emptyToNull(input.supplierNotes) : undefined,
      dueAt: dateOrNull(input.dueAt),
      version: {
        increment: 1,
      },
    },
  });
}

export async function updateRepairOrderStatus(
  shopId: string,
  repairOrderId: string,
  createdByUserId: string | null,
  input: UpdateRepairOrderStatusInput,
) {
  const repairOrder = await prisma.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      shopId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      completedAt: true,
      deliveredAt: true,
    },
  });

  if (!repairOrder) {
    throw new Error("طلب الصيانة غير موجود.");
  }

  const oldStatus = repairOrder.status;

  if (oldStatus === input.status) {
    return repairOrder;
  }

  const now = new Date();

  // Execute in a single batched network payload
  const [updatedRepairOrder] = await prisma.$transaction([
    prisma.repairOrder.update({
      where: {
        id: repairOrderId,
      },
      data: {
        status: input.status,
        completedAt:
          input.status === RepairStatus.DONE && !repairOrder.completedAt
            ? now
            : repairOrder.completedAt,
        deliveredAt:
          input.status === RepairStatus.DELIVERED && !repairOrder.deliveredAt
            ? now
            : repairOrder.deliveredAt,
        version: {
          increment: 1,
        },
      },
    }),
    prisma.repairStatusHistory.create({
      data: {
        shopId,
        repairOrderId,
        createdByUserId,
        fromStatus: oldStatus,
        toStatus: input.status,
        note: emptyToNull(input.note),
      },
    }),
  ]);

  return updatedRepairOrder;
}

export const repairOrderService = {
  listRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  updateRepairOrderDetails,
  updateRepairOrderStatus,
  generateTicketNumber,
  findOrCreateCustomerForRepair,
  normalizePhone,
};
