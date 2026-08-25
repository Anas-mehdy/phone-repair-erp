export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      <div className="space-y-2">
        <div className="h-6 bg-slate-200 rounded-md w-48" />
        <div className="h-3.5 bg-slate-100 rounded-md w-80" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-80 rounded-2xl border border-slate-200/80 bg-white p-6 space-y-4" />
        <div className="h-80 rounded-2xl border border-slate-200/80 bg-white p-6 space-y-4" />
      </div>
      <div className="h-64 rounded-2xl border border-slate-200/80 bg-white p-6" />
    </div>
  );
}
