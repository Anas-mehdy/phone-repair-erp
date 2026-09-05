import { onboardingDestination } from "@/lib/onboarding/navigation";
import type { OnboardingJob } from "@/lib/onboarding/jobs";

export type SmartEmptyStateCopy = {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
};

const COPY_BY_JOB: Record<OnboardingJob, Omit<SmartEmptyStateCopy, "actionHref">> = {
  REPAIRS: {
    title: "ابدأ بأول جهاز فعلي",
    description: "سجّل اسم العميل والجهاز والمشكلة فقط. بعدها يريك مسار التتبع والـ QR وتغيير الحالة بدون ما تضيع بين كل إعدادات الصيانة.",
    actionLabel: "سجّل أول جهاز",
  },
  SALES: {
    title: "سجّل أول عملية بيع حقيقية",
    description: "ابدأ ببند واحد وسعره فقط. لا تحتاج تجهيز عميل أو محفظة أو مخزون كامل قبل ما تشوف أول قيمة من نقطة البيع.",
    actionLabel: "نفّذ أول بيع",
  },
  INVENTORY: {
    title: "أدخل أول صنف موجود عندك فعلياً",
    description: "اكتب اسم الصنف والكمية الحالية. مسار يسجل الرصيد الافتتاحي كحركة مخزون حقيقية ويبدأ تاريخ الصنف من هناك.",
    actionLabel: "أضف أول صنف",
  },
  WALLETS: {
    title: "ابدأ بمحفظة ثم أول حركة حقيقية",
    description: "أنشئ المحفظة برصيدها الحالي، وبعدها سجّل أول إيداع أو سحب فعلي حتى تشاهد أثر الحركة على الرصيد.",
    actionLabel: "ابدأ إعداد المحافظ",
  },
  DEBTS: {
    title: "سجّل أول دين حقيقي",
    description: "اختر عميلاً ومبلغاً مستحقاً فعلياً. عند أول تحصيل لاحقاً سيخفض مسار الرصيد ويسجل مكان وصول المال.",
    actionLabel: "سجّل أول دين",
  },
  ELECTRONIC_SERVICES: {
    title: "جهّز أول مزود ونفّذ خدمة حقيقية",
    description: "ابدأ برصيد المزود الحالي ثم نفّذ أول خدمة. مسار يخصم التكلفة ويسجل التحصيل والربح في نفس العملية.",
    actionLabel: "ابدأ الخدمات الإلكترونية",
  },
};

export function smartEmptyStateCopy(job: OnboardingJob): SmartEmptyStateCopy {
  return {
    ...COPY_BY_JOB[job],
    actionHref: onboardingDestination(job),
  };
}
