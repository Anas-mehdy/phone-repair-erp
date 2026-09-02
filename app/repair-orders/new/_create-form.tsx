"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Save, Loader2, User, Smartphone, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createRepairOrderAction } from "../actions";
import { Field, inputClassName, textareaClassName } from "../_components";
import { SupplierFields, type SupplierOption, type InventoryItemOption } from "../_supplier-fields";
import { RepairCustomerSearch, type RepairCustomerOption } from "./_customer-search";

export function CreateRepairOrderForm({
  suppliers,
  inventoryItems = [],
  currency,
  technicians = [],
}: {
  suppliers: SupplierOption[];
  inventoryItems?: InventoryItemOption[];
  currency: string;
  technicians?: Array<{ id: string; name: string; email: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedCustomer, setSelectedCustomer] = useState<RepairCustomerOption | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      await createRepairOrderAction(formData);
    });
  }

  function handleCustomerSelect(customer: RepairCustomerOption | null) {
    setSelectedCustomer(customer);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone ?? "");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="repair-new-form space-y-6">
      <section className="erp-section repair-new-card repair-new-card-customer border-cyan-200/80 bg-gradient-to-br from-cyan-50/70 via-white to-white shadow-sm shadow-cyan-100/50">
        <div className="flex items-center gap-2 border-b border-cyan-100/80 pb-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200/70">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-cyan-950 text-sm">بيانات العميل</h3>
            <p className="text-xs text-cyan-700/70 font-medium mt-0.5">
              ابحث عن عميل موجود أو أدخل بيانات عميل جديد.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-cyan-200/80 bg-white/70 p-3 shadow-xs shadow-cyan-100/40">
          <Field label="البحث عن عميل موجود">
            <RepairCustomerSearch
              value={selectedCustomer?.id ?? ""}
              selectedCustomer={selectedCustomer}
              disabled={isPending}
              onSelect={handleCustomerSelect}
            />
          </Field>
          <p className="mt-1.5 text-[10px] font-medium text-slate-400">
            اكتب أول حرف من الاسم أو جزءاً من رقم الهاتف، ثم اختر العميل لتعبئة بياناته مباشرة.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم العميل">
            <input
              className={inputClassName}
              name="customerName"
              required
              disabled={isPending}
              placeholder="مثال: محمد أحمد"
              value={customerName}
              onChange={(event) => {
                setCustomerName(event.target.value);
                if (selectedCustomer) setSelectedCustomer(null);
              }}
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              className={`${inputClassName} font-numeric`}
              name="customerPhone"
              required
              disabled={isPending}
              inputMode="tel"
              placeholder="05xxxxxxxx"
              value={customerPhone}
              onChange={(event) => {
                setCustomerPhone(event.target.value);
                if (selectedCustomer) setSelectedCustomer(null);
              }}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ملاحظات العميل">
              <textarea
                className={textareaClassName}
                name="customerNotes"
                disabled={isPending}
                placeholder="أية تفاصيل خاصة بالعميل..."
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="erp-section repair-new-card repair-new-card-device border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-white shadow-sm shadow-indigo-100/50">
        <div className="flex items-center gap-2 border-b border-indigo-100/80 pb-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/70">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-950 text-sm">بيانات الجهاز والصيانة</h3>
            <p className="text-xs text-indigo-700/70 font-medium mt-0.5">
              وصف تفاصيل الجهاز والمشكلة لتسهيل التتبع والتشخيص داخل الورشة.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الشركة المصنعة">
            <input className={inputClassName} name="deviceBrand" disabled={isPending} placeholder="مثال: Apple, Samsung" />
          </Field>
          <Field label="الموديل">
            <input className={inputClassName} name="deviceModel" disabled={isPending} placeholder="مثال: iPhone 15 Pro" />
          </Field>
          <Field label="الرقم التسلسلي (SN / IMEI)">
            <input className={`${inputClassName} font-numeric`} name="deviceSerial" disabled={isPending} placeholder="أدخل الرقم التسلسلي لجهاز العميل..." />
          </Field>
          <Field label="سعر الصيانة المتوقع للعميل (تقديري)">
            <input className={`${inputClassName} font-numeric`} name="estimatedTotal" disabled={isPending} inputMode="decimal" placeholder="0.00" />
          </Field>
          <Field label="تاريخ التسليم المتوقع">
            <input className={`${inputClassName} font-numeric`} name="dueAt" disabled={isPending} type="date" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="المشكلة المبلغ عنها">
              <textarea className={textareaClassName} name="reportedIssue" required disabled={isPending} placeholder="مثال: الشاشة مكسورة، الجهاز لا يشحن..." />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="ملاحظات داخلية للفنيين">
              <textarea className={textareaClassName} name="notes" disabled={isPending} placeholder="ملاحظات تظهر للفنيين فقط ولا تظهر للعميل..." />
            </Field>
          </div>
        </div>
      </section>

      {technicians.length > 0 ? (
        <section className="erp-section repair-new-card repair-new-card-technician border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-white shadow-sm shadow-emerald-100/50">
          <div className="flex items-center gap-2 border-b border-emerald-100/80 pb-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/70">
              <UserRoundCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">الفني المسؤول</h3>
              <p className="text-xs text-emerald-700/70 font-medium mt-0.5">
                يمكنك إسناد التذكرة الآن أو تركها غير مسندة واختيار الفني لاحقاً.
              </p>
            </div>
          </div>
          <Field label="إسناد التذكرة إلى">
            <select className={inputClassName} name="assignedToUserId" disabled={isPending} defaultValue="">
              <option value="">غير مسندة حالياً</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>{technician.name}</option>
              ))}
            </select>
          </Field>
        </section>
      ) : null}

      <div className="repair-new-supplier">
        <SupplierFields suppliers={suppliers} inventoryItems={inventoryItems} currency={currency} />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button asChild variant="outline" type="button" disabled={isPending} className="rounded-xl h-12 px-5 font-bold border-slate-300">
          <Link href="/repair-orders">
            <ArrowRight className="h-4 w-4 ml-1.5" />
            إلغاء والعودة
          </Link>
        </Button>

        <Button type="submit" disabled={isPending} className="h-12 px-8 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-900/15 flex items-center justify-center gap-2 min-w-[180px]">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جاري حفظ وإنشاء الطلب...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 ml-1.5" />
              <span>حفظ طلب الصيانة</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
