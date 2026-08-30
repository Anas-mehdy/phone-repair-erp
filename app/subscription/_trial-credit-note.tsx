import { Gift, Sparkles } from "lucide-react";

export function TrialCreditNote() {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-teal-50 shadow-sm">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-900">اشترك الآن بدون ما تخسر أيام تجربتك المجانية</h2>
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
          </div>
          <p className="mt-1.5 text-xs font-semibold leading-6 text-slate-600 sm:text-sm">
            إذا اشتركت قبل انتهاء الفترة التجريبية، فكل الوقت المجاني المتبقي لديك سيُضاف تلقائيًا إلى نهاية مدة اشتراكك المدفوع — ولن يضيع عليك أي يوم.
          </p>
        </div>
      </div>
    </div>
  );
}
