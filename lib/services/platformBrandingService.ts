import { prisma } from "@/lib/prisma";

const PLATFORM_BRANDING_ID = "GLOBAL";

interface PlatformBrandingRow {
  darkModeLogoBase64: string | null;
  darkModeLogoMimeType: string | null;
  darkModeLogoUpdatedAt: Date | null;
}

export interface PlatformBrandingSettings {
  hasDarkModeLogo: boolean;
  darkModeLogoMimeType: string | null;
  darkModeLogoUpdatedAt: Date | null;
}

const EMPTY_SETTINGS: PlatformBrandingSettings = {
  hasDarkModeLogo: false,
  darkModeLogoMimeType: null,
  darkModeLogoUpdatedAt: null,
};

async function getRow() {
  const rows = await prisma.$queryRaw<PlatformBrandingRow[]>`
    SELECT
      "darkModeLogoBase64",
      "darkModeLogoMimeType",
      "darkModeLogoUpdatedAt"
    FROM "PlatformBranding"
    WHERE "id" = ${PLATFORM_BRANDING_ID}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export const platformBrandingService = {
  async getSettings(): Promise<PlatformBrandingSettings> {
    try {
      const row = await getRow();
      if (!row) return EMPTY_SETTINGS;

      return {
        hasDarkModeLogo: Boolean(row.darkModeLogoBase64),
        darkModeLogoMimeType: row.darkModeLogoMimeType,
        darkModeLogoUpdatedAt: row.darkModeLogoUpdatedAt,
      };
    } catch {
      // Branding is non-critical. If the migration has not been applied yet,
      // the rest of the dashboard should continue to work with the fallback logo.
      return EMPTY_SETTINGS;
    }
  },

  async getDarkModeLogoAsset() {
    try {
      const row = await getRow();
      if (!row?.darkModeLogoBase64 || !row.darkModeLogoMimeType) return null;

      return {
        base64: row.darkModeLogoBase64,
        mimeType: row.darkModeLogoMimeType,
        updatedAt: row.darkModeLogoUpdatedAt,
      };
    } catch {
      return null;
    }
  },

  async setDarkModeLogo(base64: string, mimeType: string) {
    const updatedAt = new Date();

    await prisma.$executeRaw`
      INSERT INTO "PlatformBranding" (
        "id",
        "darkModeLogoBase64",
        "darkModeLogoMimeType",
        "darkModeLogoUpdatedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${PLATFORM_BRANDING_ID},
        ${base64},
        ${mimeType},
        ${updatedAt},
        ${updatedAt},
        ${updatedAt}
      )
      ON CONFLICT ("id") DO UPDATE SET
        "darkModeLogoBase64" = EXCLUDED."darkModeLogoBase64",
        "darkModeLogoMimeType" = EXCLUDED."darkModeLogoMimeType",
        "darkModeLogoUpdatedAt" = EXCLUDED."darkModeLogoUpdatedAt",
        "updatedAt" = EXCLUDED."updatedAt"
    `;

    return updatedAt;
  },

  async clearDarkModeLogo() {
    const updatedAt = new Date();

    await prisma.$executeRaw`
      INSERT INTO "PlatformBranding" (
        "id",
        "darkModeLogoBase64",
        "darkModeLogoMimeType",
        "darkModeLogoUpdatedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${PLATFORM_BRANDING_ID},
        NULL,
        NULL,
        NULL,
        ${updatedAt},
        ${updatedAt}
      )
      ON CONFLICT ("id") DO UPDATE SET
        "darkModeLogoBase64" = NULL,
        "darkModeLogoMimeType" = NULL,
        "darkModeLogoUpdatedAt" = NULL,
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  },
};
