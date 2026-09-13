"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { updateSalesEmployeeSaleAction } from "../../actions";

type Item = { id: string; description: string; quantity: number; unitPrice: number };
export function EmployeeSaleEditForm({ saleId, items, currency }: { saleId: string; items: Item[]; currency: string }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(items.map((item) => [item.id, item.quantity])));
  const rows = items.map((item) => ({ saleItemId: item.id, quantity: quantities[item.id] ?? item.quantity }));
  const total = items.reduce((sum, item) => sum + item.unitPrice * (quantities[item.id] ?? item.quantity), 0);
  return (
    <form action={updateSalesEmployeeSaleAction} className="space-y-4">
      <input type="hidden" name="saleId" value={saleId} />
      <input type="hidden" name="quantities" value={JSON.stringify(rows)} />
      <div className="space-y-2">{items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_100px_130px] items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div><p className="text-xs font-black">{item.description}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{formatCurrency(item.unitPrice, currency)} للوحدة</p></div><input type="number" min="1" className="erp-input font-numeric" value={quantities[item.id] ?? item.quantity} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(1, Number(event.target.value) || 1) }))} /><div className="font-numeric text-xs font-black">{formatCurrency(item.unitPrice * (quantities[item.id] ?? item.quantity), currency)}</div></div>)}</div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"><div><p className="text-[10px] font-bold text-slate-400">الإجمالي بعد التعديل</p><p className="font-numeric text-lg font-black">{formatCurrency(total, currency)}</p></div><Button type="submit" className="rounded-xl font-black">حفظ تعديل الكميات</Button></div>
    </form>
  );
}
