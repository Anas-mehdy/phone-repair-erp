"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowLeft, Loader2, Save, Smartphone, User, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClassName, textareaClassName } from "../_components";
import { createRepairOrderAction } from "../actions";

export function RepairOnboardingQuickForm() {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    formData.set("onboarding", "1");

    startTransition(async () => {
      await createRepairOrderAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="onboarding" value="1" />

      <section className="overflow-hidden rounded-[24px] border border-teal-200/80 bg-white shadow-[0_24px_70px_-48px_rgba(13,148,136,0.55)] dark:border-teal-900/60 dark:bg-slate-900">
        <div className="border-b border-teal-100 bg-gradient-to-l from-teal-50 via-white to-cyan-50/70 px-5 py-4 dark:border-teal-900/50 dark:from-teal-950/30 dark:via-slate-900 dark:to-cyan-950/20">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-600/20">
              <Wrench className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black text-teal-700 dark:text-teal-300">أول خطوة عملية</p>
              <h1 className="mt-0.5 text-[18px] font-black text-slate-950 sm:text-xl dark:text-slate-50">سجّل أول جهاز صيانة</h1>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                أدخل الأساسيات فقط. يمكنك إضافة السعر، الفني، القطع والموردين لاحقاً من نفس التذكرة.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-700" />
              <h2 className="text-[13px] font-black text-slate-900 dark:text-slate-100">العميل</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم العميل">
                <input
                  className={inputClassName}
                  name="customerName"
                  required
                  autoFocus
                  disabled={isPending}
                  placeholder="مثال: محمد أحمد"
                  autoComplete="off"
                />
              </Field>
              <Field label="رقم الهاتف">
                <input
                  className={`${inputClassName} font-numeric`}
                  name="customerPhone"
                  required
                  disabled={isPending}
                  inputMode="tel"
                  placeholder="رقم العميل"
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-indigo-700" />
              <h2 className="text-[13px] font-black text-slate-900 dark:text-slate-100">الجهاز والمشكلة</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الشركة المصنعة">
                <input className={inputClassName} name="deviceBrand" disabled={isPending} placeholder="Samsung, Apple..." />
              </Field>
              <Field label="الموديل">
                <input className={inputClassName} name="deviceModel" disabled={isPending} placeholder="مثال: A55 أو iPhone 13" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="المشكلة المبلغ عنها">
                  <textarea
                    className={textareaClassName}
                    name="reportedIssue"
                    required
                    disabled={isPending}
                    rows={3}
                    placeholder="مثال: الجهاز لا يشحن، الشاشة مكسورة..."
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/repair-orders/new?onboarding=1&mode=full"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          أحتاج تفاصيل إضافية الآن
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 min-w-[190px] rounded-xl bg-gradient-to-l from-teal-700 to-cyan-700 px-6 text-[12px] font-black text-white shadow-lg shadow-teal-700/15 hover:from-teal-600 hover:to-cyan-600"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جارٍ تسجيل الجهاز...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              تسجيل أول جهاز
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-[10px] font-semibold leading-5 text-slate-400 dark:text-slate-500">
        لا تحتاج تجهيز كل النظام الآن — جهاز واحد كفاية لتجربة دورة العمل الأساسية.
      </p>
    </form>
  );
}
