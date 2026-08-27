import { prisma } from "@/lib/prisma";
import { Part, PartCategory, Prisma } from "@prisma/client";
import { PartNotFoundError } from "./compatibility.errors";
import { normalizeSearchString } from "./normalization";


export interface CreatePartInput {
  category: PartCategory;
  name: string;
  manufacturerCode?: string | null;
  partAliases?: string[];
  specifications?: Prisma.InputJsonValue;
}

export class PartService {
  async createPart(input: CreatePartInput): Promise<Part> {
    const name = input.name.trim();
    const manufacturerCode = input.manufacturerCode?.trim() || null;
    const normalizedPartCode = manufacturerCode ? normalizeSearchString(manufacturerCode) : null;
    const partAliases = input.partAliases ? input.partAliases.map((a) => a.trim()).filter(Boolean) : [];

    return await prisma.part.create({
      data: {
        category: input.category,
        name,
        manufacturerCode,
        normalizedPartCode,
        partAliases,
        specifications: input.specifications,
      },
    });
  }

  async archivePart(id: string): Promise<Part> {
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) {
      throw new PartNotFoundError(id);
    }
    return await prisma.part.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });
  }

  async restorePart(id: string): Promise<Part> {
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) {
      throw new PartNotFoundError(id);
    }
    return await prisma.part.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
    });
  }

  async getPartById(id: string, includeArchived = false): Promise<Part | null> {
    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) return null;
    if (!includeArchived && part.isArchived) return null;
    return part;
  }
}

export const partService = new PartService();
