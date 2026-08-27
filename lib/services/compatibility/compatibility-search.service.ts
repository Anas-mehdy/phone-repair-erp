import { prisma } from "@/lib/prisma";
import {
  CompatibilityStatus,
  PartCategory,
  Prisma,
} from "@prisma/client";
import { normalizeSearchString, normalizeModelNumber, tokenizeQuery } from "./normalization";

export interface DeviceSearchOptions {
  brand?: string;
  networkVariant?: string;
  region?: string;
  includeArchived?: boolean;
  limit?: number;
}

export interface PartSearchOptions {
  category?: PartCategory;
  includeArchived?: boolean;
  limit?: number;
}

export interface CompatibilitySearchParams {
  query?: string;
  category?: PartCategory;
  brand?: string;
  networkVariant?: string;
  status?: CompatibilityStatus;
  includeArchived?: boolean;
  includeIncompatible?: boolean;
  page?: number;
  limit?: number;
}

export interface FormattedEvidenceItem {
  id: string;
  sourceType: string;
  sourceReference: string;
  evidenceDetails: string;
  verifiedBy: string;
  verifiedAt: Date;
}

export interface CompatibilitySearchResultItem {
  id: string;
  compatibilityStatus: CompatibilityStatus;
  compatibilityType: string;
  verificationLevel: string;
  technicalNotes: string | null;
  verifiedAt: Date | null;
  verifiedById: string | null;
  isArchived: boolean;
  device: {
    id: string;
    brand: string;
    commercialName: string;
    modelNumber: string;
    networkVariant: string | null;
    region: string | null;
    releaseYear: number | null;
  };
  part: {
    id: string;
    category: PartCategory;
    name: string;
    manufacturerCode: string | null;
    partAliases: string[];
  };
  evidenceCount: number;
  evidences: FormattedEvidenceItem[];
  isVerified: boolean;
  isProvisional: boolean;
}

