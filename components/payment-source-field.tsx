"use client";

import { useState } from "react";

type PaymentSourceOption = { id: string; name: string };

export function PaymentSourceField({
  options,
  disabled = false,
}: {
  options: PaymentSourceOption[];
  disabled?: boolean;
}) {
  const [choice, setChoice] = useState("");
  const custom = choice === "__CUSTOM__";

  return <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
    <label className="grid gap-2">
      <span className="text-xs font-bold text-slate-700">مصدر الدفع <span className="font-medium text-slate-400">(اختياري)</span></span>
      <select name="sourceOptionId" className="erp-input" value={choice} onChange={(event) => setChoice(event.target.value)} disabled={disabled}>
        <option value="">غير محدد</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        <option value="__CUSTOM__">+ إضافة مصدر دفع جديد</option>
      </select>
    </label>
    {custom && <>
      <label className="grid gap-2"><span className="text-xs font-bold text-slate-700">اسم المصدر الجديد</span><input name="customSourceName" className="erp-input" required maxLength={80} placeholder="مثال: Vodafone Cash أو شام كاش" disabled={disabled} /></label>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="saveCustomSource" value="on" defaultChecked disabled={disabled} className="h-4 w-4 accent-teal-600" />حفظ هذا المصدر ليظهر كخيار ثابت لاحقاً</label>
    </>}
  </div>;
}
