"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, PackageSearch, Paperclip, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createSupplierInvoiceAction,
  searchInventoryForSupplierInvoiceAction,
} from "../../invoice-actions";

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const textareaClassName =
  "min-h-[88px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type SupplierOption = { id: string; name: string };
type SearchResult = Awaited<ReturnType<typeof searchInventoryForSupplierInvoiceAction>>[number];

type InvoiceLine = {
  key: string;
  inventoryItemId: string;
  itemName: string;
  sku: string | null;
  quantity: string;
  unitCost: string;
};

function emptyLine(): InvoiceLine {
  return {
    key: crypto.randomUUID(),
    inventoryItemId: "",
    itemName: "",
    sku: null,
    quantity: "1",
    unitCost: "",
  };
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("ar", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function SupplierInvoiceForm({
  suppliers,
  currency,
  initialSupplierId,
}: {
  suppliers: SupplierOption[];
  currency: string;
  initialSupplierId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState("");

  const total = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const unitCost = Number(line.unitCost.replace(",", "."));
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitCost) ? quantity * unitCost : 0);
  }, 0);

  function updateLine(key: string, patch: Partial<InvoiceLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)));
  }

  function handleAttachment(file: File | null) {
    setError("");
    if (!file) {
      setAttachment(null);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("المسموح فقط: JPG أو PNG أو WEBP أو PDF.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("حجم ملف الفاتورة يجب ألا يتجاوز 4 ميغابايت.");
      return;
    }
    setAttachment(file);
  }

  function submit() {
    setError("");
    if (!supplierId) {
      setError("اختر المورد أولاً.");
      return;
    }
    if (!invoiceDate) {
      setError("حدد تاريخ الفاتورة.");
      return;
    }
    if (lines.some((line) => !line.inventoryItemId)) {
      setError("اختر قطعة مخزون صحيحة لكل بند.");
      return;
    }
    if (lines.some((line) => Number(line.quantity) <= 0)) {
      setError("الكمية يجب أن تكون أكبر من صفر.");
      return;
    }
    if (lines.some((line) => line.unitCost.trim() === "" || Number(line.unitCost.replace(",", ".")) < 0)) {
      setError("أدخل تكلفة شراء صحيحة لكل بند.");
      return;
    }

    const formData = new FormData();
    formData.set("supplierId", supplierId);
    formData.set("invoiceNumber", invoiceNumber);
    formData.set("invoiceDate", invoiceDate);
    formData.set("notes", notes);
    formData.set(
      "items",
      JSON.stringify(
        lines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          quantity: Number(line.quantity),
          unitCost: line.unitCost,
        })),
      ),
    );
    if (attachment) formData.set("attachment", attachment);

    startTransition(async () => {
      const result = await createSupplierInvoiceAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/suppliers/invoices/${result.invoiceId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="erp-section">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-800">بيانات الفاتورة</h3>
          <p className="mt-1 text-[11px] font-medium text-slate-400">المرفق اختياري، أما البنود والكميات والتكلفة فتُسجّل يدوياً.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1.5 text-xs font-extrabold text-slate-700">
            <span>المورد <span className="text-rose-500">*</span></span>
            <select className={inputClassName} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">اختر المورد...</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-extrabold text-slate-700">
            <span>رقم الفاتورة</span>
            <input className={inputClassName} value={invoiceNumber} maxLength={120} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="مثال: INV-1024" />
          </label>
          <label className="grid gap-1.5 text-xs font-extrabold text-slate-700">
            <span>تاريخ الفاتورة <span className="text-rose-500">*</span></span>
            <input className={`${inputClassName} font-numeric`} type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="erp-section">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-800">بنود الفاتورة</h3>
            <p className="mt-1 text-[11px] font-medium text-slate-400">ابحث عن القطعة، ثم أدخل الكمية وتكلفة الشراء في هذه الفاتورة.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])} className="font-bold">
            <Plus className="ml-1.5 h-4 w-4" /> بند جديد
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={line.key} className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/30 p-4 lg:grid-cols-[minmax(260px,1fr)_130px_160px_150px_42px] lg:items-end">
              <div>
                <p className="mb-1.5 text-xs font-extrabold text-slate-700">القطعة #{index + 1}</p>
                <InventoryPicker
                  line={line}
                  onSelect={(result) =>
                    updateLine(line.key, {
                      inventoryItemId: result.id,
                      itemName: result.name,
                      sku: result.sku,
                      unitCost: result.unitCost,
                    })
                  }
                  onClear={(query) => updateLine(line.key, { inventoryItemId: "", itemName: query, sku: null })}
                />
              </div>
              <label className="grid gap-1.5 text-xs font-extrabold text-slate-700">
                <span>الكمية</span>
                <input className={`${inputClassName} font-numeric`} type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-extrabold text-slate-700">
                <span>تكلفة الوحدة</span>
                <input className={`${inputClassName} font-numeric`} type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updateLine(line.key, { unitCost: event.target.value })} placeholder="0.00" />
              </label>
              <div className="grid gap-1.5 text-xs font-extrabold text-slate-700">
                <span>إجمالي البند</span>
                <div className="flex h-10 items-center rounded-md border bg-white px-3 font-black font-numeric text-indigo-700">
                  {money(Number(line.quantity || 0) * Number(line.unitCost || 0), currency)}
                </div>
              </div>
              <Button type="button" variant="outline" size="icon" disabled={lines.length === 1} onClick={() => removeLine(line.key)} className="h-10 w-10 border-rose-200 text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 px-5 py-3 text-left">
            <p className="text-[10px] font-bold text-indigo-500">إجمالي الفاتورة</p>
            <p className="mt-1 text-xl font-black font-numeric text-indigo-800">{money(total, currency)}</p>
          </div>
        </div>
      </section>

      <section className="erp-section">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><Paperclip className="h-4 w-4 text-teal-600" /> مرجع الفاتورة</h3>
          <p className="mt-1 text-[11px] font-medium text-slate-400">اختياري: ارفع صورة أو PDF حتى تستطيع فتح النسخة الأصلية لاحقاً. الحد الأقصى 4MB.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-extrabold text-slate-700">
            <span>صورة / PDF</span>
            <input
              className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-600 file:ml-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-bold file:text-primary"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => handleAttachment(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-extrabold text-slate-700">
            <span>ملاحظات</span>
            <textarea className={textareaClassName} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="شروط، ملاحظات ضمان، تفاصيل إضافية..." />
          </label>
        </div>
        {attachment ? <p className="mt-3 text-xs font-bold text-emerald-700">تم اختيار: {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(2)} MB)</p> : null}
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={isPending} className="h-12 min-w-52 rounded-xl px-7 font-black shadow-md">
          {isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
          {isPending ? "جاري حفظ الفاتورة..." : "حفظ الفاتورة وتحديث المخزون"}
        </Button>
      </div>
    </div>
  );
}

