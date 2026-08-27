import { prisma } from "@/lib/prisma";
import { Device } from "@prisma/client";
import { DeviceNotFoundError, DeviceAlreadyExistsArchivedError } from "./compatibility.errors";
import { normalizeSearchString } from "./normalization";

export interface CreateDeviceInput {
  brand: string;
  commercialName: string;
  modelNumber: string;
  networkVariant?: string | null;
  region?: string | null;
  boardRevision?: string | null;
  releaseYear?: number | null;
  notes?: string | null;
}


interface RawDeviceRow {
  id: string;
  brand: string;
  commercialName: string;
  modelNumber: string;
  isArchived: boolean;
  isarchived?: boolean;
}

export class DeviceService {
  async createDevice(input: CreateDeviceInput): Promise<Device> {
    const brand = input.brand.trim();
    const commercialName = input.commercialName.trim();
    const modelNumber = input.modelNumber.trim();
    const normalizedModel = normalizeSearchString(modelNumber);
    const networkVariant = input.networkVariant?.trim() || null;
    const region = input.region?.trim() || null;
    const boardRevision = input.boardRevision?.trim() || null;

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<RawDeviceRow[]>`
        SELECT * FROM "Device"
        WHERE LOWER(TRIM("brand")) = LOWER(${brand})
          AND LOWER(TRIM("modelNumber")) = LOWER(${modelNumber})
          AND COALESCE(LOWER(TRIM("networkVariant")), '') = COALESCE(LOWER(${networkVariant}), '')
          AND COALESCE(LOWER(TRIM("region")), '') = COALESCE(LOWER(${region}), '')
          AND COALESCE(LOWER(TRIM("boardRevision")), '') = COALESCE(LOWER(${boardRevision}), '');
      `;

      if (existing && existing.length > 0) {
        const found = existing[0];
        const isArchived = found.isArchived ?? found.isarchived ?? false;
        if (isArchived) {
          throw new DeviceAlreadyExistsArchivedError(brand, modelNumber, found.id);
        }
        throw new Error(`Device "${brand} ${modelNumber}" already exists.`);
      }

      return await tx.device.create({
        data: {
          brand,
          commercialName,
          modelNumber,
          normalizedModel,
          networkVariant,
          region,
          boardRevision,
          releaseYear: input.releaseYear || null,
          notes: input.notes?.trim() || null,
        },
      });
    });
  }

  async archiveDevice(id: string): Promise<Device> {
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) {
      throw new DeviceNotFoundError(id);
    }
    return await prisma.device.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });
  }

  async restoreDevice(id: string): Promise<Device> {
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) {
      throw new DeviceNotFoundError(id);
    }
    return await prisma.device.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
    });
  }

  async getDeviceById(id: string, includeArchived = false): Promise<Device | null> {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) return null;
    if (!includeArchived && device.isArchived) return null;
    return device;
  }
}

export const deviceService = new DeviceService();
