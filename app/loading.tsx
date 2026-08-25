export default function GlobalLoading() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Header Skeleton */}
      <div className="h-16 rounded-2xl bg-slate-200/70 w-full" />

      {/* Hero / KPI Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/60 p-5 space-y-3">
            <div className="h-4 bg-slate-300/70 rounded-md w-1/2" />
            <div className="h-7 bg-slate-300/80 rounded-md w-3/4" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="h-96 rounded-2xl bg-slate-200/50 p-6 space-y-4">
        <div className="h-6 bg-slate-300/70 rounded-md w-1/4" />
        <div className="h-4 bg-slate-300/50 rounded-md w-1/2" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-200/80 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
