import {
  CompatibilityStatus,
  CompatibilityType,
  VerificationLevel,
  VerificationSourceType,
  DeviceCompatibility,
  CompatibilityEvidence,
  CompatibilityReviewDecision,
  PartCategory,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  CompatibilityNotFoundError,
  DeviceNotFoundError,
  PartNotFoundError,
  DuplicateCompatibilityError,
  CompatibilityAlreadyArchivedError,
  ArchivedCompatibilityCannotBeVerifiedError,
  SelfVerificationNotAllowedError,
  InsufficientVerificationPermissionError,
  VerificationEvidenceRequiredError,
  InvalidVerificationLevelError,
  CannotDeleteVerifiedCompatibilityError,
  ImmutableVerifiedStateError,
  DuplicateCompatibilityReviewError,
} from "./compatibility.errors";
import {
  CompatibilityUserContext,
  canVerifyCompatibility,
  isLevelEligibleForVerified,
} from "./compatibility.auth";

export interface CreateCompatibilityInput {
  deviceId: string;
  partId: string;
  compatibilityType: CompatibilityType;
  verificationLevel?: VerificationLevel;
  technicalNotes?: string | null;
  initialEvidence?: {
    sourceType: VerificationSourceType;
    sourceReference: string;
    evidenceDetails: string;
  };
}

export interface VerifyCompatibilityInput {
  compatibilityId: string;
  verificationLevel?: VerificationLevel;
  compatibilityType?: CompatibilityType;
  technicalNotes?: string | null;
  evidence: {
    sourceType: VerificationSourceType;
    sourceReference: string;
    evidenceDetails: string;
  };
}

export interface ProvisionallyVerifyInput {
  compatibilityId: string;
  verificationLevel?: VerificationLevel;
  compatibilityType?: CompatibilityType;
  technicalNotes?: string | null;
  evidence: {
    sourceType: VerificationSourceType;
    sourceReference: string;
    evidenceDetails: string;
  };
}

export interface MarkIncompatibleInput {
  compatibilityId: string;
  reason: string;
}

export interface UpdateCompatibilityDetailsInput {
  technicalNotes?: string | null;
}

export interface GetCompatibilityOptions {
  includeArchived?: boolean;
}

interface RawCompatibilityRow {
  id: string;
  deviceId: string;
  deviceid?: string;
  partId: string;
  partid?: string;
  compatibilityStatus: CompatibilityStatus;
  compatibilitystatus?: CompatibilityStatus;
  compatibilityType: CompatibilityType;
  compatibilitytype?: CompatibilityType;
  verificationLevel: VerificationLevel;
  verificationlevel?: VerificationLevel;
  technicalNotes: string | null;
  technicalnotes?: string | null;
  createdById: string | null;
  createdbyid?: string | null;
  verifiedById: string | null;
  verifiedbyid?: string | null;
  verifiedAt: Date | null;
  verifiedat?: Date | null;
  isArchived: boolean;
  isarchived?: boolean;
  archivedAt: Date | null;
  archivedat?: Date | null;
  reviewVersion: number;
  reviewversion?: number;
}

