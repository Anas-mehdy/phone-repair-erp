import { ArrowRight, Ban, FileText, Receipt, Save, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Children, type ReactNode } from "react";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { customerService } from "@/lib/services/customerService";
import { softDeleteCustomerAction, updateCustomerAction } from "../actions";

export const dynamic = "force-dynamic";

const inputClassName =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const textareaClassName =
  "min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type CustomerDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerDetailsPage({
  params,
}: CustomerDetailsPageProps) {
  const { id } = await params;
  let customer: Awaited<ReturnType<typeof customerService.getCustomerById>>;

  let currency = "SAR";
  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    customer = await customerService.getCustomerById(context.shopId, id);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  if (!customer) {
    notFound();
  }

  const linkedRecords =
    customer._count.repairOrders + customer._count.sales + customer._count.invoices;
  const canDelete = linkedRecords === 0;

  return (
    <div className="space-y-6">
      {/* Top summary hero card */}
      <div className="rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-sm shadow-slate-100/40">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-900 text-white shadow-md shadow-primary/10">
              <span className="text-xl font-bold font-numeric">👤</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ملف العميل الشخصي</span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/50 font-numeric">{linkedRecords} سجلات مرتبطة</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mt-1 flex items-center gap-2">
                {customer.name}
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-1">
                الهاتف الأساسي: <span className="font-semibold text-slate-700 font-numeric">{customer.phone ?? "-"}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline" className="font-bold shadow-sm border-slate-200 hover:bg-slate-50 rounded-xl px-5 h-11">
              <Link href="/customers">
                <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
                رجوع للقائمة
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main Column */}
        <div className="space-y-6">
          {/* Profile details card */}
          <div className="erp-section">
            <div className="border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">بيانات الملف الشخصي</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="الاسم الكامل" value={customer.name} />
              <Info label="رقم الهاتف" value={<span className="font-numeric text-slate-700 font-semibold">{customer.phone ?? "-"}</span>} />
              <Info
                label="رقم الهاتف المنسق"
                value={<span className="font-numeric text-slate-700 font-semibold">{customer.phoneNormalized ?? "-"}</span>}
              />
              <Info label="البريد الإلكتروني" value={customer.email ?? "-"} />
              <Info label="تاريخ تسجيل العميل" value={<span className="font-numeric text-slate-500 font-medium">{formatDateTime(customer.createdAt)}</span>} />
              <Info label="آخر تحديث للملف" value={<span className="font-numeric text-slate-500 font-medium">{formatDateTime(customer.updatedAt)}</span>} />
              <div className="sm:col-span-2">
                <Info label="ملاحظات العميل" value={<p className="text-slate-600 leading-relaxed text-xs font-medium">{customer.notes ?? "-"}</p>} />
              </div>
            </div>
          </div>

          {/* Related Records Tabs */}
          <div className="grid gap-6 xl:grid-cols-3">
            <RelatedCard
              title="طلبات الصيانة"
              empty="لا توجد طلبات صيانة مسجلة لهذا العميل."
              icon={<Wrench className="h-4.5 w-4.5 text-primary" aria-hidden="true" />}
            >
              {customer.repairOrders.map((repairOrder) => (
                <RelatedLink
                  key={repairOrder.id}
                  href={`/repair-orders/${repairOrder.id}`}
                  title={repairOrder.ticketNumber}
                  description={`${repairOrder.deviceBrand ?? ""} ${repairOrder.deviceModel ?? ""}`.trim() || repairOrder.reportedIssue}
                  meta={formatDateTime(repairOrder.createdAt)}
                />
              ))}
            </RelatedCard>

            <RelatedCard
              title="المبيعات والـ POS"
              empty="لا توجد عمليات بيع مسجلة لهذا العميل."
              icon={<Receipt className="h-4.5 w-4.5 text-amber-500" aria-hidden="true" />}
            >
              {customer.sales.map((sale) => (
                <RelatedLink
                  key={sale.id}
                  href={`/sales/${sale.id}`}
                  title={sale.receiptNumber ?? "عملية بيع"}
                  description={formatCurrency(sale.total)}
                  meta={formatDateTime(sale.soldAt)}
                />
              ))}
            </RelatedCard>

            <RelatedCard
              title="الفواتير المستحقة"
              empty="لا توجد فواتير مصدرة لهذا العميل."
              icon={<FileText className="h-4.5 w-4.5 text-blue-500" aria-hidden="true" />}
            >
              {customer.invoices.map((invoice) => (
                <RelatedLink
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  title={invoice.invoiceNumber}
                  description={`${formatCurrency(invoice.total, currency)} - ${formatCurrency(invoice.balanceDue, currency)} متبقي`}
                  meta={formatDateTime(invoice.issuedAt)}
                />
              ))}
            </RelatedCard>
          </div>

          {/* Danger delete zone */}
          <div className="erp-section border-rose-200 bg-rose-50/10">
            <div className="border-b border-rose-250/30 pb-3 mb-4">
              <h3 className="font-bold text-rose-800 text-sm">منطقة الخطر | حذف العميل نهائياً</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              يمكن حذف ملف العميل نهائياً فقط إذا لم يكن لديه أي تذاكر صيانة، مبيعات، أو فواتير 
              مرتبطة بالنظام. يرجى الحذر، حيث أن هذه العملية نهائية ولا يمكن التراجع عنها.
            </p>
            <form action={softDeleteCustomerAction} className="mt-5">
              <input type="hidden" name="customerId" value={customer.id} />
              <ConfirmSubmitButton
                type="submit"
                variant="destructive"
                disabled={!canDelete}
                className="font-bold shadow-sm rounded-xl h-11 px-6 text-xs justify-center"
                message="هل تريد حذف هذا العميل؟ لا يمكن التراجع عن هذه العملية من الواجهة."
              >
                <Ban className="h-4 w-4 ml-1.5 shrink-0" aria-hidden="true" />
                حذف العميل نهائياً
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="space-y-6">
          {/* Edit Client details form */}
          <form action={updateCustomerAction} className="erp-section">
            <input type="hidden" name="customerId" value={customer.id} />
            <div className="border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">تعديل بيانات العميل</h3>
            </div>
            <div className="grid gap-4">
              <Field label="اسم العميل">
                <input
                  className={inputClassName}
                  name="name"
                  required
                  defaultValue={customer.name}
                />
              </Field>
              <Field label="الهاتف">
                <input
                  className={`${inputClassName} font-numeric`}
                  name="phone"
                  defaultValue={customer.phone ?? ""}
                />
              </Field>
              <Field label="البريد الإلكتروني">
                <input
                  className={inputClassName}
                  name="email"
                  type="email"
                  defaultValue={customer.email ?? ""}
                />
              </Field>
              <Field label="ملاحظات">
                <textarea
                  className={textareaClassName}
                  name="notes"
                  defaultValue={customer.notes ?? ""}
                />
              </Field>
              <Button type="submit" className="font-bold shadow-sm w-full h-11 rounded-xl">
                <Save className="h-4 w-4 ml-1.5" aria-hidden="true" />
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold text-slate-500">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100/50 bg-slate-50/20 p-4 transition duration-200 hover:bg-slate-50/40">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="mt-1.5 text-sm font-bold text-slate-700 leading-normal">{value}</div>
    </div>
  );
}

function RelatedCard({
  title,
  empty,
  icon,
  children,
}: {
  title: string;
  empty: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const hasChildren = Children.count(children) > 0;

  return (
    <div className="erp-section flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100/60 mb-4">
          {icon}
          <h3 className="font-bold text-sm text-slate-800">{title}</h3>
        </div>
        <div className="space-y-3">
          {!hasChildren ? (
            <p className="text-xs text-slate-400 font-medium py-2">{empty}</p>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

function RelatedLink({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-100 bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-800 font-numeric">{title}</p>
        <p className="shrink-0 font-numeric text-[9px] font-semibold text-slate-400">{meta}</p>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">
        {description}
      </p>
    </Link>
  );
}

