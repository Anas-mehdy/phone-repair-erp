"use client";

import { useId, useState } from "react";
import { Smartphone } from "lucide-react";
import { DEVICE_CONDITIONS, EMPTY_DEVICE_DETAILS, type DeviceDetails } from "@/lib/inventory-device";

export function InventoryDeviceFields({ initialValue, value, onChange, named = false }: {
  initialValue?: DeviceDetails; value?: DeviceDetails; onChange?: (details: DeviceDetails) => void; named?: boolean;
}) {
  const [local, setLocal] = useState<DeviceDetails>(initialValue ?? { ...EMPTY_DEVICE_DETAILS });
  const current = value ?? local;
  const id = useId();
  function change(patch: Partial<DeviceDetails>) {
    const next = { ...current, ...patch };
    setLocal(next); onChange?.(next);
  }
  const inputClass = "erp-input h-10 w-full";
  return <section className="rounded-2xl border border-teal-200/70 bg-teal-50/30 p-4 dark:border-teal-900 dark:bg-teal-950/20">
    {named ? <input type="hidden" name="deviceDetails" value={JSON.stringify(current)} /> : null}
    <label className="flex cursor-pointer items-center gap-3 text-sm font-black text-slate-800 dark:text-slate-100">
      <input type="checkbox" checked={current.isDevice} onChange={(event) => change({ isDevice: event.target.checked, deviceCondition: current.deviceCondition ?? "USED" })} />
      <Smartphone className="h-5 w-5 text-teal-700" />هذا الصنف جهاز مستقل قابل لطباعة ليبل
    </label>
    <p className="mt-2 text-[11px] font-medium leading-5 text-slate-500 dark:text-slate-400">كل جهاز له سجل وباركود مستقلان وكمية واحدة، حتى لو كان من نفس الموديل. المنتجات وقطع الغيار تبقى بالطريقة المعتادة.</p>
    {current.isDevice ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1.5 text-xs font-bold"><span>الموديل *</span><input className={inputClass} value={current.deviceModel ?? ""} maxLength={80} placeholder="iPhone 17 Pro Max" onChange={(event) => change({ deviceModel: event.target.value })} required /></label>
      <label className="grid gap-1.5 text-xs font-bold"><span>حالة الجهاز *</span><select className={inputClass} value={current.deviceCondition ?? ""} onChange={(event) => change({ deviceCondition: event.target.value as DeviceDetails["deviceCondition"] })} required><option value="">اختر الحالة</option>{Object.entries(DEVICE_CONDITIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-bold"><span>سعة الجهاز *</span><input className={inputClass} value={current.storageCapacity ?? ""} maxLength={24} list={`${id}-storage`} placeholder="256 GB" dir="ltr" onChange={(event) => change({ storageCapacity: event.target.value })} required /><datalist id={`${id}-storage`}>{["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "2 TB", "4 TB"].map((size) => <option key={size} value={size} />)}</datalist></label>
      <label className="grid gap-1.5 text-xs font-bold"><span>صحة البطارية % (اختياري)</span><input className={inputClass} type="number" min="0" max="100" step="1" value={current.batteryHealth ?? ""} placeholder="غير مقاسة" onChange={(event) => change({ batteryHealth: event.target.value === "" ? null : Number(event.target.value) })} /><span className="text-[10px] font-medium text-slate-400">تُطبع باسم Battery Health. اتركها فارغة إذا لم تُقَس.</span></label>
      <label className="grid gap-1.5 text-xs font-bold sm:col-span-2"><span>IMEI / Serial (اختياري)</span><input className={inputClass} value={current.deviceIdentifier ?? ""} maxLength={40} dir="ltr" placeholder="رقم الجهاز الفريد" onChange={(event) => change({ deviceIdentifier: event.target.value })} /><span className="text-[10px] font-medium text-slate-400">لتمييز الجهاز داخل المخزون. لا يظهر على الملصق.</span></label>
    </div> : null}
  </section>;
}
