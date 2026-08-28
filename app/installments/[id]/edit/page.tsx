import { InstallmentFrequency, InstallmentPlanSource } from "@prisma/client";
import { ArrowRight, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { installmentService } from "@/lib/services/installmentService";
import { updateInstallmentPlanAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditInstallmentPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const auth = await requirePermission("invoices:pay");
  const plan = await installmentService.getPlanById(auth.shop.id, id);
  if (!plan) notFound();

  const hasCollectedInstallments = plan.payments.some((payment) => !payment.isDownPayment);
  const amountLocked = plan.source === InstallmentPlanSource.INVOICE || hasCollectedInstallments;
  const scheduleLocked = hasCollectedInstallments;
  const firstDueAt = plan.firstDueAt.toISOString().slice(0, 10);

  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PageHeader title={`تعديل ${plan.planNumber}`} description="عدّل الاتفاق وجدول الأقساط ضمن الحدود التي تحافظ على الدفعات المسجلة" />
      <Button asChild variant="outline"><Link href={`/installments/${plan.id}`}><ArrowRight className="ml-2 h-4 w-4" />رجوع</Link></Button>
    </div>

    {query.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{query.error}</div>}
    {scheduleLocked && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">تم تسجيل دفعات على هذه الخطة؛ لذلك يمكنك تعديل الوصف والملاحظات فقط، ولن يغيّر النظام الأرقام القديمة.</div>}
    {!scheduleLocked && plan.source === InstallmentPlanSource.INVOICE && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-800">هذه الخطة مرتبطة بفاتورة، لذلك مبلغها ثابت، لكن يمكنك تعديل عدد الأقساط ومواعيدها.</div>}

    <form action={updateInstallmentPlanAction} className="erp-section grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="planId" value={plan.id} />
      <label className="grid gap-2 sm:col-span-2"><span className="text-xs font-extrabold text-slate-700">وصف الاتفاق أو الشيء المباع</span><input name="title" className="erp-input" required defaultValue={plan.title} /></label>
      <label className="grid gap-2 sm:col-span-2"><span className="text-xs font-extrabold text-slate-700">ملاحظات</span><textarea name="notes" className="erp-input min-h-24 py-3" defaultValue={plan.notes || ""} /></label>

      <label className="grid gap-2"><span className="text-xs font-extrabold text-slate-700">المبلغ الإجمالي</span><input name="totalAmount" className="erp-input" type="number" min="0.01" step="0.01" required defaultValue={plan.totalAmount.toString()} readOnly={amountLocked} /></label>
      <label className="grid gap-2"><span className="text-xs font-extrabold text-slate-700">عدد الأقساط</span><input name="installmentCount" className="erp-input" type="number" min="1" max="120" required defaultValue={plan.installmentCount} readOnly={scheduleLocked} /></label>
      <label className="grid gap-2"><span className="text-xs font-extrabold text-slate-700">التكرار</span><select name="frequency" className="erp-input" defaultValue={plan.frequency} disabled={scheduleLocked}><option value={InstallmentFrequency.MONTHLY}>شهري</option><option value={InstallmentFrequency.WEEKLY}>أسبوعي</option></select>{scheduleLocked && <input type="hidden" name="frequency" value={plan.frequency} />}</label>
      <label className="grid gap-2"><span className="text-xs font-extrabold text-slate-700">تاريخ أول قسط</span><input name="firstDueAt" className="erp-input" type="date" required defaultValue={firstDueAt} readOnly={scheduleLocked} /></label>

      <div className="sm:col-span-2"><SubmitButton className="h-11 w-full rounded-xl font-black" loadingText="جاري حفظ التعديلات..."><Save className="ml-2 h-4 w-4" />حفظ التعديلات</SubmitButton></div>
    </form>
  </div>;
}
