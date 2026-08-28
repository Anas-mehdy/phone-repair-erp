import { InstallmentPlanStatus } from "@prisma/client";

export function PlanStatus({ status, overdue }: { status: InstallmentPlanStatus; overdue?: boolean }) {
  if (status === InstallmentPlanStatus.COMPLETED) return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">مكتملة</span>;
  if (status === InstallmentPlanStatus.CANCELLED) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">ملغاة</span>;
  if (overdue) return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-700">متأخرة</span>;
  return <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-black text-teal-700">نشطة</span>;
}
