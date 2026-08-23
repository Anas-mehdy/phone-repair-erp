import { Database } from "lucide-react";

export function DatabaseUnavailable() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-rose-100 bg-white p-6 shadow-sm shadow-rose-50/50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <Database className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">الاتصال بقاعدة البيانات غير متوفر</h2>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">
        يعمل التطبيق بشكل طبيعي، ولكن تعذر الاتصال بقاعدة البيانات حالياً. يرجى التحقق من صحة 
        متغير الاتصال <code className="rounded bg-slate-50 px-1 py-0.5 font-numeric text-rose-600 font-semibold">DATABASE_URL</code> في ملف <code className="rounded bg-slate-50 px-1 py-0.5 font-numeric">.env</code>، ثم تشغيل الأوامر التالية لتهيئة الجداول والبيانات الأولية:
      </p>
      <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4 text-left font-numeric text-sm text-slate-600" dir="ltr">
        <p className="font-semibold text-slate-700">npx prisma migrate dev</p>
        <p className="mt-1 font-semibold text-slate-700">npm run db:seed</p>
      </div>
    </div>
  );
}

