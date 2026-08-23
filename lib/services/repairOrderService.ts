import { InvoiceStatus, Prisma, RepairStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const repairOrderInclude = {
  customer: true,
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
