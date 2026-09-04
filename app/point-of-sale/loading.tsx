export default function PointOfSaleLoading() {
  return (
    <div className="space-y-4 pb-8 sm:space-y-5" aria-label="جاري تحميل نقطة البيع">
      <div className="h-36 animate-pulse rounded-[24px] border border-slate-200/80 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70 sm:rounded-[28px]" />
      <div className="rounded-[20px] border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-950 sm:rounded-[22px]"><div className="flex gap-2 overflow-hidden sm:grid sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 min-w-[148px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900 sm:min-w-0" />)}</div></div>
      <div className="min-h-[420px] animate-pulse rounded-[22px] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 sm:rounded-[26px]" />
    </div>
  );
}
