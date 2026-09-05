import Link from "next/link";
import { ArrowRight, FlaskConical, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import type { GrowthExperimentsDashboardData } from "@/lib/services/growthExperimentDashboardService";

function pct(value: number) { return `${Math.round(value * 10) / 10}%`; }
function duration(hours: number | null) {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} د`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} س`;
  return `${Math.round((hours / 24) * 10) / 10} يوم`;
}

export function GrowthExperimentsDashboard({ data }: { data: GrowthExperimentsDashboardData }) {
  return <div className="space-y-7">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-fuchsia-300"><FlaskConical className="h-5 w-5" /><span className="text-xs font-black">EXPERIMENTS</span></div>
        <h1 className="mt-1 text-2xl font-black text-white">تجارب النمو A/B</h1>
        <p className="mt-1 max-w-3xl text-xs font-semibold leading-6 text-slate-400">التوزيع ثابت على مستوى المتجر، والنتائج تعتمد على أول Exposure الفعلي. لا نعلن فائزاً من عينة صغيرة ولا نستخدم النقرات بديلاً عن First Value وHabit.</p>
      </div>
      <Link href="/admin/growth" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-black text-slate-300 hover:bg-slate-800 hover:text-white"><ArrowRight className="h-4 w-4" />العودة للـGrowth Dashboard</Link>
    </section>

    {data.experiments.map((experiment) => <section key={experiment.key} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-black text-white">{experiment.label}</h2><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${experiment.mode === "RUNNING" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : experiment.mode === "PAUSED" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>{experiment.mode}</span></div><div className="mt-1 font-mono text-[9px] text-slate-600">{experiment.key}</div><p className="mt-3 max-w-3xl text-[11px] font-semibold leading-6 text-slate-400">{experiment.hypothesis}</p></div>
          <div className="grid gap-2 sm:grid-cols-2"><Mini icon={Sparkles} label="Primary" value="First Value rate" /><Mini icon={ShieldCheck} label="Guardrail" value="Onboarding completion" /></div>
        </div>
      </div>

      <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-right text-xs"><thead className="bg-slate-950/55 text-[10px] text-slate-500"><tr><th className="px-4 py-3">Variant</th><th className="px-4 py-3">Exposed</th><th className="px-4 py-3">Onboarding</th><th className="px-4 py-3">First Value</th><th className="px-4 py-3">Habit</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Median → First</th></tr></thead><tbody className="divide-y divide-slate-800">{experiment.variants.map((row) => <tr key={row.variant}><td className="px-4 py-4"><div className="font-black text-slate-200">{row.label}</div><div className="mt-0.5 font-mono text-[9px] text-slate-600">{row.variant}</div></td><td className="px-4 py-4 font-numeric font-black text-white">{row.exposed}</td><td className="px-4 py-4"><Metric count={row.onboardingCompleted} rate={row.onboardingCompletionRate} /></td><td className="px-4 py-4"><Metric count={row.firstValue} rate={row.firstValueRate} emphasized /></td><td className="px-4 py-4"><Metric count={row.habit} rate={row.habitRate} /></td><td className="px-4 py-4"><Metric count={row.paid} rate={row.paidRate} /></td><td className="px-4 py-4 font-numeric font-black text-cyan-300">{duration(row.medianExposureToFirstValueHours)}</td></tr>)}</tbody></table></div>

      <div className="border-t border-slate-800 p-5">
        {experiment.mode === "OFF" ? <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-[11px] font-semibold leading-5 text-slate-400"><strong className="text-slate-200">التجربة غير مفعلة.</strong> لا يتم إنشاء Assignments أو Exposures جديدة في وضع <code className="font-mono text-fuchsia-300">off</code>.</div> : experiment.mode === "PAUSED" ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[11px] font-semibold leading-5 text-amber-100"><strong>التجربة متوقفة مؤقتاً.</strong> لا تدخل متاجر جديدة، لكن أي متجر تعرّض سابقاً يبقى على نفس Variant حتى لا تتغير تجربته بنصف الرحلة.</div> : !experiment.enoughSample ? <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"><Gauge className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="text-[11px] font-semibold leading-5 text-amber-100">العينة ما زالت صغيرة. نحتاج على الأقل <strong>{experiment.minDirectionalSample}</strong> Exposure في كل Variant قبل حتى قراءة الاتجاه. هذا ليس اختبار دلالة إحصائية نهائي.</p></div> : <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-[11px] font-semibold text-violet-100">الفرق المرصود في First Value للـTreatment مقابل Control: <strong>{experiment.firstValueLift == null ? "—" : `${experiment.firstValueLift >= 0 ? "+" : ""}${pct(experiment.firstValueLift)}`}</strong>. يُقرأ كاتجاه فقط، وليس إعلان فائز تلقائي.</div>}
      </div>
    </section>)}
  </div>;
}

function Metric({ count, rate, emphasized = false }: { count: number; rate: number; emphasized?: boolean }) { return <div><div className={`font-numeric font-black ${emphasized ? "text-fuchsia-300" : "text-slate-200"}`}>{count}</div><div className="mt-0.5 font-numeric text-[9px] font-bold text-slate-600">{pct(rate)}</div></div>; }
function Mini({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5"><div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500"><Icon className="h-3.5 w-3.5 text-fuchsia-400" />{label}</div><div className="mt-1 text-[10px] font-black text-slate-300">{value}</div></div>; }
