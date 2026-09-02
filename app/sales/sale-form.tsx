"use client";

import { Banknote, Plus, Save, Trash2, UserPlus, Users } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { createSaleAction, type SaleActionState } from "./actions";
import { Field, inputClassName } from "./_components";
import { InventorySearchCombobox, type SaleInventoryOption } from "./inventory-search-combobox";
import { CustomerSearchCombobox, type SaleCustomerOption } from "./customer-search-combobox";
import { SalePaymentFields, type SaleWalletOption } from "./sale-payment-fields";

type InventoryOption = SaleInventoryOption;
type CustomerMode = "EXISTING" | "NEW" | "CASH";
type SaleLineDraft = { id: string; inventoryItemId: string; description: string; quantity: number; unitPrice: string; discountTotal: string };
const initialState: SaleActionState = {};
function createLine(): SaleLineDraft { return { id: crypto.randomUUID(), inventoryItemId: "", description: "", quantity: 1, unitPrice: "0", discountTotal: "0" }; }

export function SaleForm({ inventoryItems, wallets, currency = "SAR" }: { inventoryItems: InventoryOption[]; wallets: SaleWalletOption[]; currency?: string }) {
  const [state, formAction, isPending] = useActionState(createSaleAction, initialState);
  const [lines, setLines] = useState<SaleLineDraft[]>([createLine()]);
  const [customerMode, setCustomerMode] = useState<CustomerMode>("CASH");
  const [selectedCustomer, setSelectedCustomer] = useState<SaleCustomerOption | null>(null);
  const serializedItems = useMemo(() => JSON.stringify(lines.map((line) => ({ inventoryItemId: line.inventoryItemId || null, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, discountTotal: line.discountTotal || "0" }))), [lines]);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0);
  const discountTotal = lines.reduce((sum, line) => sum + Number(line.discountTotal || 0), 0);
  const total = subtotal - discountTotal;
  function updateLine(id: string, updates: Partial<SaleLineDraft>) { setLines((currentLines) => currentLines.map((line) => line.id === id ? { ...line, ...updates } : line)); }
  function handleInventorySelect(line: SaleLineDraft, item: InventoryOption | null) { updateLine(line.id, { inventoryItemId: item?.id ?? "", description: item?.name ?? "", unitPrice: item?.unitPrice ?? "0" }); }
  function removeLine(id: string) { setLines((currentLines) => currentLines.length === 1 ? currentLines : currentLines.filter((line) => line.id !== id)); }
  function changeCustomerMode(mode: CustomerMode) { setCustomerMode(mode); if (mode !== "EXISTING") setSelectedCustomer(null); }

  return <form action={formAction} className="space-y-6">
    <input name="items" type="hidden" value={serializedItems} /><input name="customerMode" type="hidden" value={customerMode} /><input name="customerId" type="hidden" value={selectedCustomer?.id ?? ""} />
    {state.error ? <div className="rounded-2xl border border-rose-250/30 bg-rose-50/40 p-4.5 text-xs font-extrabold text-rose-700">⚠️ {state.error}</div> : null}
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      <div className="space-y-6"><section className="erp-section">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100/60 pb-3.5 mb-5"><div><h3 className="font-bold text-slate-800 text-sm">سلة بنود البيع</h3><p className="mt-0.5 text-xs text-slate-400 font-medium">أضف قطع الغيار أو الخدمات المنجزة لعملية البيع.</p></div><Button type="button" variant="outline" className="font-bold shadow-sm border-slate-200/80 hover:bg-primary/5 hover:text-primary hover:border-primary/20 rounded-xl" onClick={() => setLines((currentLines) => [...currentLines, createLine()])}><Plus className="h-4 w-4 ml-1.5" />إضافة بند جديد</Button></div>
        <div className="space-y-5">{lines.map((line, index) => { const isInventoryItem = !!line.inventoryItemId; return <div key={line.id} className="rounded-2xl border border-slate-200/60 bg-slate-50/20 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-slate-50/40">
          <div className="mb-4 flex items-center justify-between pb-2 border-b border-slate-200/40"><div className="flex items-center gap-2"><span className="text-xs font-black text-slate-700">بند رقم #{index + 1}</span>{isInventoryItem ? <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/40">قطعة من المخزن</span> : <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">بند يدوي / خدمة</span>}</div><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-650 hover:bg-rose-50 hover:text-rose-700 rounded-lg" onClick={() => removeLine(line.id)} disabled={lines.length === 1} aria-label="حذف البند"><Trash2 className="h-4 w-4" /></Button></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_100px_120px_120px]">
            <Field label="قطعة من المخزون"><InventorySearchCombobox value={line.inventoryItemId} selectedLabel={line.description} initialOptions={inventoryItems} onSelect={(item) => handleInventorySelect(line, item)} /></Field>
            <Field label="الوصف / التفاصيل"><input className={inputClassName} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} placeholder="وصف مخصص للبند..." /></Field>
            <Field label="الكمية"><input className={`${inputClassName} font-numeric text-center`} min="1" step="1" type="number" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} /></Field>
            <Field label={`سعر الوحدة (${currency})`}><input className={`${inputClassName} font-numeric`} min="0" step="0.01" type="number" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} /></Field>
            <Field label="الخصم الكلي للبند"><input className={`${inputClassName} font-numeric`} min="0" step="0.01" type="number" value={line.discountTotal} onChange={(event) => updateLine(line.id, { discountTotal: event.target.value })} /></Field>
          </div></div>; })}</div>
      </section></div>

      <div className="space-y-6">
        <section className="erp-section"><div className="border-b border-slate-100/60 pb-3 mb-4"><h3 className="font-bold text-slate-800 text-sm">بيانات العميل</h3><p className="mt-1 text-[11px] font-medium text-slate-400">اربط المبيعة بعميل موجود أو سجل عميلاً جديداً للمرة الأولى.</p></div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button type="button" onClick={() => changeCustomerMode("EXISTING")} className={`rounded-xl border p-2.5 text-[10px] font-black transition ${customerMode === "EXISTING" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}><Users className="mx-auto mb-1 h-4 w-4" />عميل موجود</button>
            <button type="button" onClick={() => changeCustomerMode("NEW")} className={`rounded-xl border p-2.5 text-[10px] font-black transition ${customerMode === "NEW" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}><UserPlus className="mx-auto mb-1 h-4 w-4" />عميل جديد</button>
            <button type="button" onClick={() => changeCustomerMode("CASH")} className={`rounded-xl border p-2.5 text-[10px] font-black transition ${customerMode === "CASH" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}><Banknote className="mx-auto mb-1 h-4 w-4" />عميل نقدي</button>
          </div>
          {customerMode === "EXISTING" ? <div className="grid gap-3"><Field label="اختر العميل"><CustomerSearchCombobox value={selectedCustomer?.id ?? ""} selectedCustomer={selectedCustomer} onSelect={setSelectedCustomer} /></Field>{selectedCustomer ? <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2.5 text-xs"><div className="font-black text-emerald-800">{selectedCustomer.name}</div>{selectedCustomer.phone ? <div className="mt-0.5 font-numeric text-[10px] font-bold text-emerald-600" dir="ltr">{selectedCustomer.phone}</div> : null}</div> : null}</div> : customerMode === "NEW" ? <div className="grid gap-4"><Field label="اسم العميل الجديد"><input className={inputClassName} name="customerName" placeholder="مثال: محمود أحمد" required /></Field><Field label="رقم الهاتف"><input className={`${inputClassName} font-numeric`} name="customerPhone" inputMode="tel" placeholder="05xxxxxxxx" /></Field><p className="text-[10px] leading-5 font-semibold text-slate-400">سيتم حفظ العميل تلقائياً في إدارة العملاء. إذا كان رقم الهاتف مسجلاً مسبقاً، سيطلب منك النظام اختيار العميل الموجود بدلاً من إنشاء نسخة مكررة.</p></div> : <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-3 text-[11px] font-semibold text-slate-500">لن يتم إنشاء سجل عميل لهذه المبيعة.</div>}
        </section>

        <section className="erp-section"><div className="border-b border-slate-100/60 pb-3 mb-4"><h3 className="font-bold text-slate-800 text-sm">الحسابات والملخص المالي</h3></div>
          <div className="space-y-3.5"><div className="flex justify-between text-xs text-slate-500 font-medium"><span>الإجمالي الفرعي:</span><span className="font-numeric font-bold">{formatCurrency(subtotal, currency)}</span></div><div className="flex justify-between text-xs text-slate-500 font-medium"><span>إجمالي الخصومات:</span><span className="font-numeric text-rose-600 font-bold">{discountTotal > 0 ? formatCurrency(-discountTotal, currency) : formatCurrency(0, currency)}</span></div><div className="flex justify-between text-sm font-bold text-slate-850 pt-3.5 border-t border-slate-200"><span>الإجمالي النهائي:</span><span className="font-numeric text-xl text-primary font-black">{formatCurrency(total, currency)}</span></div></div>
          <SalePaymentFields total={Math.max(0, total)} wallets={wallets} currency={currency} debtEligible={customerMode === "NEW" || (customerMode === "EXISTING" && Boolean(selectedCustomer))} />
          <div className="mt-6 pt-1"><Button type="submit" disabled={isPending} className="w-full font-bold shadow-md h-12 rounded-xl text-xs justify-center"><Save className="h-4.5 w-4.5 ml-1.5" />{isPending ? "جاري تسجيل عملية البيع..." : "إتمام وإصدار عملية البيع"}</Button></div>
        </section>
      </div>
    </div>
  </form>;
}
