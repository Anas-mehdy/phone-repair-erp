export default function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 rounded-md w-32" />
          <div className="h-3.5 bg-slate-100 rounded-md w-52" />
        </div>
        <div className="h-10 bg-slate-200 rounded-xl w-36" />
      </div>
      <div className="h-12 rounded-2xl bg-indigo-50/50 border border-indigo-100" />
      <div className="h-20 rounded-2xl border border-slate-200/80 bg-white p-4" />
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
        <div className="h-10 bg-slate-100 rounded-xl w-full mb-4" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-12 bg-slate-50 border border-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
