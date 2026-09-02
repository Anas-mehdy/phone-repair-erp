import { SubscriptionBillingInterval, SubscriptionPlan } from "@prisma/client";
import { requirePermission } from "@/lib/auth/context";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";
import { subscriptionOfferService } from "@/lib/services/subscriptionOfferService";
import { lifetimeSubscriptionService } from "@/lib/services/lifetimeSubscriptionService";
import { prisma } from "@/lib/prisma";
import { SubscriptionView } from "./_subscription-view";
import { TrialCreditNote } from "./_trial-credit-note";
import { LifetimePlanCard } from "./_lifetime-plan-card";

export const dynamic = "force-dynamic";

interface ManagedPartnerRow {
  partnerId: string;
  partnerName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}

export default async function SubscriptionPage() {
  const auth = await requirePermission("subscription:manage");

  const partnerRows = await prisma.$queryRaw<ManagedPartnerRow[]>`
    SELECT s."partnerId" AS "partnerId", p."name" AS "partnerName", p."contactName" AS "contactName", p."phone" AS "phone", p."email" AS "email"
    FROM "Shop" s LEFT JOIN "Partner" p ON p."id" = s."partnerId"
    WHERE s."id" = ${auth.shop.id}::uuid AND s."deletedAt" IS NULL AND s."partnerId" IS NOT NULL LIMIT 1
  `;

  const managedPartner = partnerRows[0];
  if (managedPartner) {
    return <div className="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:px-8"><div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-sm sm:p-8"><div className="space-y-3 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-xl">🤝</div><h1 className="text-xl font-black text-slate-900">اشتراك متجرك مُدار عن طريق الوكيل</h1><p className="text-sm font-semibold leading-7 text-slate-600">الأسعار وعروض الاشتراك المباشرة من مسار لا تظهر للمتاجر التابعة للوكلاء. للتجديد أو إدارة الاشتراك تواصل مع الوكيل المسؤول عن متجرك.</p></div><div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"><div className="font-black text-slate-900">{managedPartner.partnerName ?? "الوكيل المسؤول عن المتجر"}</div>{managedPartner.contactName ? <div className="mt-1 font-semibold text-slate-600">المسؤول: {managedPartner.contactName}</div> : null}{managedPartner.phone ? <div className="mt-1 font-semibold text-slate-600" dir="ltr">{managedPartner.phone}</div> : null}{managedPartner.email ? <div className="mt-1 font-semibold text-slate-600" dir="ltr">{managedPartner.email}</div> : null}</div></div></div>;
  }

  const [entitlement, offer, shopDetails, subscriptionRow] = await Promise.all([
    entitlementService.getEntitlementContext(auth.shop.id),
    subscriptionOfferService.getOfferSettings(),
    prisma.shop.findUnique({ where: { id: auth.shop.id }, select: { countryCode: true } }),
    prisma.subscription.findUnique({ where: { shopId: auth.shop.id }, select: { foundersOfferEligible: true, foundersOfferGrantedAt: true, foundersOfferSixMonthsDiscountPercent: true, foundersOfferAnnualDiscountPercent: true } }),
  ]);

  const countryCode = shopDetails?.countryCode || "SA";
  const [rawPrices, lifetimeRaw] = await Promise.all([
    prisma.subscriptionPrice.findMany({ where: { plan: SubscriptionPlan.PROFESSIONAL, countryCode: { in: [countryCode, "ZZ"] } } }),
    lifetimeSubscriptionService.getLifetimePriceForCountry(countryCode),
  ]);

  const countryPrices = rawPrices.filter((p) => p.countryCode === countryCode);
  const fallbackPrices = rawPrices.filter((p) => p.countryCode === "ZZ");
  const effectivePrices = countryPrices.length > 0 ? countryPrices : fallbackPrices;
  const sixMonthsRaw = effectivePrices.find((p) => p.billingInterval === SubscriptionBillingInterval.SIX_MONTHS);
  const annualRaw = effectivePrices.find((p) => p.billingInterval === SubscriptionBillingInterval.ANNUAL);
  const sixMonthsPrice = sixMonthsRaw ? { amount: Number(sixMonthsRaw.amount), currencyCode: sixMonthsRaw.currencyCode } : null;
  const annualPrice = annualRaw ? { amount: Number(annualRaw.amount), currencyCode: annualRaw.currencyCode } : null;
  const lifetimePrice = lifetimeRaw ? { amount: Number(lifetimeRaw.amount), currencyCode: lifetimeRaw.currencyCode } : null;

  // Keep the regular plans exactly as they are, but do not expose the manual 50-slot quota there.
  const regularPlansOffer = {
    ...offer,
    isActive: false,
    totalEligible: 0,
    remainingEligible: 0,
    claimedEligible: 0,
  };

  return <div className="py-6 px-4 sm:px-6 lg:px-8">
    {entitlement.subscription.effectiveStatus === "TRIALING" ? <div className="mx-auto max-w-6xl"><TrialCreditNote /></div> : null}
    <LifetimePlanCard shopName={auth.shop.name} price={lifetimePrice} totalEligible={offer.totalEligible} remainingEligible={offer.remainingEligible} isActive={offer.isActive} />
    <SubscriptionView shop={{ name: auth.shop.name, countryCode, currency: auth.shop.currency }} entitlement={entitlement} offer={regularPlansOffer} foundersOfferSnapshot={subscriptionRow} sixMonthsPrice={sixMonthsPrice} annualPrice={annualPrice} />
  </div>;
}
