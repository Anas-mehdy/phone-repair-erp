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

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Prisma.Decimal(parsed);
}

function dateOrNull(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function findOrCreateCustomerForRepair(
  shopId: string,
  input: CreateRepairOrderInput,
) {
  const normalized = normalizePhone(input.customerPhone);

  if (normalized) {
    const existing = await prisma.customer.findFirst({
      where: {
        shopId,
        phoneNormalized: normalized,
        deletedAt: null,
      },
    });

    if (existing) {
      return existing;
    }
  }

  return prisma.customer.create({
    data: {
      shopId,
      name: input.customerName.trim(),
      phone: input.customerPhone.trim(),
      phoneNormalized: normalized,
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

  const orders = await prisma.repairOrder.findMany({
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
    take: 100,
  });

  // Batched resolution of creators for the listed tickets
  const creatorUserIds = Array.from(
    new Set(orders.map((o) => o.createdByUserId).filter((id): id is string => Boolean(id)))
  );

  const usersMap = new Map<string, { id: string; name: string; role: string }>();

  if (creatorUserIds.length > 0) {
    const [users, memberships] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: creatorUserIds } },
        select: { id: true, name: true, shopId: true, role: true },
      }),
      prisma.membership.findMany({
        where: { shopId, userId: { in: creatorUserIds } },
        select: { userId: true, role: true },
      }),
    ]);

    const roleMap = new Map<string, string>();
    for (const m of memberships) {
      roleMap.set(m.userId, m.role);
    }

    for (const u of users) {
      const shopRole = roleMap.get(u.id) || (u.shopId === shopId ? u.role : null);
      if (shopRole) {
        usersMap.set(u.id, {
          id: u.id,
          name: u.name?.trim() || "عضو فريق العمل",
          role: shopRole,
        });
      }
    }
  }

  return orders.map((order) => ({
    ...order,
    createdByUser: order.createdByUserId ? usersMap.get(order.createdByUserId) || null : null,
  }));
}

export async function getRepairOrderById(shopId: string, repairOrderId: string) {
  const repairOrder = await prisma.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      shopId,
      deletedAt: null,
    },
    include: repairOrderInclude,
  });

  if (!repairOrder) {
    return null;
  }

  // Safely resolve creator and updater details scoped to the current shop
  const userIdsToFetch = [
    repairOrder.createdByUserId,
    repairOrder.updatedByUserId,
    repairOrder.assignedToUserId,
  ].filter((id): id is string => Boolean(id));

  const usersMap = new Map<string, { id: string; name: string; role: string }>();

  if (userIdsToFetch.length > 0) {
    const [users, memberships] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { in: userIdsToFetch },
        },
        select: {
          id: true,
          name: true,
          shopId: true,
          role: true,
        },
      }),
      prisma.membership.findMany({
        where: {
          shopId,
          userId: { in: userIdsToFetch },
        },
        select: {
          userId: true,
          role: true,
        },
      }),
    ]);

    const roleMap = new Map<string, string>();
    for (const m of memberships) {
      roleMap.set(m.userId, m.role);
    }

    for (const u of users) {
      // Resolve role scoped to THIS shop (via Membership or shop owner fallback)
      const shopRole = roleMap.get(u.id) || (u.shopId === shopId ? u.role : null);
      if (shopRole) {
        usersMap.set(u.id, {
          id: u.id,
          name: u.name?.trim() || "عضو فريق العمل",
          role: shopRole,
        });
      }
    }
  }

  const createdByUser = repairOrder.createdByUserId
    ? usersMap.get(repairOrder.createdByUserId) || null
    : null;

  const updatedByUser = repairOrder.updatedByUserId
    ? usersMap.get(repairOrder.updatedByUserId) || null
    : null;

  const assignedToUser = repairOrder.assignedToUserId
    ? usersMap.get(repairOrder.assignedToUserId) || null
    : null;

  return {
    ...repairOrder,
    createdByUser,
    updatedByUser,
    assignedToUser,
  };
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
        updatedByUserId: createdByUserId,
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
  updatedByUserId: string | null,
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
      updatedByUserId,
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
  updatedByUserId: string | null,
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
        updatedByUserId,
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
        createdByUserId: updatedByUserId,
        fromStatus: oldStatus,
        toStatus: input.status,
        note: emptyToNull(input.note),
      },
    }),
  ]);

  return updatedRepairOrder;
}

export async function deleteRepairOrder(
  shopId: string,
  repairOrderId: string,
  updatedByUserId: string | null
) {
  const repairOrder = await prisma.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      shopId,
      deletedAt: null,
    },
    include: {
      invoices: {
        where: {
          deletedAt: null,
          status: {
            in: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID],
          },
        },
      },
    },
  });

  if (!repairOrder) {
    throw new Error("طلب الصيانة غير موجود أو تم حذفه مسبقاً.");
  }

  if (repairOrder.invoices.length > 0) {
    throw new Error("لا يمكن حذف طلب الصيانة لوجود فاتورة مدفوعة مرتبطة به. يرجى إلغاء أو حذف الفاتورة أولاً.");
  }

  const now = new Date();

  return prisma.$transaction([
    prisma.repairOrder.update({
      where: { id: repairOrderId },
      data: {
        deletedAt: now,
        updatedByUserId,
      },
    }),
    prisma.invoice.updateMany({
      where: {
        repairOrderId,
        shopId,
        deletedAt: null,
      },
      data: { deletedAt: now },
    }),
  ]);
}

export const repairOrderService = {
  listRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  updateRepairOrderDetails,
  updateRepairOrderStatus,
  deleteRepairOrder,
  generateTicketNumber,
  findOrCreateCustomerForRepair,
  normalizePhone,
};
