import { CompatibilityStatus, PartCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const AUTO_CORROBORATION_ACTOR = "system:auto-corroboration-v1";
export const AUTO_CORROBORATION_METHOD = "AUTOMATED_MULTI_SOURCE_FAMILY";

export interface ScreenFamilyCandidate {
  partId: string;
  compatibilityIds: string[];
  deviceIds: string[];
  sourceIdentities: string[];
}

export interface CorroborationDecision {
  familyKey: string;
  partIds: string[];
  compatibilityIds: string[];
  independentSourceCount: number;
}

function cleanIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function planAutomaticCorroboration(
  candidates: ScreenFamilyCandidate[],
): CorroborationDecision[] {
  const families = new Map<string, ScreenFamilyCandidate[]>();

  for (const candidate of candidates) {
    const deviceIds = [...new Set(candidate.deviceIds)].sort();
    const sources = [...new Set(candidate.sourceIdentities.map(cleanIdentity).filter(Boolean))];
    if (deviceIds.length < 2 || sources.length === 0 || candidate.compatibilityIds.length === 0) continue;

    const familyKey = deviceIds.join(":");
    const matches = families.get(familyKey) || [];
    matches.push({ ...candidate, deviceIds, sourceIdentities: sources });
    families.set(familyKey, matches);
  }

  const decisions: CorroborationDecision[] = [];
  for (const [familyKey, matches] of families) {
    const independentSources = new Set(matches.flatMap((candidate) => candidate.sourceIdentities));
    if (independentSources.size < 2) continue;

    decisions.push({
      familyKey,
      partIds: [...new Set(matches.map((candidate) => candidate.partId))],
      compatibilityIds: [...new Set(matches.flatMap((candidate) => candidate.compatibilityIds))],
      independentSourceCount: independentSources.size,
    });
  }

  return decisions;
}

function sourceIdentity(source: { publisher: string | null; name: string; url: string | null }): string {
  if (source.publisher?.trim()) return source.publisher;
  if (source.url) {
    try {
      return new URL(source.url).hostname.replace(/^www\./, "");
    } catch {
      // Fall through to the registered source name.
    }
  }
  return source.name;
}

function isInstallableScreen(specifications: Prisma.JsonValue | null): boolean {
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) return false;
  return (specifications as Record<string, unknown>).recordKind === "INSTALLABLE_SCREEN";
}

export class ScreenAutoCorroborationService {
  async run() {
    const parts = await prisma.part.findMany({
      where: { category: PartCategory.SCREEN, isArchived: false },
      include: {
        compatibilities: {
          where: {
            isArchived: false,
            compatibilityStatus: {
              in: [CompatibilityStatus.UNVERIFIED, CompatibilityStatus.PROVISIONALLY_VERIFIED],
            },
          },
          include: {
            device: { select: { id: true } },
            evidences: {
              include: {
                source: { select: { publisher: true, name: true, url: true, trustLevel: true, isActive: true } },
              },
            },
          },
        },
      },
    });

    const candidates: ScreenFamilyCandidate[] = parts
      .filter((part) => isInstallableScreen(part.specifications))
      .map((part) => ({
        partId: part.id,
        compatibilityIds: part.compatibilities.map((compatibility) => compatibility.id),
        deviceIds: part.compatibilities.map((compatibility) => compatibility.device.id),
        sourceIdentities: part.compatibilities.flatMap((compatibility) =>
          compatibility.evidences
            .filter((evidence) => evidence.source?.isActive && (evidence.source.trustLevel || 0) >= 3)
            .map((evidence) => sourceIdentity(evidence.source!)),
        ),
      }));

    const decisions = planAutomaticCorroboration(candidates);
    const now = new Date();
    let publishedRelationships = 0;

    await prisma.$transaction(async (tx) => {
      for (const decision of decisions) {
        const updated = await tx.deviceCompatibility.updateMany({
          where: {
            id: { in: decision.compatibilityIds },
            compatibilityStatus: {
              in: [CompatibilityStatus.UNVERIFIED, CompatibilityStatus.PROVISIONALLY_VERIFIED],
            },
            isArchived: false,
            suspendedAt: null,
          },
          data: {
            compatibilityStatus: CompatibilityStatus.PROVISIONALLY_VERIFIED,
            publishedAt: now,
            publishedById: AUTO_CORROBORATION_ACTOR,
            corroboratedSourceCount: decision.independentSourceCount,
            verificationMethod: AUTO_CORROBORATION_METHOD,
          },
        });
        publishedRelationships += updated.count;

        const existingEvents = await tx.compatibilityAuditEvent.findMany({
          where: {
            compatibilityId: { in: decision.compatibilityIds },
            action: "AUTO_CORROBORATED",
          },
          select: { compatibilityId: true },
        });
        const recorded = new Set(existingEvents.map((event) => event.compatibilityId));
        const missing = decision.compatibilityIds.filter((id) => !recorded.has(id));
        if (missing.length > 0) {
          await tx.compatibilityAuditEvent.createMany({
            data: missing.map((compatibilityId) => ({
              compatibilityId,
              actorId: AUTO_CORROBORATION_ACTOR,
              action: "AUTO_CORROBORATED",
              fromStatus: CompatibilityStatus.UNVERIFIED,
              toStatus: CompatibilityStatus.PROVISIONALLY_VERIFIED,
              reason: "Exact device family independently listed by multiple trusted suppliers.",
              metadata: {
                familyKey: decision.familyKey,
                independentSourceCount: decision.independentSourceCount,
                partIds: decision.partIds,
              },
            })),
          });
        }
      }
    }, { timeout: 60_000 });

    return {
      scannedParts: parts.length,
      corroboratedFamilies: decisions.length,
      publishedRelationships,
      decisions,
    };
  }
}

export const screenAutoCorroborationService = new ScreenAutoCorroborationService();
