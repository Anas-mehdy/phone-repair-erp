import { prisma } from "@/lib/prisma";
import { CompatibilityStatus, PartCategory, Prisma } from "@prisma/client";
import { DeviceNotFoundError } from "./compatibility.errors";
import {
  ScreenSpecificationSummary,
  summarizeScreenSpecifications,
} from "./screen-specifications";

export interface InventoryMatcherOptions {
  shopId?: string;
  category?: PartCategory;
  includeOutOfStock?: boolean;
  limit?: number;
}

export interface InventoryLocationDetail {
  inventoryItemId: string;
  shopId: string;
  shopName?: string;
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  location?: string | null;
}

export interface CompatibleInventoryItemResult {
  partId: string;
  partName: string;
  category: PartCategory;
  manufacturerCode: string | null;
  partAliases: string[];
  screenSpecification: ScreenSpecificationSummary | null;
  compatibilityId: string;
  compatibilityStatus: CompatibilityStatus;
  compatibilityType: string;
  verificationLevel: string;
  technicalNotes: string | null;
  verifiedAt: Date | null;
  evidenceCount: number;
  corroboratedSourceCount: number;
  verificationMethod: string | null;
  isVerified: boolean;
  isProvisional: boolean;
  requiresManualVerification: boolean;
  warning: string | null;
  totalAvailableQuantity: number;
  inStock: boolean;
  inventoryItems: InventoryLocationDetail[];
}

export interface DeviceInventoryMatchResponse {
  success: boolean;
  device: {
    id: string;
    brand: string;
    commercialName: string;
    modelNumber: string;
    networkVariant: string | null;
    region: string | null;
  };
  totalCompatibleParts: number;
  inStockPartsCount: number;
  outOfStockPartsCount: number;
  results: CompatibleInventoryItemResult[];
}

export class SmartInventoryMatcherService {
  /**
   * Identifies all compatible parts for a device and matches them with available InventoryItems.
   * 
   * CORE INVARIANTS:
   * 1. Results contain published VERIFIED records and automatically corroborated provisional records.
   * 2. Unpublished, unverified, incompatible, archived and suspended records are excluded.
   * 3. Inventory is linked by InventoryItem.partId; names and SKUs never prove identity.
   * 4. Zero N+1 queries (executed in 2 optimized batched queries).
   */
  async getAvailableCompatibleParts(
    deviceId: string,
    options: InventoryMatcherOptions = {}
  ): Promise<DeviceInventoryMatchResponse> {
    // 1. Fetch active Device
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device || device.isArchived) {
      throw new DeviceNotFoundError(deviceId);
    }

    // 2. Fetch all valid, active compatibilities for this device (Query 1)
    const compatibilities = await prisma.deviceCompatibility.findMany({
      where: {
        deviceId,
        isArchived: false,
        compatibilityStatus: {
          in: [CompatibilityStatus.VERIFIED, CompatibilityStatus.PROVISIONALLY_VERIFIED],
        },
        publishedAt: { not: null },
        suspendedAt: null,
        part: {
          isArchived: false,
          category: options.category || undefined,
        },
      },
      include: {
        part: true,
        evidences: {
          select: { id: true },
        },
      },
      orderBy: [
        { compatibilityStatus: "asc" }, // VERIFIED first
        { updatedAt: "desc" },
      ],
    });

    if (compatibilities.length === 0) {
      return {
        success: true,
        device: {
          id: device.id,
          brand: device.brand,
          commercialName: device.commercialName,
          modelNumber: device.modelNumber,
          networkVariant: device.networkVariant,
          region: device.region,
        },
        totalCompatibleParts: 0,
        inStockPartsCount: 0,
        outOfStockPartsCount: 0,
        results: [],
      };
    }

    // 3. Match inventory through the explicit foreign key only (Query 2).
    const partIds = compatibilities.map((compatibility) => compatibility.partId);
    const inventoryWhere: Prisma.InventoryItemWhereInput = {
      deletedAt: null,
      shopId: options.shopId || undefined,
      partId: { in: partIds },
    };

