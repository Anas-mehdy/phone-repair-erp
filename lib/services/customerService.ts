import { prisma } from "@/lib/prisma";

export type CustomerFilters = {
  search?: string;
};

export type UpdateCustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizePhone(phone?: string | null) {
  const trimmed = phone?.trim();

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

export async function listCustomers(
  shopId: string,
  filters: CustomerFilters = {},
) {
  const search = filters.search?.trim();

  return prisma.customer.findMany({
    where: {
      shopId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { phoneNormalized: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          repairOrders: {
            where: {
              deletedAt: null,
            },
          },
          sales: {
            where: {
              deletedAt: null,
            },
          },
          invoices: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 100,
  });
}

export async function getCustomerById(shopId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: {
      id: customerId,
      shopId,
      deletedAt: null,
    },
    include: {
      repairOrders: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
      sales: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          soldAt: "desc",
        },
        take: 20,
      },
      invoices: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          issuedAt: "desc",
        },
        take: 20,
      },
      _count: {
        select: {
          repairOrders: {
            where: {
              deletedAt: null,
            },
          },
          sales: {
            where: {
              deletedAt: null,
            },
          },
          invoices: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });
}

export async function updateCustomer(
  shopId: string,
  customerId: string,
  input: UpdateCustomerInput,
) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      shopId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!customer) {
    throw new Error("العميل غير موجود.");
  }

  const phone = emptyToNull(input.phone);

  return prisma.customer.update({
    where: {
      id: customer.id,
    },
    data: {
      name: input.name.trim(),
      phone,
      phoneNormalized: normalizePhone(phone),
      email: emptyToNull(input.email),
      notes: emptyToNull(input.notes),
      version: {
        increment: 1,
      },
    },
  });
}

export async function softDeleteCustomer(shopId: string, customerId: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({
      where: {
        id: customerId,
        shopId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            repairOrders: {
              where: {
                deletedAt: null,
              },
            },
            sales: {
              where: {
                deletedAt: null,
              },
            },
            invoices: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new Error("العميل غير موجود.");
    }

    const linkedRecords =
      customer._count.repairOrders +
      customer._count.sales +
      customer._count.invoices;

    if (linkedRecords > 0) {
      throw new Error("لا يمكن حذف عميل لديه طلبات أو مبيعات أو فواتير مرتبطة.");
    }

    return tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });
  });
}

export const customerService = {
  listCustomers,
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
  normalizePhone,
};
