import { Smartphone, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TrackSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const query = await searchParams;

  if (query.ticket) {
    redirect(`/track/${encodeURIComponent(query.ticket.trim())}`);
  }

  async function handleSearch(formData: FormData) {
    "use server";
    const ticket = (formData.get("ticket") as string) || "";
    if (ticket.trim()) {
      redirect(`/track/${encodeURIComponent(ticket.trim())}`);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 selection:bg-teal-500 selection:text-white overflow-x-hidden">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-1">
            <Smartphone className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-white">تتبع حالة جهاز الصيانة</h1>
          <p className="text-xs text-slate-400 font-medium">
            أدخل رقم التذكرة المطبوع على إيصال الاستلام
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-2xl">
          <form action={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
                رقم التذكرة (Ticket Number)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="ticket"
                  required
                  placeholder="مثال: RO-202608-0002"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-3 pr-10 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition font-numeric uppercase"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-500 to-primary text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 hover:from-teal-400 hover:to-teal-600 transition border-0 flex items-center justify-center gap-2"
            >
              بحث وتتبع الآن
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
            <Link href="/" className="text-[11px] text-slate-400 hover:text-teal-400 transition font-medium">
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