    const matchingInventoryItems = await prisma.inventoryItem.findMany({
      where: inventoryWhere,
      include: {
        shop: {
          select: { name: true },
        },
      },
    });

    // 4. Map InventoryItems to compatible Parts
    const results: CompatibleInventoryItemResult[] = [];

    for (const compat of compatibilities) {
      const part = compat.part;
      const matchedItems = matchingInventoryItems.filter((item) => item.partId === part.id);

      const inventoryDetails: InventoryLocationDetail[] = matchedItems.map((item) => ({
        inventoryItemId: item.id,
        shopId: item.shopId,
        shopName: item.shop?.name,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        location: item.description?.includes("Shelf") ? item.description : null,
      }));

      const totalQuantity = inventoryDetails.reduce((sum, item) => sum + Math.max(item.quantity, 0), 0);
      const isVerified = compat.compatibilityStatus === CompatibilityStatus.VERIFIED;
      const isProvisional = compat.compatibilityStatus === CompatibilityStatus.PROVISIONALLY_VERIFIED;

      // Filter out of stock if requested
      if (!options.includeOutOfStock && totalQuantity <= 0) {
        continue;
      }

      results.push({
        partId: part.id,
        partName: part.name,
        category: part.category,
        manufacturerCode: part.manufacturerCode,
        partAliases: part.partAliases,
        screenSpecification: summarizeScreenSpecifications(part.specifications),
        compatibilityId: compat.id,
        compatibilityStatus: compat.compatibilityStatus,
        compatibilityType: compat.compatibilityType,
        verificationLevel: compat.verificationLevel,
        technicalNotes: compat.technicalNotes,
        verifiedAt: compat.verifiedAt,
        evidenceCount: compat.evidences.length,
        corroboratedSourceCount: compat.corroboratedSourceCount,
        verificationMethod: compat.verificationMethod,
        isVerified,
        isProvisional,
        requiresManualVerification: isProvisional,
        warning: isProvisional
          ? `توافق سوقي مؤيد من ${compat.corroboratedSourceCount} مصادر مستقلة؛ طابق رقم الموديل ونوع الشاشة والفريم قبل التركيب.`
          : null,
        totalAvailableQuantity: totalQuantity,
        inStock: totalQuantity > 0,
        inventoryItems: inventoryDetails,
      });
    }

    // 5. Strict Result Priority Ranking:
    // Rank 1: VERIFIED + inStock (qty > 0)
    // Rank 2: VERIFIED + outOfStock (qty == 0)
    // Rank 3: PROVISIONALLY_VERIFIED + inStock (qty > 0)
    // Rank 4: PROVISIONALLY_VERIFIED + outOfStock (qty == 0)
    results.sort((a, b) => {
      // Primary: VERIFIED vs PROVISIONALLY_VERIFIED
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;

      // Secondary: inStock > outOfStock
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;

      // Tertiary: higher available quantity first
      if (b.totalAvailableQuantity !== a.totalAvailableQuantity) {
        return b.totalAvailableQuantity - a.totalAvailableQuantity;
      }

      // Quaternary: alphabetical
      return a.partName.localeCompare(b.partName);
    });

    const inStockCount = results.filter((r) => r.inStock).length;
    const outOfStockCount = results.filter((r) => !r.inStock).length;

    return {
      success: true,
      device: {
        id: device.id,
        brand: device.brand,
        commercialName: device.commercialName,
        modelNumber: device.modelNumber,
        networkVariant: device.networkVariant,
        region: device.region,
      },
      totalCompatibleParts: results.length,
      inStockPartsCount: inStockCount,
      outOfStockPartsCount: outOfStockCount,
      results: options.limit ? results.slice(0, options.limit) : results,
    };
  }
}

export const smartInventoryMatcherService = new SmartInventoryMatcherService();