export class CompatibilityService {
  async createCompatibility(
    input: CreateCompatibilityInput,
    user?: CompatibilityUserContext | null
  ): Promise<DeviceCompatibility & { evidences: CompatibilityEvidence[] }> {
    return await prisma.$transaction(async (tx) => {
      const device = await tx.device.findUnique({
        where: { id: input.deviceId },
      });
      if (!device) {
        throw new DeviceNotFoundError(input.deviceId);
      }

      const part = await tx.part.findUnique({
        where: { id: input.partId },
      });
      if (!part) {
        throw new PartNotFoundError(input.partId);
      }

      const existing = await tx.deviceCompatibility.findUnique({
        where: {
          deviceId_partId: {
            deviceId: input.deviceId,
            partId: input.partId,
          },
        },
      });
      if (existing) {
        throw new DuplicateCompatibilityError(input.deviceId, input.partId);
      }

      if (!input.compatibilityType || !Object.values(CompatibilityType).includes(input.compatibilityType)) {
        throw new Error("A valid compatibilityType must be explicitly specified.");
      }

      const created = await tx.deviceCompatibility.create({
        data: {
          deviceId: input.deviceId,
          partId: input.partId,
          compatibilityStatus: CompatibilityStatus.UNVERIFIED,
          compatibilityType: input.compatibilityType,
          verificationLevel: input.verificationLevel ?? VerificationLevel.TECHNICIAN_REPORTED,
          technicalNotes: input.technicalNotes?.trim() || null,
          createdById: user?.id || null,
        },
      });

      if (input.initialEvidence) {
        const ref = input.initialEvidence.sourceReference?.trim();
        const details = input.initialEvidence.evidenceDetails?.trim();
        if (ref && details) {
          await tx.compatibilityEvidence.create({
            data: {
              compatibilityId: created.id,
              sourceType: input.initialEvidence.sourceType,
              sourceReference: ref,
              evidenceDetails: details,
              verifiedBy: user?.id || "Initial Submitter",
              verifiedAt: new Date(),
            },
          });
        }
      }

      await tx.compatibilityAuditEvent.create({
        data: {
          compatibilityId: created.id,
          actorId: user?.id || null,
          action: "PROPOSAL_CREATED",
          toStatus: CompatibilityStatus.UNVERIFIED,
        },
      });

      return await tx.deviceCompatibility.findUniqueOrThrow({
        where: { id: created.id },
        include: { evidences: true },
      });
    });
  }

