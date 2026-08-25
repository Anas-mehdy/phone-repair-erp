import { prisma } from "@/lib/prisma";
import { normalizePhone } from "./repairOrderService";

export type SupplierListFilters = {
  search?: string;
};

export type CreateSupplierInput = {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export type UpdateSupplierInput = {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listSuppliers(
  shopId: string,
  filters: SupplierListFilters = {},
) {
  const search = filters.search?.trim();

  return prisma.supplier.findMany({
    where: {
      shopId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
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
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function getSupplierById(shopId: string, supplierId: string) {
  return prisma.supplier.findFirst({
    where: {
      id: supplierId,
      shopId,
      deletedAt: null,
    },
    include: {
      repairOrders: {
        where: {
          deletedAt: null,
        },
        include: {
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function findOrCreateSupplier(
  shopId: string,
  supplierName: string,
  supplierPhone?: string,
) {
  const name = supplierName.trim();
  if (!name) {
    return null;
  }

  const phone = supplierPhone?.trim() || null;
  const phoneNormalized = phone ? normalizePhone(phone) : null;

  const existing = await prisma.supplier.findFirst({
    where: {
      shopId,
      deletedAt: null,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.supplier.create({
    data: {
      shopId,
      name,
      phone,
      phoneNormalized,
    },
  });
}

export async function createSupplier(
  shopId: string,
  input: CreateSupplierInput,
) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("اسم المورد مطلوب.");
  }

  const phone = input.phone?.trim() || null;
  const phoneNormalized = phone ? normalizePhone(phone) : null;

  return prisma.supplier.create({
    data: {
      shopId,
      name,
      phone,
      phoneNormalized,
      address: emptyToNull(input.address),
      notes: emptyToNull(input.notes),
    },
  });
}

export async function updateSupplier(
  shopId: string,
  supplierId: string,
  input: UpdateSupplierInput,
) {
  const existing = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      shopId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("المورد غير موجود.");
  }

  const phone = input.phone !== undefined ? (input.phone?.trim() || null) : undefined;
  const phoneNormalized = phone ? normalizePhone(phone) : phone === null ? null : undefined;

  return prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: input.name?.trim(),
      phone,
      phoneNormalized,
      address: input.address !== undefined ? emptyToNull(input.address) : undefined,
      notes: input.notes !== undefined ? emptyToNull(input.notes) : undefined,
      version: { increment: 1 },
    },
  });
}

export async function deleteSupplier(shopId: string, supplierId: string) {
  const existing = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      shopId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("المورد غير موجود.");
  }

  return prisma.supplier.update({
    where: { id: supplierId },
    data: {
      deletedAt: new Date(),
    },
  });
}

export const supplierService = {
  listSuppliers,
  getSupplierById,
  findOrCreateSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