function InventoryPicker({
  line,
  onSelect,
  onClear,
}: {
  line: InvoiceLine;
  onSelect: (result: SearchResult) => void;
  onClear: (query: string) => void;
}) {
  const [query, setQuery] = useState(line.itemName);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || (line.inventoryItemId && trimmed === line.itemName)) {
      setResults([]);
      setOpen(false);
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchInventoryForSupplierInvoiceAction(trimmed);
        if (requestId.current !== currentRequest) return;
        setResults(found);
        setOpen(true);
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query, line.inventoryItemId, line.itemName]);

  return (
    <div className="relative">
      <PackageSearch className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
      <input
        className={`${inputClassName} pr-9`}
        value={query}
        placeholder="ابدأ بكتابة اسم القطعة أو SKU..."
        onFocus={() => results.length > 0 && setOpen(true)}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          onClear(value);
        }}
      />
      {loading ? <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-slate-400" /> : null}
      {line.inventoryItemId ? (
        <p className="mt-1 text-[10px] font-bold text-emerald-700">محدد من المخزون {line.sku ? `• SKU: ${line.sku}` : ""}</p>
      ) : null}
      {open ? (
        <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs font-medium text-slate-400">لا توجد نتائج في المخزون.</p>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-slate-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(result.name);
                  setOpen(false);
                  onSelect(result);
                }}
              >
                <span>
                  <span className="block text-xs font-black text-slate-800">{result.name}</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                    {result.sku ? `SKU: ${result.sku}` : "بدون SKU"} • المتوفر حالياً: {result.quantity}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-bold text-slate-500">تكلفة حالية: {result.unitCost}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
