"use client";

import { PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSalesEmployeePurchaseAction } from "./actions";

type InventoryOption = { id: string; name: string; sku: string | null; barcode: string | null; quantity: number };
type SupplierOption = { id: string; name: string };
type Line = { key: string; mode: "EXISTING" | "NEW"; inventoryItemId: string; newItemName: string; newItemSku: string; newItemBarcode: string; newItemCategory: string; quantity: number; unitCost: string; salePrice: string };

function emptyLine(): Line {
  return { key: crypto.randomUUID(), mode: "EXISTING", inventoryItemId: "", newItemName: "", newItemSku: "", newItemBarcode: "", newItemCategory: "", quantity: 1, unitCost: "", salePrice: "" };
}

export function EmployeeReceivingForm({ inventory, suppliers, defaultDate }: { inventory: InventoryOption[]; suppliers: SupplierOption[]; defaultDate: string }) {
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [supplierMode, setSupplierMode] = useState<"EXISTING" | "OTHER">("EXISTING");
  const byId = useMemo(() => new Map(inventory.map((item) => [item.id, item])), [inventory]);
  const serialized = JSON.stringify(lines.map((line) => ({
    inventoryItemId: line.mode === "EXISTING" ? line.inventoryItemId || null : null,
    newItemName: line.mode === "NEW" ? line.newItemName : null,
    newItemSku: line.mode === "NEW" ? line.newItemSku || null : null,
    newItemBarcode: line.mode === "NEW" ? line.newItemBarcode || null : null,
    newItemCategory: line.mode === "NEW" ? line.newItemCategory || null : null,
    quantity: line.quantity,
    unitCost: line.unitCost,
    salePrice: line.salePrice || null,
  })));
  const total = lines.reduce((sum, line) => sum + Math.max(0, Number(line.unitCost || 0)) * Math.max(1, line.quantity), 0);

  function update(key: string, patch: Partial<Line>) { setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line)); }
  function addLine() { setLines((current) => [...current, emptyLine()]); }
  function removeLine(key: string) { setLines((current) => current.length === 1 ? current : current.filter((line) => line.key !== key)); }

  return <form action={createSalesEmployeePurchaseAction} className="space-y-5">
    <input type="hidden" name="lines" value={serialized} />
    <section className="erp-section space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1.5 text-xs font-bold">نوع المورد<select className="erp-input" value={supplierMode} onChange={(e) => setSupplierMode(e.target.value as "EXISTING" | "OTHER")}><option value="EXISTING">مورد مسجل</option><option value="OTHER">مورد غير مسجل</option></select></label>
        {supplierMode === "EXISTING" ? <label className="grid gap-1.5 text-xs font-bold">المورد<select name="supplierId" className="erp-input"><option value="">بدون مورد محدد</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label> : <label className="grid gap-1.5 text-xs font-bold">اسم المورد<input name="supplierNameSnapshot" className="erp-input" maxLength={180} /></label>}
        <label className="grid gap-1.5 text-xs font-bold">رقم فاتورة المورد<input name="supplierInvoiceNumber" className="erp-input" maxLength={120} /></label>
        <label className="grid gap-1.5 text-xs font-bold">تاريخ الفاتورة<input name="invoiceDate" type="date" defaultValue={defaultDate} required className="erp-input font-numeric" /></label>
      </div>
      <label className="grid gap-1.5 text-xs font-bold">ملاحظة<input name="notes" className="erp-input" maxLength={1000} placeholder="اختياري" /></label>
    </section>

    <section className="erp-section space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800"><div><h2 className="text-sm font-black">الأصناف المستلمة</h2><p className="mt-1 text-[10px] font-bold text-slate-400">يمكن إضافة صنف موجود أو إنشاء صنف جديد. لا تظهر لك تكاليف المخزون السابقة أو الأرصدة المالية.</p></div><Button type="button" variant="outline" size="sm" onClick={addLine} className="rounded-xl font-black"><Plus className="ml-1 h-4 w-4" />سطر جديد</Button></div>
      <div className="space-y-3">{lines.map((line, index) => {
        const selected = byId.get(line.inventoryItemId);
        return <div key={line.key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><PackagePlus className="h-4 w-4 text-amber-600" /><span className="text-xs font-black">الصنف {index + 1}</span></div><Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.key)} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button></div>
          <div className="mb-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => update(line.key, { mode: "EXISTING", newItemName: "" })} className={`rounded-xl border px-3 py-2 text-xs font-black ${line.mode === "EXISTING" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>صنف موجود</button><button type="button" onClick={() => update(line.key, { mode: "NEW", inventoryItemId: "" })} className={`rounded-xl border px-3 py-2 text-xs font-black ${line.mode === "NEW" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>صنف جديد</button></div>
          {line.mode === "EXISTING" ? <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_150px_150px]"><label className="grid gap-1.5 text-xs font-bold">الصنف<select required value={line.inventoryItemId} onChange={(e) => update(line.key, { inventoryItemId: e.target.value })} className="erp-input"><option value="">اختر الصنف</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name}{item.sku ? ` — ${item.sku}` : ""} — الحالي {item.quantity}</option>)}</select>{selected ? <span className="text-[10px] font-bold text-slate-400">الكمية الحالية: {selected.quantity}</span> : null}</label><Qty line={line} onChange={(quantity) => update(line.key, { quantity })} /><Money label="تكلفة الشراء" value={line.unitCost} onChange={(unitCost) => update(line.key, { unitCost })} required /><Money label="سعر البيع (اختياري)" value={line.salePrice} onChange={(salePrice) => update(line.key, { salePrice })} /></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Text label="اسم الصنف" value={line.newItemName} onChange={(newItemName) => update(line.key, { newItemName })} required /><Text label="SKU" value={line.newItemSku} onChange={(newItemSku) => update(line.key, { newItemSku })} /><Text label="باركود" value={line.newItemBarcode} onChange={(newItemBarcode) => update(line.key, { newItemBarcode })} /><Text label="التصنيف" value={line.newItemCategory} onChange={(newItemCategory) => update(line.key, { newItemCategory })} /><Qty line={line} onChange={(quantity) => update(line.key, { quantity })} /><Money label="تكلفة الشراء" value={line.unitCost} onChange={(unitCost) => update(line.key, { unitCost })} required /><Money label="سعر البيع (اختياري)" value={line.salePrice} onChange={(salePrice) => update(line.key, { salePrice })} /></div>}
        </div>;
      })}</div>
    </section>

    <section className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900/60 dark:bg-emerald-950/20"><div><p className="text-[10px] font-black text-emerald-700">إجمالي قيمة البضاعة</p><p className="mt-1 font-numeric text-xl font-black">{total.toFixed(2)}</p><p className="mt-1 text-[10px] font-bold text-slate-500">سيتم اعتماد الاستلام وإضافة الكميات للمخزون بدون تسجيل دفعة مالية.</p></div><Button type="submit" disabled={!lines.every((line) => line.unitCost && (line.mode === "EXISTING" ? line.inventoryItemId : line.newItemName))} className="h-12 rounded-xl px-6 font-black"><Save className="ml-2 h-4 w-4" />اعتماد استلام البضاعة</Button></section>
  </form>;
}

function Qty({ line, onChange }: { line: Line; onChange: (value: number) => void }) { return <label className="grid gap-1.5 text-xs font-bold">الكمية<input type="number" min="1" step="1" required className="erp-input font-numeric" value={line.quantity} onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))} /></label>; }
function Money({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <label className="grid gap-1.5 text-xs font-bold">{label}<input type="number" min="0" step="0.01" required={required} className="erp-input font-numeric" value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function Text({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <label className="grid gap-1.5 text-xs font-bold">{label}<input required={required} className="erp-input" value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
