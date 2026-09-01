"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { createSoftwareServiceSaleAction } from "./actions";

type CustomerOption = { id: string; name: string; phone: string | null };
type CatalogOption = {
  id: string;
  name: string;
  defaultPrice: string | null;
  defaultCost: string | null;
};

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
const labelClass = "mb-1.5 block text-xs font-black text-slate-700";

export function SoftwareServiceForm({
  customers,
  catalog,
}: {
  customers: CustomerOption[];
  catalog: CatalogOption[];
}) {
  const [catalogId, setCatalogId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [serviceCost, setServiceCost] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "new" | "none">("existing");
  const [deviceKept, setDeviceKept] = useState(false);

  const selectedCatalog = useMemo(
    () => catalog.find((item) => item.id === catalogId),
    [catalog, catalogId],
  );

  function chooseCatalog(value: string) {
    setCatalogId(value);
    const item = catalog.find((entry) => entry.id === value);
    if (!item) return;
    setServiceName(item.name);
    if (item.defaultPrice != null) setSalePrice(item.defaultPrice);
    if (item.defaultCost != null) setServiceCost(item.defaultCost);
  }

  return (
    <form action={createSoftwareServiceSaleAction} className="space-y-6">
      <section className="erp-section space-y-4">
        <div>
          <h2 className="text-sm font-black text-slate-900">العميل</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">اختر عميلاً موجوداً أو أضف عميلاً جديداً. يمكن أيضاً تسجيل الخدمة بدون عميل.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["existing", "عميل موجود"],
            ["new", "عميل جديد"],
            ["none", "بدون عميل"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCustomerMode(value)}
              className={`rounded-xl border px-3 py-2 text-xs font-black ${customerMode === value ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {customerMode === "existing" ? (
          <div>
            <label className={labelClass}>اختيار العميل</label>
            <select className={inputClass} name="customerId" defaultValue="">
              <option value="">بدون عميل محدد</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.phone ? ` — ${customer.phone}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : customerMode === "new" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>اسم العميل</label>
              <input className={inputClass} name="newCustomerName" required placeholder="اسم العميل" />
            </div>
            <div>
              <label className={labelClass}>رقم الهاتف</label>
              <input className={`${inputClass} font-numeric`} name="newCustomerPhone" placeholder="اختياري" />
            </div>
          </div>
        ) : null}
      </section>

      <section className="erp-section space-y-4">
        <div>
          <h2 className="text-sm font-black text-slate-900">تفاصيل الخدمة</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">عملية بيع مباشرة بدون حالات أو سير عمل.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>خدمة محفوظة</label>
            <select className={inputClass} name="catalogId" value={catalogId} onChange={(e) => chooseCatalog(e.target.value)}>
              <option value="">خدمة مخصصة / اكتب الاسم</option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>اسم الخدمة *</label>
            <input className={inputClass} name="serviceName" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required placeholder="مثال: تفليش جهاز / FRP / تحديث نظام" />
          </div>
          <div>
            <label className={labelClass}>سعر البيع للعميل *</label>
            <input className={`${inputClass} font-numeric`} name="salePrice" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} min="0.01" step="0.01" type="number" required placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>تكلفة الخدمة على المحل</label>
            <input className={`${inputClass} font-numeric`} name="serviceCost" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} min="0" step="0.01" type="number" placeholder="اختياري" />
            <p className="mt-1 text-[10px] font-bold text-slate-400">اتركها فارغة إذا لم توجد تكلفة أو لا تعرفها.</p>
          </div>
        </div>
        {selectedCatalog ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">تم تحميل السعر والتكلفة الافتراضيين من كتالوج الخدمة، ويمكنك تعديلهما لهذه العملية فقط.</p>
        ) : null}
      </section>

      <section className="erp-section space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>شركة الجهاز</label>
            <input className={inputClass} name="deviceBrand" placeholder="Samsung / Xiaomi..." />
          </div>
          <div>
            <label className={labelClass}>موديل الجهاز</label>
            <input className={inputClass} name="deviceModel" placeholder="اختياري" />
          </div>
          <div>
            <label className={labelClass}>IMEI / Serial</label>
            <input className={`${inputClass} font-numeric`} name="deviceSerial" placeholder="اختياري" />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <input className="mt-1 h-4 w-4 accent-teal-600" type="checkbox" name="deviceKept" checked={deviceKept} onChange={(e) => setDeviceKept(e.target.checked)} />
          <span>
            <span className="block text-xs font-black text-slate-800">الجهاز سيبقى في المحل</span>
            <span className="mt-1 block text-[11px] font-medium text-slate-500">يفعّل ملصق الجهاز وتتبع «بانتظار التسليم» فقط، بدون إضافة حالات للخدمة.</span>
          </span>
        </label>
        <div>
          <label className={labelClass}>ملاحظات</label>
          <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" name="notes" placeholder="أي تفاصيل إضافية عن الخدمة أو الجهاز" />
        </div>
      </section>

      <div className="flex justify-end">
        <SubmitButton className="h-11 rounded-xl px-7 font-black" loadingText="جاري تسجيل الخدمة والفاتورة...">
          حفظ الخدمة وإنشاء الفاتورة
        </SubmitButton>
      </div>
    </form>
  );
}
