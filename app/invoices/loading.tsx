export default function InvoicesLoading() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      <div className="space-y-2">
        <div className="h-8 w-36 rounded-lg bg-slate-200" />
        <div className="h-4 w-64 max-w-full rounded-md bg-slate-100" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {["bg-cyan-50 border-cyan-100", "bg-indigo-50 border-indigo-100", "bg-emerald-50 border-emerald-100", "bg-amber-50 border-amber-100"].map((tone) => (
          <div key={tone} className={`h-36 rounded-2xl border ${tone} p-4`}>
            <div className="h-9 w-9 rounded-xl bg-white/80" />
            <div className="mt-4 h-3 w-24 rounded bg-slate-200/70" />
            <div className="mt-3 h-6 w-28 rounded bg-slate-200/80" />
          </div>
        ))}
      </div>

      <div className="h-28 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid h-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="rounded-xl bg-slate-50" />)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl border border-slate-100 bg-slate-50" />)}
      </div>
    </div>
  );
}
