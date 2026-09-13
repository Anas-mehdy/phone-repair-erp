"use client";

import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { createSalesEmployeeSaleAction } from "./actions";

type InventoryOption = { id: string; name: string; sku: string | null; quantity: number; unitPrice: number };
type CustomerOption = { id: string; name: string; phone: string | null };
type Line = { key: string; inventoryItemId: string; quantity: number };
type CustomerMode = "CASH" | "EXISTING" | "NEW";

export function EmployeePosForm({ inventory, customers, currency }: { inventory: InventoryOption[]; customers: CustomerOption[]; currency: string }) {
  const [lines, setLines] = useState<Line[]>([{ key: crypto.randomUUID(), inventoryItemId: "", quantity: 1 }]);
  const [customerMode, setCustomerMode] = useState<CustomerMode>("CASH");
  const byId = useMemo(() => new Map(inventory.map((item) => [item.id, item])), [inventory]);
  const serialized = JSON.stringify(lines.filter((line) => line.inventoryItemId).map((line) => ({ inventoryItemId: line.inventoryItemId, quantity: line.quantity })));
  const total = lines.reduce((sum, line) => {
    const item = byId.get(line.inventoryItemId);
    return sum + (item ? item.unitPrice * Math.max(1, line.quantity) : 0);
  }, 0);

  function update(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }
  function addLine() { setLines((current) => [...current, { key: crypto.randomUUID(), inventoryItemId: "", quantity: 1 }]); }
  function removeLine(key: string) { setLines((current) => current.length === 1 ? current : current.filter((line) => line.key !== key)); }

  return (
    <form action={createSalesEmployeeSaleAction} className="space-y-5">
      <input type="hidden" name="items" value={serialized} />
      <input type="hidden" name="customerMode" value={customerMode} />

      <section className="erp-section space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div><h2 className="font-black text-slate-900 dark:text-slate-100">بنود المبيعة</h2><p className="mt-1 text-xs font-semibold text-slate-400">السعر يُقرأ من المخزون ولا يمكن لموظف المبيعات تغييره أو إضافة خصم يدوي.</p></div>
          <Button type="button" variant="outline" size="sm" onClick={addLine} className="rounded-xl font-black"><Plus className="ml-1 h-4 w-4" />إضافة صنف</Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => {
            const item = byId.get(line.inventoryItemId);
            return (
              <div key={line.key} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-[minmax(0,1fr)_120px_160px_auto] sm:items-end dark:border-slate-800 dark:bg-slate-900/50">
                <label className="grid gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">الصنف {index + 1}
                  <select required value={line.inventoryItemId} onChange={(event) => update(line.key, { inventoryItemId: event.target.value })} className="erp-input">
                    <option value="">اختر من المخزون</option>
                    {inventory.map((option) => <option key={option.id} value={option.id} disabled={option.quantity <= 0}>{option.name}{option.sku ? ` — ${option.sku}` : ""} — متاح {option.quantity}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">الكمية
                  <input className="erp-input font-numeric" type="number" min="1" max={item?.quantity || undefined} required value={line.quantity} onChange={(event) => update(line.key, { quantity: Math.max(1, Number(event.target.value) || 1) })} />
                </label>
                <div><p className="mb-1.5 text-xs font-bold text-slate-500">السعر</p><div className="erp-input flex items-center font-numeric font-black">{item ? formatCurrency(item.unitPrice, currency) : "—"}</div></div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.key)} className="text-rose-600" aria-label="حذف الصنف"><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="erp-section space-y-4">
        <div><h2 className="font-black text-slate-900 dark:text-slate-100">العميل</h2><p className="mt-1 text-xs font-semibold text-slate-400">يمكن إتمام البيع كعميل نقدي أو ربطه بعميل، بدون فتح قسم العملاء.</p></div>
        <div className="grid grid-cols-3 gap-2">
          {([["CASH", "نقدي"], ["EXISTING", "عميل موجود"], ["NEW", "عميل جديد"]] as Array<[CustomerMode, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setCustomerMode(value)} className={`rounded-xl border px-3 py-2.5 text-xs font-black ${customerMode === value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>{label}</button>)}
        </div>
        {customerMode === "EXISTING" ? <label className="grid gap-1.5 text-xs font-bold">العميل<select name="customerId" required className="erp-input"><option value="">اختر العميل</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ""}</option>)}</select></label> : null}
        {customerMode === "NEW" ? <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-bold">الاسم<input name="customerName" required className="erp-input" /></label><label className="grid gap-1.5 text-xs font-bold">الهاتف<input name="customerPhone" className="erp-input font-numeric" /></label></div> : null}
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black text-emerald-700 dark:text-emerald-300">الإجمالي</p><p className="mt-1 font-numeric text-2xl font-black text-slate-950 dark:text-white">{formatCurrency(total, currency)}</p><p className="mt-1 text-[10px] font-bold text-slate-500">التحصيل لموظف المبيعات نقدي عبر الدرج فقط، بدون عرض رصيد الدرج.</p></div><Button type="submit" disabled={!lines.some((line) => line.inventoryItemId)} className="h-12 rounded-xl px-6 font-black"><ShoppingCart className="ml-2 h-4 w-4" />إتمام البيع</Button></div>
      </section>
    </form>
  );
}
