import { ArrowRight, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getAuthContext } from "@/lib/auth/context";
import { createCustomerAction } from "../actions";

export const dynamic = "force-dynamic";

const inputClassName =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const textareaClassName =
  "min-h-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type NewCustomerPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewCustomerPage({ searchParams }: NewCustomerPageProps) {
  const params = await searchParams;
  const auth = await getAuthContext();
  const canManage = auth.permissions.includes("customers:manage");

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
        ليس لديك صلاحية لإضافة العملاء.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إضافة عميل جديد"
        description="أنشئ ملف عميل الآن ليكون جاهزاً للاختيار لاحقاً في الصيانة والمبيعات والفواتير"
        actions={
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/customers">
              <ArrowRight className="ml-1.5 h-4 w-4" />
              رجوع للعملاء
            </Link>
          </Button>
        }
      />

      {params.error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {params.error}
        </div>
      )}

      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">بيانات العميل</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">الاسم مطلوب، وباقي البيانات اختيارية. رقم الهاتف يساعد في منع تكرار العميل.</p>
          </div>
        </div>

        <form action={createCustomerAction} className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-extrabold text-slate-600">
            <span>اسم العميل *</span>
            <input name="name" required maxLength={160} className={inputClassName} placeholder="مثال: محمود أحمد" autoFocus />
          </label>

          <label className="grid gap-2 text-xs font-extrabold text-slate-600">
            <span>رقم الهاتف</span>
            <input name="phone" className={inputClassName} placeholder="مثال: 01012345678" inputMode="tel" />
          </label>

          <label className="grid gap-2 text-xs font-extrabold text-slate-600 sm:col-span-2">
            <span>البريد الإلكتروني</span>
            <input name="email" type="email" className={inputClassName} placeholder="name@example.com" />
          </label>

          <label className="grid gap-2 text-xs font-extrabold text-slate-600 sm:col-span-2">
            <span>ملاحظات</span>
            <textarea name="notes" className={textareaClassName} placeholder="أي ملاحظات عن العميل..." />
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline" className="h-11 rounded-xl font-bold">
              <Link href="/customers">إلغاء</Link>
            </Button>
            <Button type="submit" className="h-11 rounded-xl px-6 font-black shadow-sm">
              <Save className="ml-1.5 h-4 w-4" />
              حفظ العميل
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
