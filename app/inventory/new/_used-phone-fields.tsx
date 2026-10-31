"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { EMPTY_DEVICE_DETAILS, PHONE_STORAGE_OPTIONS } from "@/lib/inventory-device";
import { Field, inputClassName, textareaClassName } from "../_components";

const PhoneContext = createContext<{ used: boolean; setUsed: (value: boolean) => void } | null>(null);

export function InventoryPhoneProvider({ children }: { children: ReactNode }) {
  const [used, setUsed] = useState(false);
  return <PhoneContext.Provider value={{ used, setUsed }}>{children}</PhoneContext.Provider>;
}

function usePhone() {
  const value = useContext(PhoneContext);
  if (!value) throw new Error("Inventory phone fields require their provider.");
  return value;
}

export function InventoryNameAndPhoneFields({ defaultName = "" }: { defaultName?: string }) {
  const { used, setUsed } = usePhone();
  const [name, setName] = useState(defaultName);
  const [battery, setBattery] = useState("");
  const [storage, setStorage] = useState("");
  const [color, setColor] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [notes, setNotes] = useState("");
  const panelId = useId();
  const details = used ? { isDevice: true, deviceModel: name, deviceCondition: "USED", batteryHealth: battery === "" ? null : Number(battery), storageCapacity: storage, deviceIdentifier: identifier || null, deviceColor: color || null, deviceNotes: notes || null } : EMPTY_DEVICE_DETAILS;

  return <div className="space-y-3">
    <Field label="اسم القطعة"><input className={inputClassName} name="name" required maxLength={used ? 80 : undefined} placeholder={used ? "مثال: iPhone 13 Pro" : "مثال: شاشة آيفون 11 برو الأصلية"} value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <input type="hidden" name="deviceDetails" value={JSON.stringify(details)} />
    <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 dark:border-teal-900 dark:bg-teal-950/20">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><input type="checkbox" className="h-4 w-4 accent-teal-700" checked={used} aria-controls={panelId} aria-expanded={used} onChange={(event) => setUsed(event.target.checked)} />هذا الصنف هاتف مستعمل</label>
      {used ? <div id={panelId} className="mt-4 space-y-4">
        <p className="text-xs leading-6 text-slate-600 dark:text-slate-400">اكتب اسم الهاتف وموديله في اسم القطعة أعلاه. لكل هاتف سجل مستقل بكمية واحدة.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-bold"><span>السعة *</span><select dir="ltr" aria-label="السعة" className={inputClassName} required value={storage} onChange={(event) => setStorage(event.target.value)}><option value="">اختر السعة</option>{PHONE_STORAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="grid gap-1.5 text-xs font-bold"><span>صحة البطارية % (اختياري)</span><input className={inputClassName} type="number" min="0" max="100" step="1" inputMode="numeric" value={battery} placeholder="غير مقاسة" onChange={(event) => setBattery(event.target.value)} /></label>
          <label className="grid gap-1.5 text-xs font-bold"><span>اللون (اختياري)</span><input className={inputClassName} maxLength={60} value={color} placeholder="مثال: أسود" onChange={(event) => setColor(event.target.value)} /></label>
          <label className="grid gap-1.5 text-xs font-bold"><span>IMEI / الرقم التسلسلي (اختياري)</span><input className={inputClassName} maxLength={40} dir="ltr" value={identifier} onChange={(event) => setIdentifier(event.target.value)} /></label>
        </div>
        <label className="grid gap-1.5 text-xs font-bold"><span>ملاحظات الحالة (اختياري)</span><textarea className={textareaClassName} maxLength={2000} rows={3} value={notes} placeholder="الخدوش، القطع المستبدلة، الملحقات المتوفرة..." onChange={(event) => setNotes(event.target.value)} /></label>
        <p className="text-[11px] leading-5 text-slate-500">السعة وصحة البطارية تظهران على الليبل. الرقم التسلسلي وملاحظات الحالة تبقى داخل النظام.</p>
      </div> : null}
    </div>
  </div>;
}

export function InventoryOpeningQuantity({ initial = "0", minimum = 0 }: { initial?: string; minimum?: number }) {
  const { used } = usePhone();
  const [quantity, setQuantity] = useState(initial);
  return <Field label="الكمية الافتتاحية" helper={used ? "هاتف واحد لكل سجل؛ أضف الهاتف الآخر كصنف مستقل." : undefined}><input className={`${inputClassName} font-numeric`} name="quantity" type="number" min={used ? 1 : minimum} max={used ? 1 : undefined} step="1" required value={used ? "1" : quantity} readOnly={used} onChange={(event) => setQuantity(event.target.value)} /></Field>;
}
