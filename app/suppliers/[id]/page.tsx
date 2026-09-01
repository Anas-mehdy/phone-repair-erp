import { ArrowRight, Boxes, Eye, FileText, Phone, Plus, Receipt, Save, Trash2, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeader } from "@/components/page-header";
import { RepairStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { supplierService } from "@/lib/services/supplierService";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";
import { updateSupplierAction, deleteSupplierAction } from "../actions";

export const dynamic = "force-dynamic";
const inputClassName = "h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default async function SupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let supplier: Awaited<ReturnType<typeof supplierService.getSupplierById>>;
  let invoices: Awaited<ReturnType<typeof supplierInvoiceService.listSupplierInvoices>> = [];
  let currency = "SAR";
  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    [supplier, invoices] = await Promise.all([
      supplierService.getSupplierById(context.shopId, id),
      supplierInvoiceService.listSupplierInvoices(context.shopId, id),
    ]);
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }
  if (!supplier) notFound();

  const totalPartsCost = supplier.repairOrders.reduce((sum, ro) => sum + (Number(ro.partCost) || 0), 0);
  const totalStockUnits = supplier.stockReceipts.reduce((sum, receipt) => sum + receipt.quantity, 0);
  const totalStockValue = supplier.stockReceipts.reduce((sum, receipt) => sum + receipt.quantity * Number(receipt.unitCostSnapshot ?? 0), 0);
  const lastStockReceipt = supplier.stockReceipts[0] ?? null;

  return <div className="space-y-6">
    <PageHeader title={supplier.name} description="تفاصيل المورد وفواتيره وتوريدات المخزون وقطع الغيار" actions={<div className="flex flex-wrap gap-2"><Button asChild><Link href={`/suppliers/${supplier.id}/invoices/new`}><Plus className="ml-1.5 h-4 w-4" />إضافة فاتورة</Link></Button><Button asChild variant="outline"><Link href="/suppliers"><ArrowRight className="ml-1.5 h-4 w-4" />رجوع للموردين</Link></Button></div>} />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="erp-section flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-200"><Truck className="h-6 w-6" /></div><div><p className="text-xs font-bold text-slate-500">عمليات توريد المخزون</p><p className="mt-0.5 text-2xl font-black font-numeric text-slate-900">{supplier.stockReceipts.length}</p></div></div>
      <div className="erp-section flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"><Boxes className="h-6 w-6" /></div><div><p className="text-xs font-bold text-slate-500">إجمالي الوحدات الموردة</p><p className="mt-0.5 text-2xl font-black font-numeric text-slate-900">{totalStockUnits}</p></div></div>
      <div className="erp-section flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Receipt className="h-6 w-6" /></div><div><p className="text-xs font-bold text-slate-500">قيمة توريدات المخزون</p><p className="mt-0.5 text-xl font-black font-numeric text-slate-900">{formatCurrency(totalStockValue, currency)}</p></div></div>
      <div className="erp-section flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200"><Phone className="h-6 w-6" /></div><div><p className="text-xs font-bold text-slate-500">رقم الهاتف</p><p className="mt-0.5 text-sm font-black font-numeric text-slate-900" dir="ltr">{supplier.phone || "غير مسجل"}</p>{lastStockReceipt ? <p className="mt-1 text-[10px] font-semibold text-slate-400">آخر توريد: {formatDate(lastStockReceipt.createdAt)}</p> : null}</div></div>
    </div>

    <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100/60 p-4"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText className="h-4 w-4 text-amber-600" />فواتير المورد</h3><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold font-numeric text-slate-500">{invoices.length} فاتورة</span><Button asChild size="sm"><Link href={`/suppliers/${supplier.id}/invoices/new`}><Plus className="ml-1 h-3.5 w-3.5" />إضافة فاتورة</Link></Button></div></div>{invoices.length === 0 ? <div className="p-8 text-center"><p className="text-xs font-medium text-slate-400">لا توجد فواتير مسجلة لهذا المورد بعد.</p><Button asChild className="mt-4" size="sm"><Link href={`/suppliers/${supplier.id}/invoices/new`}>إضافة أول فاتورة</Link></Button></div> : <div className="overflow-x-auto"><table className="erp-table min-w-[700px]"><thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>البنود</th><th>الإجمالي</th><th>المرفق</th><th className="text-center">عرض</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td className="font-black font-numeric text-slate-900">{invoice.invoiceNumber ?? "بدون رقم"}</td><td className="font-numeric text-xs text-slate-600">{formatDate(invoice.invoiceDate)}</td><td className="font-numeric font-bold">{invoice.itemCount}</td><td className="font-numeric font-black text-indigo-700">{formatCurrency(invoice.total, currency)}</td><td>{invoice.hasAttachment ? <span className="text-xs font-bold text-emerald-700">موجود</span> : <span className="text-xs text-slate-400">-</span>}</td><td className="text-center"><Button asChild size="sm" variant="outline"><Link href={`/suppliers/invoices/${invoice.id}`}><Eye className="ml-1 h-3.5 w-3.5" />عرض</Link></Button></td></tr>)}</tbody></table></div>}</div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100/60 p-4"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Truck className="h-4 w-4 text-indigo-600" />توريدات المخزون من هذا المورد</h3><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold font-numeric text-slate-500">{supplier.stockReceipts.length} حركة</span></div>{supplier.stockReceipts.length === 0 ? <div className="p-8 text-center text-xs font-medium text-slate-400">لا توجد حركات توريد مخزون مرتبطة بهذا المورد بعد.</div> : <div className="overflow-x-auto"><table className="erp-table min-w-[820px]"><thead><tr><th>القطعة</th><th>SKU</th><th>التصنيف</th><th className="text-center">الكمية</th><th>تكلفة الوحدة</th><th>إجمالي الدفعة</th><th>الملاحظة</th><th>التاريخ</th></tr></thead><tbody>{supplier.stockReceipts.map((receipt) => { const batchTotal = receipt.quantity * Number(receipt.unitCostSnapshot ?? 0); return <tr key={receipt.id}><td className="font-bold"><Link className="text-teal-700 hover:underline" href={`/inventory/${receipt.inventoryItemId}`}>{receipt.itemName}</Link></td><td className="font-numeric text-xs text-slate-500">{receipt.sku ?? "-"}</td><td className="text-xs text-slate-600">{receipt.category ?? "غير مصنف"}</td><td className="text-center font-black font-numeric">+{receipt.quantity}</td><td className="font-black font-numeric">{formatCurrency(Number(receipt.unitCostSnapshot ?? 0), currency)}</td><td className="font-black font-numeric text-indigo-700">{formatCurrency(batchTotal, currency)}</td><td className="max-w-[220px] text-xs text-slate-500">{receipt.note ?? "-"}</td><td className="font-numeric text-xs text-slate-600">{formatDate(receipt.createdAt)}</td></tr>; })}</tbody></table></div>}</div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100/60 p-4"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Wrench className="h-4 w-4 text-teal-600" />سجل الأجهزة وقطع الغيار الموردة للصيانة</h3><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold font-numeric text-slate-500">{supplier.repairOrders.length} تذكرة</span></div>{supplier.repairOrders.length === 0 ? <div className="p-8 text-center text-xs text-slate-400">لم يتم تسجيل أي طلب صيانة مرتبط بهذا المورد بعد.</div> : <div className="overflow-x-auto"><table className="erp-table min-w-[700px]"><thead><tr><th>رقم التذكرة</th><th>العميل</th><th>الجهاز</th><th>القطعة</th><th>التكلفة</th><th>الحالة</th><th>التاريخ</th><th>عرض</th></tr></thead><tbody>{supplier.repairOrders.map((ro) => <tr key={ro.id}><td className="font-black font-numeric">{ro.ticketNumber}</td><td className="font-bold">{ro.customer?.name ?? "-"}</td><td>{[ro.deviceBrand, ro.deviceModel].filter(Boolean).join(" ") || "-"}</td><td className="text-xs">{ro.partName || "-"}</td><td className="font-numeric font-black">{ro.partCost ? formatCurrency(ro.partCost, currency) : "-"}</td><td><RepairStatusBadge status={ro.status} /></td><td className="font-numeric text-xs">{formatDate(ro.createdAt)}</td><td><Button asChild variant="outline" size="sm"><Link href={`/repair-orders/${ro.id}`}><Eye className="ml-1 h-3.5 w-3.5" />عرض</Link></Button></td></tr>)}</tbody></table></div>}</div>
      {supplier.repairOrders.length > 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-500">إجمالي تكلفة القطع المسجلة ضمن تذاكر الصيانة: <span className="font-black font-numeric text-slate-800">{formatCurrency(totalPartsCost, currency)}</span></div> : null}
    </div><div><form action={updateSupplierAction} className="erp-section space-y-4"><input type="hidden" name="supplierId" value={supplier.id} /><div className="border-b border-slate-100/60 pb-3"><h3 className="text-sm font-bold text-slate-800">تعديل بيانات المورد</h3></div><div className="space-y-3"><label className="block"><span className="mb-1.5 block text-xs font-extrabold text-slate-800">اسم المورد *</span><input name="name" required defaultValue={supplier.name} className={`${inputClassName} w-full`} /></label><label className="block"><span className="mb-1.5 block text-xs font-extrabold text-slate-800">رقم الهاتف</span><input name="phone" inputMode="tel" defaultValue={supplier.phone ?? ""} className={`${inputClassName} w-full font-numeric`} /></label><label className="block"><span className="mb-1.5 block text-xs font-extrabold text-slate-800">العنوان / الموقع</span><input name="address" defaultValue={supplier.address ?? ""} className={`${inputClassName} w-full`} /></label><label className="block"><span className="mb-1.5 block text-xs font-extrabold text-slate-800">ملاحظات</span><textarea name="notes" rows={3} defaultValue={supplier.notes ?? ""} className="erp-textarea w-full text-xs" /></label><SubmitButton className="h-11 w-full rounded-xl font-bold" loadingText="جاري الحفظ..."><Save className="ml-1.5 h-4 w-4" />حفظ التعديلات</SubmitButton></div></form><form action={deleteSupplierAction} className="mt-4"><input type="hidden" name="supplierId" value={supplier.id} /><Button type="submit" variant="outline" className="h-10 w-full rounded-xl border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"><Trash2 className="ml-1.5 h-3.5 w-3.5" />حذف المورد</Button></form></div></div>
  </div>;
}
