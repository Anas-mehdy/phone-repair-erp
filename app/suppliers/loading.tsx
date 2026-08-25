export default function SuppliersLoading() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      <div className="space-y-2">
        <div className="h-6 bg-slate-200 rounded-md w-44" />
        <div className="h-3.5 bg-slate-100 rounded-md w-72" />
      </div>
      <div className="h-12 rounded-2xl bg-teal-50/50 border border-teal-100" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
          <div className="h-10 bg-slate-100 rounded-xl w-full mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-50 border border-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-96 rounded-2xl border border-slate-200/80 bg-white p-5" />
      </div>
    </div>
  );
}
