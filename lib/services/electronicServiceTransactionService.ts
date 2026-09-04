import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ElectronicServiceProfitMode = "AUTO_DIFFERENCE" | "FIXED" | "PERCENTAGE" | "NONE";

export type ElectronicServiceProviderOption = {
  id: string;
  name: string;
  typeLabel: string | null;
  currencyCode: string;
  currentBalance: Prisma.Decimal;
  isActive: boolean;
};

export type ElectronicServiceTemplateRow = {
  id: string;
  shopId: string;
  providerId: string;
  providerName: string;
  currencyCode: string;
  providerBalance: Prisma.Decimal;
  providerActive: boolean;
  name: string;
  category: string;
  faceValue: Prisma.Decimal | null;
  providerCost: Prisma.Decimal;
  customerCharge: Prisma.Decimal;
  isActive: boolean;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ElectronicServiceTransactionRow = {
  id: string;
  providerId: string;
  providerName: string;
  templateId: string | null;
  category: string;
  serviceName: string;
  faceValue: Prisma.Decimal;
  providerCost: Prisma.Decimal;
  customerCharge: Prisma.Decimal;
  profit: Prisma.Decimal;
  profitMode: ElectronicServiceProfitMode;
  profitValue: Prisma.Decimal;
  customerPhone: string | null;
  reference: string | null;
  notes: string | null;
  status: "ACTIVE" | "VOID";
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: Date;
};

function decimal(value: string | number | Prisma.Decimal | null | undefined) {
  return new Prisma.Decimal(String(value ?? 0).replace(",", "."));
}

function money(value: string | number | Prisma.Decimal | null | undefined) {
  const result = decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (!result.isFinite()) throw new Error("القيمة المالية غير صحيحة.");
  return result;
}

function nullableText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function normalizedText(value: string, fallback: string) {
  const text = value.trim().replace(/\s+/g, " ");
  return text || fallback;
}

function ensureNonNegative(value: Prisma.Decimal, label: string) {
  if (!value.isFinite() || value.lt(0)) throw new Error(`${label} لا يمكن أن يكون سالباً.`);
}

async function getProviderOptions(shopId: string, activeOnly = true) {
  const activeFilter = activeOnly ? Prisma.sql`AND "isActive" = true` : Prisma.sql``;
  return prisma.$queryRaw<ElectronicServiceProviderOption[]>(Prisma.sql`
    SELECT "id", "name", "typeLabel", "currencyCode", "currentBalance", "isActive"
    FROM "ElectronicServiceProvider"
    WHERE "shopId" = ${shopId}::uuid ${activeFilter}
    ORDER BY "isActive" DESC, lower("name") ASC
  `);
}

async function listTemplates(shopId: string, includeInactive = true) {
  const activeFilter = includeInactive ? Prisma.sql`` : Prisma.sql`AND t."isActive" = true AND p."isActive" = true`;
  return prisma.$queryRaw<ElectronicServiceTemplateRow[]>(Prisma.sql`
    SELECT t."id", t."shopId", t."providerId", p."name" AS "providerName", p."currencyCode",
      p."currentBalance" AS "providerBalance", p."isActive" AS "providerActive",
      t."name", t."category", t."faceValue", t."providerCost", t."customerCharge",
      t."isActive", t."notes", t."createdByUserId", t."createdAt", t."updatedAt"
    FROM "ElectronicServiceTemplate" t
    JOIN "ElectronicServiceProvider" p ON p."id" = t."providerId" AND p."shopId" = t."shopId"
    WHERE t."shopId" = ${shopId}::uuid ${activeFilter}
    ORDER BY t."isActive" DESC, lower(t."category") ASC, lower(t."name") ASC
  `);
}

async function listRecentTransactions(shopId: string, limit = 30) {
  return prisma.$queryRaw<ElectronicServiceTransactionRow[]>`
    SELECT tx."id", tx."providerId", p."name" AS "providerName", tx."templateId", tx."category", tx."serviceName",
      tx."faceValue", tx."providerCost", tx."customerCharge", tx."profit", tx."profitMode", tx."profitValue",
      tx."customerPhone", tx."reference", tx."notes", tx."status", tx."createdByUserId", u."name" AS "createdByName", tx."createdAt"
    FROM "ElectronicServiceTransaction" tx
    JOIN "ElectronicServiceProvider" p ON p."id" = tx."providerId"
    LEFT JOIN "User" u ON u."id" = tx."createdByUserId"
    WHERE tx."shopId" = ${shopId}::uuid
    ORDER BY tx."createdAt" DESC
    LIMIT ${Math.max(1, Math.min(limit, 200))}
  `;
}

export const electronicServiceTransactionService = {
  async getExecutionData(shopId: string) {
    const [providers, templates, recentTransactions, todayRows] = await Promise.all([
      getProviderOptions(shopId, true),
      listTemplates(shopId, false),
      listRecentTransactions(shopId, 25),
      prisma.$queryRaw<Array<{ count: number; providerCost: Prisma.Decimal; customerCharge: Prisma.Decimal; profit: Prisma.Decimal }>>`
        SELECT COUNT(*)::int AS "count", COALESCE(SUM("providerCost"),0) AS "providerCost",
          COALESCE(SUM("customerCharge"),0) AS "customerCharge", COALESCE(SUM("profit"),0) AS "profit"
        FROM "ElectronicServiceTransaction"
        WHERE "shopId" = ${shopId}::uuid AND "status" = 'ACTIVE'
          AND "createdAt" >= date_trunc('day', NOW())
          AND "createdAt" < date_trunc('day', NOW()) + interval '1 day'
      `,
    ]);
    const today = todayRows[0];
    return {
      providers,
      templates,
      recentTransactions,
      today: {
        count: today?.count ?? 0,
        providerCost: Number(today?.providerCost ?? 0),
        customerCharge: Number(today?.customerCharge ?? 0),
        profit: Number(today?.profit ?? 0),
      },
    };
  },

  async getTemplateManagementData(shopId: string) {
    const [providers, templates] = await Promise.all([getProviderOptions(shopId, false), listTemplates(shopId, true)]);
    return { providers, templates };
  },

  async createTemplate(shopId: string, userId: string, input: {
    providerId: string;
    name: string;
    category: string;
    faceValue?: string | null;
    providerCost: string;
    customerCharge: string;
    notes?: string | null;
  }) {
    const name = normalizedText(input.name, "خدمة محفوظة");
    const category = normalizedText(input.category, "أخرى");
    const faceValue = input.faceValue?.trim() ? money(input.faceValue) : null;
    const providerCost = money(input.providerCost);
    const customerCharge = money(input.customerCharge);
    if (faceValue) ensureNonNegative(faceValue, "قيمة الخدمة");
    ensureNonNegative(providerCost, "تكلفة المزود");
    ensureNonNegative(customerCharge, "المبلغ على العميل");

    return prisma.$transaction(async (tx) => {
      const providerRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "ElectronicServiceProvider"
        WHERE "shopId" = ${shopId}::uuid AND "id" = ${input.providerId}::uuid
        LIMIT 1
      `;
      if (!providerRows[0]) throw new Error("مزود الخدمة غير موجود.");

      const duplicate = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "ElectronicServiceTemplate"
        WHERE "shopId" = ${shopId}::uuid AND "providerId" = ${input.providerId}::uuid
          AND lower(trim("name")) = lower(trim(${name}))
          AND (("faceValue" IS NULL AND ${faceValue}::numeric IS NULL) OR "faceValue" = ${faceValue})
        LIMIT 1
      `;
      if (duplicate[0]) throw new Error("هذه الخدمة محفوظة مسبقاً لنفس المزود والقيمة.");

      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "ElectronicServiceTemplate" (
          "shopId", "providerId", "name", "category", "faceValue", "providerCost", "customerCharge",
          "isActive", "notes", "createdByUserId", "createdAt", "updatedAt"
        ) VALUES (
          ${shopId}::uuid, ${input.providerId}::uuid, ${name}, ${category}, ${faceValue}, ${providerCost}, ${customerCharge},
          true, ${nullableText(input.notes)}, ${userId}::uuid, NOW(), NOW()
        ) RETURNING "id"
      `;
      return rows[0]?.id;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
  },

  async setTemplateActive(shopId: string, templateId: string, isActive: boolean) {
    const changed = await prisma.$executeRaw`
      UPDATE "ElectronicServiceTemplate" SET "isActive" = ${isActive}, "updatedAt" = NOW()
      WHERE "shopId" = ${shopId}::uuid AND "id" = ${templateId}::uuid
    `;
    if (changed === 0) throw new Error("الخدمة المحفوظة غير موجودة.");
  },

  async createTransaction(shopId: string, userId: string, input:
    | { mode: "TEMPLATE"; templateId: string; customerPhone?: string | null; reference?: string | null; notes?: string | null }
    | { mode: "FREE"; providerId: string; category: string; serviceName: string; faceValue: string; providerCost: string; profitMode: ElectronicServiceProfitMode; profitValue?: string | null; customerCharge?: string | null; customerPhone?: string | null; reference?: string | null; notes?: string | null }
  ) {
    return prisma.$transaction(async (tx) => {
      let providerId: string;
      let templateId: string | null = null;
      let category: string;
      let serviceName: string;
      let faceValue: Prisma.Decimal;
      let providerCost: Prisma.Decimal;
      let customerCharge: Prisma.Decimal;
      let profitMode: ElectronicServiceProfitMode;
      let profitValue = new Prisma.Decimal(0);

      if (input.mode === "TEMPLATE") {
        const rows = await tx.$queryRaw<Array<{
          id: string; providerId: string; name: string; category: string; faceValue: Prisma.Decimal | null;
          providerCost: Prisma.Decimal; customerCharge: Prisma.Decimal; isActive: boolean;
        }>>`
          SELECT "id", "providerId", "name", "category", "faceValue", "providerCost", "customerCharge", "isActive"
          FROM "ElectronicServiceTemplate"
          WHERE "shopId" = ${shopId}::uuid AND "id" = ${input.templateId}::uuid
          LIMIT 1
        `;
        const template = rows[0];
        if (!template || !template.isActive) throw new Error("الخدمة المحفوظة غير موجودة أو متوقفة.");
        providerId = template.providerId;
        templateId = template.id;
        category = template.category;
        serviceName = template.name;
        faceValue = money(template.faceValue ?? template.customerCharge);
        providerCost = money(template.providerCost);
        customerCharge = money(template.customerCharge);
        profitMode = "AUTO_DIFFERENCE";
        profitValue = customerCharge.sub(providerCost).abs().toDecimalPlaces(2);
      } else {
        providerId = input.providerId;
        category = normalizedText(input.category, "أخرى");
        serviceName = normalizedText(input.serviceName, "خدمة إلكترونية");
        faceValue = money(input.faceValue);
        providerCost = money(input.providerCost);
        profitMode = input.profitMode;
        profitValue = decimal(input.profitValue || 0);
        ensureNonNegative(faceValue, "قيمة الخدمة");
        ensureNonNegative(providerCost, "تكلفة المزود");
        ensureNonNegative(profitValue, "قيمة الربح أو النسبة");

        if (profitMode === "NONE") {
          customerCharge = providerCost;
          profitValue = new Prisma.Decimal(0);
        } else if (profitMode === "FIXED") {
          customerCharge = providerCost.add(profitValue).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        } else if (profitMode === "PERCENTAGE") {
          customerCharge = providerCost.add(faceValue.mul(profitValue).div(100)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        } else {
          customerCharge = money(input.customerCharge);
          profitValue = customerCharge.sub(providerCost).abs().toDecimalPlaces(2);
        }
      }

      ensureNonNegative(faceValue, "قيمة الخدمة");
      ensureNonNegative(providerCost, "تكلفة المزود");
      ensureNonNegative(customerCharge, "المبلغ على العميل");
      const profit = customerCharge.sub(providerCost).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      const providerRows = await tx.$queryRaw<Array<{ id: string; currentBalance: Prisma.Decimal; isActive: boolean; currencyCode: string }>>`
        SELECT "id", "currentBalance", "isActive", "currencyCode"
        FROM "ElectronicServiceProvider"
        WHERE "shopId" = ${shopId}::uuid AND "id" = ${providerId}::uuid
        FOR UPDATE
      `;
      const provider = providerRows[0];
      if (!provider) throw new Error("مزود الخدمة غير موجود.");
      if (!provider.isActive) throw new Error("مزود الخدمة متوقف حالياً ولا يمكن تنفيذ عمليات جديدة عليه.");
      if (provider.currentBalance.lt(providerCost)) throw new Error("رصيد المزود غير كافٍ لتغطية تكلفة هذه الخدمة.");

      const transactionRows = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "ElectronicServiceTransaction" (
          "shopId", "providerId", "templateId", "createdByUserId", "category", "serviceName", "faceValue",
          "providerCost", "customerCharge", "profit", "profitMode", "profitValue", "customerPhone", "reference", "notes", "status", "createdAt"
        ) VALUES (
          ${shopId}::uuid, ${providerId}::uuid, ${templateId}::uuid, ${userId}::uuid, ${category}, ${serviceName}, ${faceValue},
          ${providerCost}, ${customerCharge}, ${profit}, ${profitMode}, ${profitValue}, ${nullableText(input.customerPhone)}, ${nullableText(input.reference)}, ${nullableText(input.notes)}, 'ACTIVE', NOW()
        ) RETURNING "id"
      `;
      const transactionId = transactionRows[0]?.id;
      if (!transactionId) throw new Error("تعذر تسجيل عملية الخدمة الإلكترونية.");

      if (providerCost.gt(0)) {
        const after = provider.currentBalance.sub(providerCost);
        await tx.$executeRaw`
          UPDATE "ElectronicServiceProvider" SET "currentBalance" = ${after}, "updatedAt" = NOW()
          WHERE "shopId" = ${shopId}::uuid AND "id" = ${providerId}::uuid
        `;
        await tx.$executeRaw`
          INSERT INTO "ElectronicServiceProviderMovement" (
            "shopId", "providerId", "createdByUserId", "type", "direction", "amount", "balanceBefore", "balanceAfter",
            "description", "reference", "sourceType", "sourceId", "createdAt"
          ) VALUES (
            ${shopId}::uuid, ${providerId}::uuid, ${userId}::uuid, 'SERVICE_DEBIT', 'OUT', ${providerCost},
            ${provider.currentBalance}, ${after}, ${`تنفيذ خدمة: ${serviceName}`}, ${nullableText(input.reference)},
            'ELECTRONIC_SERVICE', ${transactionId}, NOW()
          )
        `;
      }

      return {
        id: transactionId,
        providerId,
        serviceName,
        faceValue: Number(faceValue),
        providerCost: Number(providerCost),
        customerCharge: Number(customerCharge),
        profit: Number(profit),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
  },
};
