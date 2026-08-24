"use client";

import { useState } from "react";
import { Truck, Calculator } from "lucide-react";
import { Field, inputClassName, textareaClassName } from "./_components";

type SupplierOption = {
  id: string;
  name: string;
  phone: string | null;
};

type SupplierFieldsProps = {
  suppliers: SupplierOption[];
  currency?: string;
  defaultSupplierName?: string;
  defaultPartName?: string;
  defaultPartCost?: string | number | null;
  defaultDeductPartCost?: boolean;
  defaultSupplierNotes?: string;
  estimatedTotal?: string | number | null;
};

export function SupplierFields({
  suppliers,
  currency = "SAR",
  defaultSupplierName = "",
  defaultPartName = "",
  defaultPartCost = "",
  defaultDeductPartCost = true,
  defaultSupplierNotes = "",
}: SupplierFieldsProps) {
  const [supplierName, setSupplierName] = useState(defaultSupplierName || "");
  const [partName, setPartName] = useState(defaultPartName || "");
  const [partCost, setPartCost] = useState(defaultPartCost?.toString() || "");
  const [deductCost, setDeductCost] = useState(defaultDeductPartCost !== false);
  const [supplierNotes, setSupplierNotes] = useState(defaultSupplierNotes || "");

  const numPartCost = Number(partCost.replace(",", ".")) || 0;

  return (
    <section className="erp-section border-teal-100 bg-gradient-to-b from-teal-50/20 to-transparent">
      <div className="border-b border-teal-100/60 pb-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">بيانات المورد وقطع الغيار (خاص بورشة الصيانة)</h3>
            <p className="mt-0.5 text-xs text-slate-400 font-medium">
              توثيق المورد الخارجي وتكلفة القطعة لحساب صافي أرباح الصيانة بدقة (لا تظهر للعميل).
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-xs">
          اختياري
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="اسم المورد (اختر أو اكتب اسماً جديداً)"
          helper="يمكنك الاختيار من الموردين المسجلين أو كتابة مورد جديد وسيتم حفظه تلقائياً."
        >
          <input
            className={inputClassName}
            name="supplierName"
            list="suppliers-datalist"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="مثال: مؤسسة القمة لقطع الغيار، أبو علي..."
          />
          <datalist id="suppliers-datalist">
            {suppliers.map((s) => (
              <option key={s.id} value={s.name}>
                {s.phone ? `(${s.phone})` : ""}
              </option>
            ))}
          </datalist>
        </Field>

        <Field label="اسم القطعة المشتراة">
          <input
            className={inputClassName}
            name="partName"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="مثال: شاشة OLED أصلية، بطارية 5000mAh..."
          />
        </Field>

        <Field label="تكلفة شراء القطعة من المورد">
          <div className="relative">
            <input
              className={`${inputClassName} font-numeric pl-12`}
              name="partCost"
              inputMode="decimal"
              value={partCost}
              onChange={(e) => setPartCost(e.target.value)}
              placeholder="0.00"
            />
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 uppercase">
              {currency}
            </span>
          </div>
        </Field>

        <div className="flex flex-col justify-center">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50/80 transition">
            <input
              type="checkbox"
              name="deductPartCost"
              checked={deductCost}
              onChange={(e) => setDeductCost(e.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                خصم تكلفة القطعة من إجمالي الصيانة
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                {deductCost
                  ? "مفعّل: سيتم طرح سعر القطعة من سعر الصيانة لحساب صافي الربح الحقيقي."
                  : "معطّل: لن يتم خصم التكلفة (مثلاً إذا دفع العميل ثمن القطعة بشكل منفصل)."}
              </span>
            </div>
          </label>
        </div>

        <div className="sm:col-span-2">
          <Field label="ملاحظات المورد والضمان">
            <textarea
              className={textareaClassName}
              name="supplierNotes"
              value={supplierNotes}
              onChange={(e) => setSupplierNotes(e.target.value)}
              placeholder="مثال: رقم فاتورة الشراء 4589، ضمان 30 يوماً ضد عيوب الصناعة من المورد..."
            />
          </Field>
        </div>
      </div>

      {numPartCost > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-teal-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-200">ملخص حساب تكلفة الصيانة</p>
              <p className="text-[11px] text-teal-100/80 font-medium">
                {deductCost
                  ? `سيتم خصم ${numPartCost.toFixed(2)} ${currency} كتكلفة قطعة من صافي أرباح التذكرة.`
                  : `تكلفة القطعة ${numPartCost.toFixed(2)} ${currency} مسجلة للتوثيق فقط دون خصمها من الربح.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl self-start sm:self-auto font-numeric text-xs font-bold text-teal-100">
            <span>تكلفة القطعة:</span>
            <span className="text-sm font-black text-white">{numPartCost.toFixed(2)} {currency}</span>
          </div>
        </div>
      )}
    </section>
  );
}
