import Link from "next/link";
import { ShieldAlert, ArrowRight, LayoutDashboard, Handshake } from "lucide-react";
import { requireSuperAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-500 selection:text-white" dir="rtl">
      {/* Super Admin Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-3 py-2">
            {/* Logo and Badge */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-sm">لوحة الإدارة الخارقة</span>
                  <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-[10px] font-black text-violet-300 border border-violet-500/30">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {session.email}
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <LayoutDashboard className="h-4 w-4 text-violet-400" />
                <span>إحصائيات المنصة</span>
              </Link>
              <Link
                href="/admin/partners"
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Handshake className="h-4 w-4 text-teal-400" />
                <span>الوكلاء</span>
              </Link>
              <Link
                href="/admin/compatibility"
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <ShieldAlert className="h-4 w-4 text-emerald-400" />
                <span>حوكمة التوافقات</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <LayoutDashboard className="h-4 w-4 text-teal-400" />
                <span>العودة لمتجري</span>
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