export interface CompatibilitySearchResponse {
  success: boolean;
  query: string;
  normalizedQuery: string;
  results: CompatibilitySearchResultItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export class CompatibilitySearchService {
  /**
   * Fast Device Identification Search.
   * Prioritizes:
   * 1. Exact modelNumber
   * 2. Exact normalizedModel
   * 3. Commercial name match
   * 4. Controlled token search
   */
  async searchDevices(query: string, options: DeviceSearchOptions = {}) {
    const raw = query.trim();
    if (!raw) return [];

    const { normalized, baseNormalized } = normalizeModelNumber(raw);
    const limit = Math.min(options.limit || 20, 50);

    const where: Prisma.DeviceWhereInput = {
      isArchived: options.includeArchived ? undefined : false,
      brand: options.brand ? { equals: options.brand, mode: "insensitive" } : undefined,
      networkVariant: options.networkVariant ? { equals: options.networkVariant, mode: "insensitive" } : undefined,
      region: options.region ? { equals: options.region, mode: "insensitive" } : undefined,
      OR: [
        { modelNumber: { equals: raw, mode: "insensitive" } },
        { normalizedModel: { equals: normalized } },
        { normalizedModel: { equals: baseNormalized } },
        { commercialName: { contains: raw, mode: "insensitive" } },
        { brand: { contains: raw, mode: "insensitive" } },
      ],
    };

    return await prisma.device.findMany({
      where,
      take: limit,
      orderBy: [
        { brand: "asc" },
        { modelNumber: "asc" },
      ],
    });
  }

  /**
   * Fast Part Identification Search.
   * Prioritizes:
   * 1. Exact manufacturerCode
   * 2. Exact normalizedPartCode
   * 3. Exact alias in partAliases
   * 4. Name search
   */
  async searchParts(query: string, options: PartSearchOptions = {}) {
    const raw = query.trim();
    if (!raw) return [];

    const normalized = normalizeSearchString(raw);
    const limit = Math.min(options.limit || 20, 50);

    const where: Prisma.PartWhereInput = {
      isArchived: options.includeArchived ? undefined : false,
      category: options.category || undefined,
      OR: [
        { manufacturerCode: { equals: raw, mode: "insensitive" } },
        { normalizedPartCode: { equals: normalized } },
        { partAliases: { has: raw } },
        { partAliases: { has: raw.toUpperCase() } },
        { name: { contains: raw, mode: "insensitive" } },
      ],
    };

    return await prisma.part.findMany({
      where,
      take: limit,
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });
  }

  /**
   * High-Performance Compatibility Search.
   * 
   * HIGH-PERFORMANCE WORKFLOW:
   * 1. Query Normalization & Tokenization.
   * 2. Identify candidate Devices and candidate Parts using indexed lookups.
   * 3. Query DeviceCompatibility table with single JOIN query (NO N+1 loops).
   * 4. Strictly filter operational replacements:
   *    - Returns ONLY VERIFIED and PROVISIONALLY_VERIFIED in operational mode.
   *    - Excludes UNVERIFIED and INCOMPATIBLE from operational replacement results.
   *    - Excludes archived records.
   * 5. Rank: VERIFIED (Rank 1) > PROVISIONALLY_VERIFIED (Rank 2).
   */
  async searchCompatibilities(params: CompatibilitySearchParams): Promise<CompatibilitySearchResponse> {
    const rawQuery = params.query?.trim() || "";
    const normalizedQuery = normalizeSearchString(rawQuery);
    const { baseNormalized } = normalizeModelNumber(rawQuery);

    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    // Status filter rules:
    // In operational mode: allow only VERIFIED and PROVISIONALLY_VERIFIED.
    // If admin explicitly requests includeIncompatible, allow INCOMPATIBLE.
    let statusFilter: Prisma.EnumCompatibilityStatusFilter | CompatibilityStatus[];
    if (params.status) {
      statusFilter = [params.status];
    } else if (params.includeIncompatible) {
      statusFilter = [CompatibilityStatus.VERIFIED, CompatibilityStatus.PROVISIONALLY_VERIFIED, CompatibilityStatus.INCOMPATIBLE];
    } else {
      statusFilter = [CompatibilityStatus.VERIFIED, CompatibilityStatus.PROVISIONALLY_VERIFIED];
    }

    const where: Prisma.DeviceCompatibilityWhereInput = {
      isArchived: params.includeArchived ? undefined : false,
      compatibilityStatus: { in: statusFilter },
    };

    if (params.category) {
      where.part = { category: params.category };
    }

    if (rawQuery) {
      const tokens = tokenizeQuery(rawQuery);
      where.AND = [
        {
          OR: [
            // Device match
            {
              device: {
                isArchived: params.includeArchived ? undefined : false,
                OR: [
                  { modelNumber: { equals: rawQuery, mode: "insensitive" } },
                  { normalizedModel: { in: [normalizedQuery, baseNormalized].filter(Boolean) } },
                  { commercialName: { contains: rawQuery, mode: "insensitive" } },
                  { brand: { contains: rawQuery, mode: "insensitive" } },
                  ...tokens.map((token) => ({
                    commercialName: { contains: token, mode: "insensitive" as const },
                  })),
                ],
              },
            },
            // Part match
            {
              part: {
                isArchived: params.includeArchived ? undefined : false,
                OR: [
                  { manufacturerCode: { equals: rawQuery, mode: "insensitive" } },
                  { normalizedPartCode: { equals: normalizedQuery } },
                  { partAliases: { has: rawQuery } },
                  { partAliases: { has: rawQuery.toUpperCase() } },
                  { name: { contains: rawQuery, mode: "insensitive" } },
                  ...tokens.map((token) => ({
                    name: { contains: token, mode: "insensitive" as const },
                  })),
                ],
              },
            },
          ],
        },
      ];
    }

    // Brand and network variant filters on device
    if (params.brand) {
      where.device = {
        ...(where.device as Prisma.DeviceWhereInput),
        brand: { equals: params.brand, mode: "insensitive" },
      };
    }

    if (params.networkVariant) {
      where.device = {
        ...(where.device as Prisma.DeviceWhereInput),
        networkVariant: { equals: params.networkVariant, mode: "insensitive" },
      };
    }

    // High performance single transaction for count + fetch
    const [total, records] = await prisma.$transaction([
      prisma.deviceCompatibility.count({ where }),
      prisma.deviceCompatibility.findMany({
        where,
        skip,
        take: limit,
        include: {
          device: true,
          part: true,
          evidences: {
            orderBy: { verifiedAt: "desc" },
            take: 5,
          },
        },
        orderBy: [
          // VERIFIED first, then PROVISIONALLY_VERIFIED
          { compatibilityStatus: "asc" },
          { updatedAt: "desc" },
        ],
      }),
    ]);

    const formattedResults: CompatibilitySearchResultItem[] = records.map((record) => {
      const isVerified = record.compatibilityStatus === CompatibilityStatus.VERIFIED;
      const isProvisional = record.compatibilityStatus === CompatibilityStatus.PROVISIONALLY_VERIFIED;

      return {
        id: record.id,
        compatibilityStatus: record.compatibilityStatus,
        compatibilityType: record.compatibilityType,
        verificationLevel: record.verificationLevel,
        technicalNotes: record.technicalNotes,
        verifiedAt: record.verifiedAt,
        verifiedById: record.verifiedById,
        isArchived: record.isArchived,
        device: {
          id: record.device.id,
          brand: record.device.brand,
          commercialName: record.device.commercialName,
          modelNumber: record.device.modelNumber,
          networkVariant: record.device.networkVariant,
          region: record.device.region,
          releaseYear: record.device.releaseYear,
        },
        part: {
          id: record.part.id,
          category: record.part.category,
          name: record.part.name,
          manufacturerCode: record.part.manufacturerCode,
          partAliases: record.part.partAliases,
        },
        evidenceCount: record.evidences.length,
        evidences: record.evidences.map((e) => ({
          id: e.id,
          sourceType: e.sourceType,
          sourceReference: e.sourceReference,
          evidenceDetails: e.evidenceDetails,
          verifiedBy: e.verifiedBy,
          verifiedAt: e.verifiedAt,
        })),
        isVerified,
        isProvisional,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      query: rawQuery,
      normalizedQuery,
      results: formattedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }
}

export const compatibilitySearchService = new CompatibilitySearchService();