  async verifyCompatibility(
    input: VerifyCompatibilityInput,
    user: CompatibilityUserContext
  ): Promise<DeviceCompatibility & { evidences: CompatibilityEvidence[] }> {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<RawCompatibilityRow[]>`
        SELECT * FROM "DeviceCompatibility" 
        WHERE "id" = ${input.compatibilityId}::uuid 
        FOR UPDATE;
      `;

      if (!rows || rows.length === 0) {
        throw new CompatibilityNotFoundError(input.compatibilityId);
      }

      const current = rows[0];
      const isArchived = current.isArchived ?? current.isarchived ?? false;
      const creatorId = current.createdById ?? current.createdbyid ?? null;
      const currentLevel = current.verificationLevel ?? current.verificationlevel ?? VerificationLevel.TECHNICIAN_REPORTED;
      const currentType = current.compatibilityType ?? current.compatibilitytype ?? CompatibilityType.DIRECT_REPLACEMENT;
      const currentStatus = current.compatibilityStatus ?? current.compatibilitystatus ?? CompatibilityStatus.UNVERIFIED;
      const reviewVersion = current.reviewVersion ?? current.reviewversion ?? 1;

      if (isArchived) {
        throw new ArchivedCompatibilityCannotBeVerifiedError(input.compatibilityId);
      }

      if (creatorId && creatorId === user.id) {
        throw new SelfVerificationNotAllowedError(user.id);
      }

      if (!canVerifyCompatibility(user)) {
        throw new InsufficientVerificationPermissionError(user.id, user.role?.toString());
      }

      const existingReview = await tx.compatibilityReview.findUnique({
        where: {
          compatibilityId_reviewerId_reviewVersion: {
            compatibilityId: input.compatibilityId,
            reviewerId: user.id,
            reviewVersion,
          },
        },
      });
      if (existingReview) {
        throw new DuplicateCompatibilityReviewError(user.id);
      }

      const targetLevel = input.verificationLevel || currentLevel;
      if (!isLevelEligibleForVerified(targetLevel)) {
        throw new InvalidVerificationLevelError(targetLevel);
      }

      if (!input.evidence) {
        throw new VerificationEvidenceRequiredError();
      }

      const sourceRef = input.evidence.sourceReference?.trim();
      const details = input.evidence.evidenceDetails?.trim();

      if (!sourceRef || !details) {
        throw new VerificationEvidenceRequiredError(
          "Verification requires non-empty sourceReference and evidenceDetails."
        );
      }

      if (!input.evidence.sourceType || !Object.values(VerificationSourceType).includes(input.evidence.sourceType)) {
        throw new VerificationEvidenceRequiredError("A valid VerificationSourceType is required.");
      }

      await tx.compatibilityEvidence.create({
        data: {
          compatibilityId: input.compatibilityId,
          sourceType: input.evidence.sourceType,
          sourceReference: sourceRef,
          evidenceDetails: details,
          verifiedBy: user.id,
          verifiedAt: new Date(),
        },
      });

      await tx.compatibilityReview.create({
        data: {
          compatibilityId: input.compatibilityId,
          reviewerId: user.id,
          decision: CompatibilityReviewDecision.APPROVED,
          notes: details,
          reviewVersion,
        },
      });

      const approvalCount = await tx.compatibilityReview.count({
        where: {
          compatibilityId: input.compatibilityId,
          reviewVersion,
          decision: CompatibilityReviewDecision.APPROVED,
        },
      });
      const isPublished = approvalCount >= 2;
      const targetStatus = isPublished
        ? CompatibilityStatus.VERIFIED
        : CompatibilityStatus.PROVISIONALLY_VERIFIED;
      const now = new Date();

      const updated = await tx.deviceCompatibility.update({
        where: { id: input.compatibilityId },
        data: {
          compatibilityStatus: targetStatus,
          compatibilityType: input.compatibilityType || currentType,
          verificationLevel: targetLevel,
          technicalNotes: input.technicalNotes !== undefined ? input.technicalNotes?.trim() : current.technicalNotes,
          verifiedById: isPublished ? user.id : null,
          verifiedAt: isPublished ? now : null,
          publishedById: isPublished ? user.id : null,
          publishedAt: isPublished ? now : null,
          suspendedAt: null,
          suspensionReason: null,
        },
        include: {
          evidences: true,
        },
      });

      await tx.compatibilityAuditEvent.create({
        data: {
          compatibilityId: input.compatibilityId,
          actorId: user.id,
          action: isPublished ? "PUBLISHED_AFTER_TWO_REVIEWS" : "FIRST_REVIEW_APPROVED",
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: sourceRef,
          metadata: { approvalCount, reviewVersion },
        },
      });

      return updated;
    });
  }

  async provisionallyVerifyCompatibility(
    input: ProvisionallyVerifyInput,
    user: CompatibilityUserContext
  ): Promise<DeviceCompatibility & { evidences: CompatibilityEvidence[] }> {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.deviceCompatibility.findUnique({
        where: { id: input.compatibilityId },
      });

      if (!current) {
        throw new CompatibilityNotFoundError(input.compatibilityId);
      }

      if (current.isArchived) {
        throw new CompatibilityAlreadyArchivedError(input.compatibilityId);
      }

      const sourceRef = input.evidence?.sourceReference?.trim();
      const details = input.evidence?.evidenceDetails?.trim();

      if (!sourceRef || !details) {
        throw new VerificationEvidenceRequiredError(
          "Provisional verification requires non-empty sourceReference and evidenceDetails."
        );
      }

      await tx.compatibilityEvidence.create({
        data: {
          compatibilityId: input.compatibilityId,
          sourceType: input.evidence.sourceType || VerificationSourceType.TECHNICIAN_VERIFIED,
          sourceReference: sourceRef,
          evidenceDetails: details,
          verifiedBy: user.id,
          verifiedAt: new Date(),
        },
      });



      const updated = await tx.deviceCompatibility.update({
        where: { id: input.compatibilityId },
        data: {
          compatibilityStatus: CompatibilityStatus.PROVISIONALLY_VERIFIED,
          verificationLevel: input.verificationLevel ?? current.verificationLevel,
          compatibilityType: input.compatibilityType ?? current.compatibilityType,
          technicalNotes: input.technicalNotes !== undefined ? input.technicalNotes?.trim() : current.technicalNotes,
        },
        include: { evidences: true },
      });

      return updated;
    });
  }

  async markIncompatible(
    input: MarkIncompatibleInput,
    user: CompatibilityUserContext
  ): Promise<DeviceCompatibility & { evidences: CompatibilityEvidence[] }> {
    const reason = input.reason?.trim();
    if (!reason) {
      throw new Error("A clear technical reason is required when marking a relation as INCOMPATIBLE.");
    }

    return await prisma.$transaction(async (tx) => {
      const current = await tx.deviceCompatibility.findUnique({
        where: { id: input.compatibilityId },
      });

      if (!current) {
        throw new CompatibilityNotFoundError(input.compatibilityId);
      }

      const updated = await tx.deviceCompatibility.update({
        where: { id: input.compatibilityId },
        data: {
          compatibilityStatus: CompatibilityStatus.INCOMPATIBLE,
          compatibilityType: CompatibilityType.INCOMPATIBLE,
          technicalNotes: current.technicalNotes ? `${current.technicalNotes} | [INCOMPATIBLE]: ${reason}` : `[INCOMPATIBLE]: ${reason}`,
          verifiedById: user.id,
          verifiedAt: new Date(),
        },
        include: { evidences: true },
      });

      return updated;
    });
  }

  async archiveCompatibility(id: string): Promise<DeviceCompatibility> {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.deviceCompatibility.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new CompatibilityNotFoundError(id);
      }

      if (existing.isArchived) {
        return existing;
      }

      return await tx.deviceCompatibility.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });
    });
  }

  async restoreCompatibility(id: string): Promise<DeviceCompatibility> {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.deviceCompatibility.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new CompatibilityNotFoundError(id);
      }

      if (!existing.isArchived) {
        return existing;
      }

      return await tx.deviceCompatibility.update({
        where: { id },
        data: {
          isArchived: false,
          archivedAt: null,
        },
      });
    });
  }

  async deleteCompatibility(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.deviceCompatibility.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new CompatibilityNotFoundError(id);
      }

      if (existing.compatibilityStatus === CompatibilityStatus.VERIFIED) {
        throw new CannotDeleteVerifiedCompatibilityError(id);
      }

      await tx.compatibilityEvidence.deleteMany({ where: { compatibilityId: id } });
      await tx.deviceCompatibility.delete({ where: { id } });
    });
  }

  async updateCompatibilityDetails(
    id: string,
    input: UpdateCompatibilityDetailsInput,
    rawPayload?: Record<string, unknown>
  ): Promise<DeviceCompatibility> {
    if (rawPayload) {
      if (rawPayload.compatibilityStatus !== undefined) {
        throw new ImmutableVerifiedStateError("compatibilityStatus");
      }
      if (rawPayload.verifiedById !== undefined) {
        throw new ImmutableVerifiedStateError("verifiedById");
      }
      if (rawPayload.verifiedAt !== undefined) {
        throw new ImmutableVerifiedStateError("verifiedAt");
      }
      if (rawPayload.deviceId !== undefined) {
        throw new ImmutableVerifiedStateError("deviceId");
      }
      if (rawPayload.partId !== undefined) {
        throw new ImmutableVerifiedStateError("partId");
      }
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.deviceCompatibility.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new CompatibilityNotFoundError(id);
      }

      return await tx.deviceCompatibility.update({
        where: { id },
        data: {
          technicalNotes: input.technicalNotes !== undefined ? input.technicalNotes?.trim() : existing.technicalNotes,
        },
      });
    });
  }

  async getCompatibilityById(
    id: string,
    options: GetCompatibilityOptions = {}
  ): Promise<(DeviceCompatibility & { evidences: CompatibilityEvidence[] }) | null> {
    const record = await prisma.deviceCompatibility.findUnique({
      where: { id },
      include: {
        evidences: {
          orderBy: { verifiedAt: "desc" },
        },
        device: true,
        part: true,
      },
    });

    if (!record) {
      return null;
    }

    if (!options.includeArchived && record.isArchived) {
      return null;
    }

    return record;
  }

  /**
   * Admin Statistics for the Compatibility Engine.
   */
  async getAdminStats() {
    const [total, verified, provisional, unverified, incompatible, archived] = await Promise.all([
      prisma.deviceCompatibility.count(),
      prisma.deviceCompatibility.count({
        where: {
          compatibilityStatus: CompatibilityStatus.VERIFIED,
          publishedAt: { not: null },
          suspendedAt: null,
          isArchived: false,
        },
      }),
      prisma.deviceCompatibility.count({ where: { compatibilityStatus: CompatibilityStatus.PROVISIONALLY_VERIFIED, isArchived: false } }),
      prisma.deviceCompatibility.count({ where: { compatibilityStatus: CompatibilityStatus.UNVERIFIED, isArchived: false } }),
      prisma.deviceCompatibility.count({ where: { compatibilityStatus: CompatibilityStatus.INCOMPATIBLE, isArchived: false } }),
      prisma.deviceCompatibility.count({ where: { isArchived: true } }),
    ]);

    const totalEvidences = await prisma.compatibilityEvidence.count();

    return {
      total,
      verified,
      provisional,
      unverified,
      incompatible,
      archived,
      pendingReview: unverified + provisional,
      totalEvidences,
    };
  }

  /**
   * Paginated Admin Compatibility Listing with filtering and search.
   */
  async listAdminCompatibilities(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: CompatibilityStatus;
    category?: PartCategory;
    verificationLevel?: VerificationLevel;
    isArchived?: boolean;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const rawSearch = params.search?.trim();

    const where: Prisma.DeviceCompatibilityWhereInput = {
      isArchived: params.isArchived !== undefined ? params.isArchived : undefined,
      compatibilityStatus: params.status || undefined,
      verificationLevel: params.verificationLevel || undefined,
      part: params.category ? { category: params.category } : undefined,
    };

    if (rawSearch) {
      where.OR = [
        { device: { modelNumber: { contains: rawSearch, mode: "insensitive" } } },
        { device: { commercialName: { contains: rawSearch, mode: "insensitive" } } },
        { device: { brand: { contains: rawSearch, mode: "insensitive" } } },
        { part: { name: { contains: rawSearch, mode: "insensitive" } } },
        { part: { manufacturerCode: { contains: rawSearch, mode: "insensitive" } } },
        { part: { partAliases: { has: rawSearch } } },
      ];
    }

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
          },
          _count: { select: { reviews: true } },
        },
        orderBy: [
          { updatedAt: "desc" },
        ],
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data: records.map((r) => ({
        id: r.id,
        compatibilityStatus: r.compatibilityStatus,
        compatibilityType: r.compatibilityType,
        verificationLevel: r.verificationLevel,
        technicalNotes: r.technicalNotes,
        createdById: r.createdById,
        verifiedById: r.verifiedById,
        verifiedAt: r.verifiedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        isArchived: r.isArchived,
        archivedAt: r.archivedAt,
        device: {
          id: r.device.id,
          brand: r.device.brand,
          commercialName: r.device.commercialName,
          modelNumber: r.device.modelNumber,
          networkVariant: r.device.networkVariant,
          region: r.device.region,
          boardRevision: r.device.boardRevision,
          releaseYear: r.device.releaseYear,
        },
        part: {
          id: r.part.id,
          name: r.part.name,
          category: r.part.category,
          manufacturerCode: r.part.manufacturerCode,
          partAliases: r.part.partAliases,
          specifications: r.part.specifications,
        },
        evidenceCount: r.evidences.length,
        reviewCount: r._count.reviews,
        evidences: r.evidences.map((e) => ({
          id: e.id,
          sourceType: e.sourceType,
          sourceReference: e.sourceReference,
          evidenceDetails: e.evidenceDetails,
          verifiedBy: e.verifiedBy,
          verifiedAt: e.verifiedAt,
          createdAt: e.createdAt,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Detailed view of a single compatibility record with full evidence audit.
   */
  async getAdminCompatibilityDetail(id: string) {
    const record = await prisma.deviceCompatibility.findUnique({
      where: { id },
      include: {
        device: true,
        part: true,
        evidences: {
          orderBy: { verifiedAt: "desc" },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
        },
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!record) {
      throw new CompatibilityNotFoundError(id);
    }

    return {
      id: record.id,
      compatibilityStatus: record.compatibilityStatus,
      compatibilityType: record.compatibilityType,
      verificationLevel: record.verificationLevel,
      technicalNotes: record.technicalNotes,
      createdById: record.createdById,
      verifiedById: record.verifiedById,
      verifiedAt: record.verifiedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      isArchived: record.isArchived,
      archivedAt: record.archivedAt,
      device: record.device,
      part: record.part,
      evidenceCount: record.evidences.length,
      reviewCount: record.reviews.length,
      evidences: record.evidences,
      reviews: record.reviews,
      auditEvents: record.auditEvents,
    };
  }
}

export const compatibilityService = new CompatibilityService();
