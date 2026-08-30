import { randomUUID } from "node:crypto";
import {
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { requirePartnerSession } from "@/lib/partner-auth";
import { prisma } from "@/lib/prisma";
import { buildPartnerWholesaleQuote } from "@/lib/services/partnerPricingService";
import { calculatePaidActivationEnd } from "@/lib/services/subscriptionAdminService";

export type PartnerActivationRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED";

export interface PartnerActivationRequestRecord {
  id: string;
  partnerId: string;
  shopId: string;
  billingInterval: SubscriptionBillingInterval;
  status: PartnerActivationRequestStatus;
  priceSourceCountryCode: string;
  baseAmount: unknown;
  discountPercent: unknown;
  discountAmount: unknown;
  payableAmount: unknown;
  currencyCode: string;
  requestedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  canceledAt: Date | null;
  decidedById: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerActivationRequestView
  extends Omit<
    PartnerActivationRequestRecord,
    "baseAmount" | "discountPercent" | "discountAmount" | "payableAmount"
  > {
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  payableAmount: number;
  partnerName?: string;
  partnerCode?: string;
  shopName?: string;
}

function trimNullable(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function mapRequest(row: PartnerActivationRequestRecord): PartnerActivationRequestView {
  return {
    ...row,
    baseAmount: Number(row.baseAmount),
    discountPercent: Number(row.discountPercent),
    discountAmount: Number(row.discountAmount),
    payableAmount: Number(row.payableAmount),
  };
}

async function insertRequestFromTrustedIdentity(input: {
  partnerId: string;
  shopId: string;
  billingInterval: SubscriptionBillingInterval;
  adminNotes?: string | null;
}): Promise<PartnerActivationRequestView> {
  const quote = await buildPartnerWholesaleQuote({
    partnerId: input.partnerId,
    shopId: input.shopId,
    billingInterval: input.billingInterval,
  });

  const id = randomUUID();
  const rows = await prisma.$queryRaw<PartnerActivationRequestRecord[]>`
    INSERT INTO "PartnerActivationRequest" (
      "id", "partnerId", "shopId", "billingInterval", "status",
      "priceSourceCountryCode", "baseAmount", "discountPercent",
      "discountAmount", "payableAmount", "currencyCode",
      "requestedAt", "adminNotes", "createdAt", "updatedAt"
    ) VALUES (
      ${id}::uuid,
      ${quote.partnerId}::uuid,
      ${quote.shopId}::uuid,
      ${quote.billingInterval}::"SubscriptionBillingInterval",
      'PENDING'::"PartnerActivationRequestStatus",
      ${quote.priceSourceCountryCode},
      ${quote.baseAmount},
      ${quote.discountPercent},
      ${quote.discountAmount},
      ${quote.payableAmount},
      ${quote.currencyCode},
      NOW(),
      ${trimNullable(input.adminNotes)},
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  return mapRequest(rows[0]);
}

export async function createPartnerActivationRequest(input: {
  partnerId: string;
  shopId: string;
  billingInterval: SubscriptionBillingInterval;
  adminNotes?: string | null;
}): Promise<PartnerActivationRequestView> {
  await requireSuperAdmin();
  return insertRequestFromTrustedIdentity(input);
}

export async function createPartnerActivationRequestForPartner(input: {
  shopId: string;
  billingInterval: SubscriptionBillingInterval;
}): Promise<PartnerActivationRequestView> {
  const session = await requirePartnerSession();
  return insertRequestFromTrustedIdentity({
    partnerId: session.partnerId,
    shopId: input.shopId,
    billingInterval: input.billingInterval,
  });
}

export async function listPartnerActivationRequests(): Promise<PartnerActivationRequestView[]> {
  await requireSuperAdmin();

  const rows = await prisma.$queryRaw<
    Array<
      PartnerActivationRequestRecord & {
        partnerName: string;
        partnerCode: string;
        shopName: string;
      }
    >
  >`
    SELECT
      r.*,
      p."name" AS "partnerName",
      p."code" AS "partnerCode",
      s."name" AS "shopName"
    FROM "PartnerActivationRequest" r
    JOIN "Partner" p ON p."id" = r."partnerId"
    JOIN "Shop" s ON s."id" = r."shopId"
    ORDER BY r."requestedAt" DESC
  `;

  return rows.map((row) => ({
    ...mapRequest(row),
    partnerName: row.partnerName,
    partnerCode: row.partnerCode,
    shopName: row.shopName,
  }));
}

export async function approvePartnerActivationRequest(input: {
  requestId: string;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  adminNotes?: string | null;
  extraDays?: number;
}, now = new Date()): Promise<PartnerActivationRequestView> {
  const adminSession = await requireSuperAdmin();

  if (!/^[0-9a-f-]{36}$/i.test(input.requestId)) {
    throw new Error("معرف طلب التفعيل غير صالح.");
  }

  const extraDays = input.extraDays ?? 0;
  if (!Number.isInteger(extraDays) || extraDays < 0 || extraDays > 3660) {
    throw new Error("عدد الأيام الإضافية غير صالح.");
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<
        PartnerActivationRequestRecord & {
          currentPartnerId: string | null;
          partnerStatus: "ACTIVE" | "SUSPENDED";
        }
      >
    >`
      SELECT
        r.*,
        s."partnerId" AS "currentPartnerId",
        p."status"::text AS "partnerStatus"
      FROM "PartnerActivationRequest" r
      JOIN "Shop" s ON s."id" = r."shopId"
      JOIN "Partner" p ON p."id" = r."partnerId"
      WHERE r."id" = ${input.requestId}::uuid
      FOR UPDATE OF r
    `;

    const request = rows[0];
    if (!request) throw new Error("طلب التفعيل غير موجود.");
    if (request.status !== "PENDING") {
      throw new Error("لا يمكن اعتماد طلب تفعيل تمت معالجته مسبقاً.");
    }
    if (request.currentPartnerId !== request.partnerId) {
      throw new Error("تم تغيير الوكيل المرتبط بالمتجر بعد إنشاء الطلب.");
    }
    if (request.partnerStatus !== "ACTIVE") {
      throw new Error("لا يمكن اعتماد طلب لوكيل موقوف.");
    }

    const subscription = await tx.subscription.findUnique({ where: { shopId: request.shopId } });
    if (!subscription) throw new Error("لم يتم العثور على اشتراك لهذا المتجر.");

    const currentPeriodStartedAt = new Date(now);
    const currentPeriodEndsAt = calculatePaidActivationEnd(
      currentPeriodStartedAt,
      request.billingInterval,
      extraDays,
      subscription.status,
      subscription.trialEndsAt,
    );

    await tx.subscription.update({
      where: { shopId: request.shopId },
      data: {
        plan: SubscriptionPlan.PROFESSIONAL,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: request.billingInterval,
        currentPeriodStartedAt,
        currentPeriodEndsAt,
        activatedAt: now,
        activatedById: adminSession.userId,
        canceledAt: null,
        gracePeriodEndsAt: null,
        paymentReference: trimNullable(input.paymentReference),
        paymentMethod: trimNullable(input.paymentMethod),
        adminNotes: trimNullable(input.adminNotes),
      },
    });

    const approvedRows = await tx.$queryRaw<PartnerActivationRequestRecord[]>`
      UPDATE "PartnerActivationRequest"
      SET
        "status" = 'APPROVED'::"PartnerActivationRequestStatus",
        "approvedAt" = ${now},
        "decidedById" = ${adminSession.userId}::uuid,
        "paymentReference" = ${trimNullable(input.paymentReference)},
        "paymentMethod" = ${trimNullable(input.paymentMethod)},
        "adminNotes" = ${trimNullable(input.adminNotes)},
        "updatedAt" = ${now}
      WHERE "id" = ${input.requestId}::uuid
      RETURNING *
    `;

    return mapRequest(approvedRows[0]);
  });
}

export async function rejectPartnerActivationRequest(
  requestId: string,
  adminNotes?: string | null,
  now = new Date(),
): Promise<PartnerActivationRequestView> {
  const adminSession = await requireSuperAdmin();
  const rows = await prisma.$queryRaw<PartnerActivationRequestRecord[]>`
    UPDATE "PartnerActivationRequest"
    SET "status" = 'REJECTED'::"PartnerActivationRequestStatus",
        "rejectedAt" = ${now}, "decidedById" = ${adminSession.userId}::uuid,
        "adminNotes" = ${trimNullable(adminNotes)}, "updatedAt" = ${now}
    WHERE "id" = ${requestId}::uuid AND "status" = 'PENDING'::"PartnerActivationRequestStatus"
    RETURNING *
  `;
  if (!rows[0]) throw new Error("الطلب غير موجود أو تمت معالجته مسبقاً.");
  return mapRequest(rows[0]);
}

export async function cancelPartnerActivationRequest(
  requestId: string,
  adminNotes?: string | null,
  now = new Date(),
): Promise<PartnerActivationRequestView> {
  await requireSuperAdmin();
  const rows = await prisma.$queryRaw<PartnerActivationRequestRecord[]>`
    UPDATE "PartnerActivationRequest"
    SET "status" = 'CANCELED'::"PartnerActivationRequestStatus",
        "canceledAt" = ${now}, "adminNotes" = ${trimNullable(adminNotes)}, "updatedAt" = ${now}
    WHERE "id" = ${requestId}::uuid AND "status" = 'PENDING'::"PartnerActivationRequestStatus"
    RETURNING *
  `;
  if (!rows[0]) throw new Error("الطلب غير موجود أو تمت معالجته مسبقاً.");
  return mapRequest(rows[0]);
}

export const partnerActivationRequestService = {
  createPartnerActivationRequest,
  createPartnerActivationRequestForPartner,
  listPartnerActivationRequests,
  approvePartnerActivationRequest,
  rejectPartnerActivationRequest,
  cancelPartnerActivationRequest,
};
