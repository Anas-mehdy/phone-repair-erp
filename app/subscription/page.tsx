import { SubscriptionBillingInterval, SubscriptionPlan } from "@prisma/client";
import { requirePermission } from "@/lib/auth/context";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";
import { subscriptionOfferService } from "@/lib/services/subscriptionOfferService";
import { prisma } from "@/lib/prisma";
import { SubscriptionView } from "./_subscription-view";

export const dynamic = "force-dynamic";

interface ManagedPartnerRow {
  partnerId: string;
  partnerName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}

export default async function SubscriptionPage() {
  const auth = await requirePermission("subscription:manage");

  const partnerRows = await prisma.$queryRaw<ManagedPartnerRow[]>`
    SELECT
      p."id" AS "partnerId",
      p."name" AS "partnerName",
      p."contactName" AS "contactName",
      p."phone" AS "phone",
      p."email" AS "email"
    FROM "Shop" s
    INNER JOIN "Partner" p ON p."id" = s."partnerId"
    WHERE s."id" = ${auth.shop.id}::uuid
      AND s."deletedAt" IS NULL
      AND p."deletedAt" IS NULL
    LIMIT 1
  `;

  const managedPartner = partnerRows[0];
  if (managedPartner) {
    return (
      <div className="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-xl">
              🤝
            </div>
            <h1 className="text-xl font-black text-slate-900">
              اشتراك متجرك مُدار عن طريق الوكيل
            </h1>
            <p className="text-sm font-semibold leading-7 text-slate-600">
              الأسعار وعروض الاشتراك المباشرة من مسار لا تظهر للمتاجر التابعة للوكلاء.
              للتجديد أو إدارة الاشتراك تواصل مع الوكيل المسؤول عن متجرك.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="font-black text-slate-900">{managedPartner.partnerName}</div>
            {managedPartner.contactName ? (
              <div className="mt-1 font-semibold text-slate-600">
                المسؤول: {managedPartner.contactName}
              </div>
            ) : null}
            {managedPartner.phone ? (
              <div className="mt-1 font-semibold text-slate-600" dir="ltr">
                {managedPartner.phone}
              </div>
            ) : null}
            {managedPartner.email ? (
              <div className="mt-1 font-semibold text-slate-600" dir="ltr">
                {managedPartner.email}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const [entitlement, offer, shopDetails, subscriptionRow] = await Promise.all([
    entitlementService.getEntitlementContext(auth.shop.id),
    subscriptionOfferService.getOfferSettings(),
    prisma.shop.findUnique({
      where: { id: auth.shop.id },
      select: { countryCode: true },
    }),
    prisma.subscription.findUnique({
      where: { shopId: auth.shop.id },
      select: {
        foundersOfferEligible: true,
        foundersOfferGrantedAt: true,
        foundersOfferSixMonthsDiscountPercent: true,
        foundersOfferAnnualDiscountPercent: true,
      },
    }),
  ]);

  const countryCode = shopDetails?.countryCode || "SA";

  const rawPrices = await prisma.subscriptionPrice.findMany({
    where: {
      plan: SubscriptionPlan.PROFESSIONAL,
      countryCode: {
        in: [countryCode, "ZZ"],
      },
    },
  });

  const countryPrices = rawPrices.filter(
    (p) => p.countryCode === countryCode,
  );
  const fallbackPrices = rawPrices.filter((p) => p.countryCode === "ZZ");

  const effectivePrices =
    countryPrices.length > 0 ? countryPrices : fallbackPrices;

  const sixMonthsRaw = effectivePrices.find(
    (p) => p.billingInterval === SubscriptionBillingInterval.SIX_MONTHS,
  );
  const annualRaw = effectivePrices.find(
    (p) => p.billingInterval === SubscriptionBillingInterval.ANNUAL,
  );

  const sixMonthsPrice = sixMonthsRaw
    ? {
        amount: Number(sixMonthsRaw.amount),
        currencyCode: sixMonthsRaw.currencyCode,
      }
    : null;

  const annualPrice = annualRaw
    ? {
        amount: Number(annualRaw.amount),
        currencyCode: annualRaw.currencyCode,
      }
    : null;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <SubscriptionView
        shop={{
          name: auth.shop.name,
          countryCode,
          currency: auth.shop.currency,
        }}
        entitlement={entitlement}
        offer={offer}
        foundersOfferSnapshot={subscriptionRow}
        sixMonthsPrice={sixMonthsPrice}
        annualPrice={annualPrice}
      />
    </div>
  );
}
