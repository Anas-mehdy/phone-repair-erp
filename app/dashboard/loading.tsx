export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse" dir="rtl">
      {/* SaaS Hero Welcome Card Skeleton */}
      <div className="h-44 rounded-3xl bg-slate-200/80 p-6 flex flex-col justify-between" />

      {/* KPI Cards Grid Skeleton */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white border border-slate-200/80 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-2/3">
                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-10 w-10 bg-slate-200 rounded-2xl" />
            </div>
            <div className="h-7 bg-slate-200 rounded w-1/3 mt-3" />
          </div>
        ))}
      </section>

      {/* Activity and Quick Actions Skeleton */}
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4">
              <div className="h-4 bg-slate-200 rounded w-1/2 pb-2" />
              <div className="space-y-2.5 pt-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-16 bg-slate-100/80 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/3 pb-2" />
          <div className="space-y-2.5 pt-2">
            {[1, 2, 3, 4, 5].map((k) => (
              <div key={k} className="h-14 bg-slate-100/80 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
