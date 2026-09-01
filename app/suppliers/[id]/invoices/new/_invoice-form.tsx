"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupplierInvoiceAction } from "../actions";

type InventoryOption = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unitCost: string | null;
};

type InvoiceRow = {
  key: string;
  inventoryItemId: string;
  query: string;
  quantity: number;
  unitCost: string;
};

const inputClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function makeRow(): InvoiceRow {
  return { key: crypto.randomUUID(), inventoryItemId: "", query: "", quantity: 1, unitCost: "0" };
}

export function SupplierInvoiceForm({ supplierId, supplierName, inventory }: {
  supplierId: string;
  supplierName: string;
  inventory: InventoryOption[];
}) {
  const [rows, setRows] = useState<InvoiceRow[]>([makeRow()]);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRow(key: string, patch: Partial<InvoiceRow>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  function removeRow(key: string) {
    setRows((current) => current.length === 1 ? current : current.filter((row) => row.key !== key));
  }

  const total = useMemo(() => rows.reduce((sum, row) => {
    const quantity = Number(row.quantity) || 0;
    const unitCost = Number(row.unitCost) || 0;
    return sum + quantity * unitCost;
  }, 0), [rows]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const validRows = rows.filter((row) => row.inventoryItemId && Number(row.quantity) > 0 && Number(row.unitCost) >= 0);
    if (validRows.length !== rows.length || validRows.length === 0) {
      alert("اختر صنف مخزون صحيح لكل بند وأدخل الكمية والتكلفة.");
      return;
    }

    const formData = new FormData(form);
    formData.set("items", JSON.stringify(validRows.map((row) => ({
      inventoryItemId: row.inventoryItemId,
      quantity: Number(row.quantity),
      unitCost: Number(row.unitCost),
    }))));

    startTransition(async () => {
      await createSupplierInvoiceAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
      <input type="hidden" name="supplierId" value={supplierId} />
      <input type="hidden" name="items" value="[]" />

      <div className="erp-section">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-800">بيانات فاتورة المورد</h3>
          <p className="mt-1 text-xs font-medium text-slate-400">المورد: {supplierName}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">رقم الفاتورة (اختياري)</span>
            <input name="invoiceNumber" className={inputClassName} maxLength={120} placeholder="مثال: INV-1024" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">تاريخ الفاتورة</span>
            <input name="invoiceDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClassName} />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">ملاحظات</span>
            <textarea name="notes" maxLength={2000} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="أي ملاحظات عن الفاتورة..." />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">صورة أو PDF للفاتورة (اختياري — مرجع فقط)</span>
            <input name="attachment" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="block w-full rounded-md border bg-white px-3 py-2 text-sm" />
            <span className="block text-[10px] font-medium text-slate-400">الحد الأقصى 5MB. الملف لا يُقرأ آلياً ولا يضيف أي تكلفة AI.</span>
          </label>
        </div>
      </div>

      <div className="erp-section">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-800">بنود الفاتورة</h3>
            <p className="mt-1 text-[11px] font-medium text-slate-400">ابحث عن الصنف، ثم أدخل الكمية وتكلفة الشراء. عند الحفظ ستُضاف الكميات للمخزون.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, makeRow()])}>
            <Plus className="ml-1 h-4 w-4" />إضافة بند
          </Button>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => {
            const q = row.query.trim().toLowerCase();
            const matches = q ? inventory.filter((item) =>
              item.name.toLowerCase().includes(q) ||
              item.sku?.toLowerCase().includes(q) ||
              item.category?.toLowerCase().includes(q)
            ).slice(0, 20) : inventory.slice(0, 12);

            return (
              <div key={row.key} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/30 p-3 md:grid-cols-[1fr_110px_140px_48px]">
                <div className="relative">
                  <label className="mb-1 block text-[10px] font-bold text-slate-500">الصنف #{index + 1}</label>
                  <input
                    value={row.query}
                    className={inputClassName}
                    placeholder="اكتب اسم القطعة أو SKU..."
                    autoComplete="off"
                    onFocus={() => setOpenRow(row.key)}
                    onChange={(e) => {
                      updateRow(row.key, { query: e.target.value, inventoryItemId: "" });
                      setOpenRow(row.key);
                    }}
                  />
                  {openRow === row.key ? (
                    <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                      {matches.length ? matches.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-right text-xs hover:bg-slate-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            updateRow(row.key, {
                              inventoryItemId: item.id,
                              query: item.name,
                              unitCost: item.unitCost ?? row.unitCost,
                            });
                            setOpenRow(null);
                          }}
                        >
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className="font-numeric text-[10px] text-slate-400">{item.sku ?? "بدون SKU"} · متوفر {item.quantity}</span>
                        </button>
                      )) : <div className="p-3 text-center text-xs text-slate-400">لا توجد نتائج</div>}
                    </div>
                  ) : null}
                </div>

                <label>
                  <span className="mb-1 block text-[10px] font-bold text-slate-500">الكمية</span>
                  <input type="number" min="1" step="1" value={row.quantity} className={inputClassName} onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })} />
                </label>

                <label>
                  <span className="mb-1 block text-[10px] font-bold text-slate-500">تكلفة الوحدة</span>
                  <input type="number" min="0" step="0.01" value={row.unitCost} className={inputClassName} onChange={(e) => updateRow(row.key, { unitCost: e.target.value })} />
                </label>

                <div className="flex items-end">
                  <Button type="button" size="icon" variant="outline" disabled={rows.length === 1} onClick={() => removeRow(row.key)} className="text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">إجمالي الفاتورة</span>
            <p className="font-numeric text-2xl font-black text-slate-900">{total.toFixed(2)}</p>
          </div>
          <Button type="submit" disabled={isPending} className="h-11 min-w-48 font-bold">
            <Save className="ml-1.5 h-4 w-4" />{isPending ? "جاري حفظ الفاتورة..." : "حفظ الفاتورة وإضافة المخزون"}
          </Button>
        </div>
      </div>
    </form>
  );
}
