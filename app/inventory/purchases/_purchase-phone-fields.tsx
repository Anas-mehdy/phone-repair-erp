"use client";

import { EMPTY_DEVICE_DETAILS, PHONE_STORAGE_OPTIONS, type DeviceDetails } from "@/lib/inventory-device";

export function PurchasePhoneFields({ name, value, onChange }: { name: string; value: DeviceDetails; onChange: (value: DeviceDetails) => void }) {
  const kind = value.isDevice ? value.deviceCondition ?? "USED" : "regular";
  const field = "erp-input w-full";
  function patch(change: Partial<DeviceDetails>) { onChange({ ...value, ...change, deviceModel: name }); }
  return <section className="mt-4 rounded-xl border border-teal-200 bg-teal-50/30 p-4 dark:border-teal-900 dark:bg-teal-950/20">
    <label className="grid max-w-sm gap-2 text-xs font-bold"><span>نوع البند — Condition</span><select aria-label="نوع البند" data-purchase-field className={field} value={kind} onChange={(event) => {
      const next = event.target.value;
      onChange(next === "regular" ? { ...EMPTY_DEVICE_DETAILS } : { ...value, isDevice: true, deviceModel: name, deviceCondition: next as DeviceDetails["deviceCondition"], batteryHealth: next === "NEW" ? null : value.batteryHealth, batteryCycles: next === "NEW" ? null : value.batteryCycles ?? null });
    }}><option value="regular">صنف عادي</option><option value="USED">هاتف مستعمل — Used</option><option value="NEW">هاتف جديد — New</option>{kind === "REFURBISHED" ? <option value="REFURBISHED">هاتف مجدد — Refurbished</option> : null}</select></label>
    {value.isDevice ? <div className="mt-4 space-y-4">
      <p className="text-xs leading-6 text-slate-600 dark:text-slate-400">اسم البند هو موديل الهاتف. أدخل كل هاتف كسطر مستقل بكمية واحدة وباركود خاص به. الهواتف مستثناة من تنبيه المخزون المنخفض.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-2 text-xs font-bold"><span>السعة — Storage *</span><select aria-label="السعة" data-purchase-field className={field} dir="ltr" required value={value.storageCapacity ?? ""} onChange={(event) => patch({ storageCapacity: event.target.value })}><option value="">اختر السعة</option>{value.storageCapacity && !(PHONE_STORAGE_OPTIONS as readonly string[]).includes(value.storageCapacity) ? <option value={value.storageCapacity}>{value.storageCapacity}</option> : null}{PHONE_STORAGE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        {kind === "USED" || kind === "REFURBISHED" ? <label className="grid gap-2 text-xs font-bold"><span>صحة البطارية — Battery health % (اختياري)</span><input data-purchase-field className={field} type="number" min="0" max="100" step="1" value={value.batteryHealth ?? ""} placeholder="غير مقاسة" onChange={(event) => patch({ batteryHealth: event.target.value === "" ? null : Number(event.target.value) })} /></label> : null}
        {kind === "USED" || kind === "REFURBISHED" ? <label className="grid gap-2 text-xs font-bold"><span>عدد دورات الشحن — Battery cycles (اختياري)</span><input data-purchase-field className={field} type="number" min="0" max="2147483647" step="1" inputMode="numeric" value={value.batteryCycles ?? ""} placeholder="غير معروف" onChange={(event) => patch({ batteryCycles: event.target.value === "" ? null : Number(event.target.value) })} /></label> : null}
        <label className="grid gap-2 text-xs font-bold"><span>اللون — Color (اختياري)</span><input data-purchase-field className={field} maxLength={60} value={value.deviceColor ?? ""} onChange={(event) => patch({ deviceColor: event.target.value })} /></label>
        <label className="grid gap-2 text-xs font-bold"><span>الرقم التسلسلي — IMEI / Serial (اختياري)</span><input data-purchase-field className={field} dir="ltr" maxLength={40} value={value.deviceIdentifier ?? ""} onChange={(event) => patch({ deviceIdentifier: event.target.value })} /></label>
      </div>
      <label className="grid gap-2 text-xs font-bold"><span>ملاحظات الحالة — Condition notes (اختياري)</span><textarea data-purchase-field className="erp-textarea" rows={2} maxLength={2000} value={value.deviceNotes ?? ""} onChange={(event) => patch({ deviceNotes: event.target.value })} /></label>
    </div> : null}
  </section>;
}
