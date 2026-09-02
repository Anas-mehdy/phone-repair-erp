import {
  ArrowRight,
  Banknote,
  CalendarClock,
  ExternalLink,
  FileText,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency } from "@/lib/format";
import { cashDrawerMovementLabel, cashDrawerSourceHref, cashDrawerSourceLabel, cashDrawerSourceLinkLabel } from "@/lib/cash-drawer-presentation";
import { cashDrawerService } from "@/lib/services/cashDrawerService";
import { financialTransferService } from "@/lib/services/financialTransferService";
import { getShopTimeZone } from "@/lib/shop-timezone";

export const dynamic = "force-dynamic";
type MovementDetailsPageProps = { params: Promise<{ id: string }> };
function exactDateTime(date: Date, timeZone: string) { return new Intl.DateTimeFormat("ar", { dateStyle: "full", timeStyle: "short", timeZone }).format(date); }

export default async function CashDrawerMovementDetailsPage({ params }: MovementDetailsPageProps) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const auth = await requirePermission("sales:create");
  await financialTransferService.listWallets(auth.shop.id);
  const movement = await cashDrawerService.getMovementById(auth.shop.id, id);
  if (!movement) notFound();
  const currency = auth.shop.currency || "SAR";
  const timeZone = await getShopTimeZone(auth.shop.id);
  const sourceHref = cashDrawerSourceHref(movement);
  const positive = movement.direction === "IN";

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="outline" className="rounded-xl"><Link href="/cash-drawer"><ArrowRight className="ml-1.5 h-4 w-4" />العودة إلى الدرج</Link></Button>{sourceHref && <Button asChild className="rounded-xl bg-teal-700 font-black hover:bg-teal-800"><Link href={sourceHref}><ExternalLink className="ml-1.5 h-4 w-4" />{cashDrawerSourceLinkLabel(movement.sourceType)}</Link></Button>}</div>
    <PageHeader eyebrow="الدرج النقدي • تفاصيل الحركة" title={cashDrawerMovementLabel(movement)} description="سجل تدقيق للحركة النقدية ومصدرها والجهة المرتبطة بها ووقت تنفيذها." />

    <section className={`rounded-[24px] border p-6 shadow-sm ${movement.status === "VOID" ? "border-slate-200 bg-slate-50" : positive ? "border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-teal-50" : "border-rose-100 bg-gradient-to-l from-rose-50 via-white to-orange-50"}`}><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-black text-slate-500">قيمة الحركة</p><p className={`mt-2 font-numeric text-3xl font-black ${movement.status === "VOID" ? "text-slate-500 line-through" : positive ? "text-emerald-700" : "text-rose-700"}`}>{positive ? "+" : "-"}{formatCurrency(Number(movement.amount), currency)}</p><p className="mt-2 text-sm font-semibold text-slate-500">{positive ? "مبلغ دخل إلى الدرج" : "مبلغ خرج من الدرج"}</p></div><span className={`rounded-full border px-3 py-1.5 text-sm font-black ${movement.status === "VOID" ? "border-slate-200 bg-white text-slate-500" : "border-emerald-200 bg-white text-emerald-700"}`}>{movement.status === "VOID" ? "حركة ملغاة" : "حركة فعالة"}</span></div></section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DetailCard icon={FileText} label="نوع الحركة" value={cashDrawerMovementLabel(movement)} />
      <DetailCard icon={FileText} label="المصدر" value={cashDrawerSourceLabel(movement.sourceType)} subValue={movement.sourceReference || movement.reference || undefined} />
      <DetailCard icon={CalendarClock} label="وقت التنفيذ" value={exactDateTime(movement.createdAt, timeZone)} subValue={`التوقيت المحلي للمتجر • ${timeZone}`} />
      <DetailCard icon={UserRound} label="العميل" value={movement.customerName || "غير مرتبط بعميل"} subValue={movement.customerPhone || undefined} />
      <DetailCard icon={WalletCards} label="المحفظة المرتبطة" value={movement.walletName || "لا توجد محفظة مرتبطة"} />
      <DetailCard icon={UserRound} label="نفذ بواسطة" value={movement.createdByName || "غير محدد"} />
    </section>

    <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-black text-slate-900">تفاصيل ومرجع العملية</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><DetailRow label="الوصف" value={movement.description || "—"} /><DetailRow label="المرجع" value={movement.sourceReference || movement.reference || "—"} /><DetailRow label="معرّف الحركة" value={movement.id} mono /><DetailRow label="معرّف المصدر" value={movement.sourceId || "—"} mono={Boolean(movement.sourceId)} />{movement.financialTransferId && <DetailRow label="معرّف حركة المحفظة" value={movement.financialTransferId} mono />}{movement.voidedAt && <DetailRow label="وقت الإلغاء" value={exactDateTime(movement.voidedAt, timeZone)} />}</dl></section>

    {sourceHref && <section className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-teal-100 bg-teal-50/70 p-5"><div><h2 className="text-base font-black text-slate-900">هذه الحركة مرتبطة بعملية أصلية</h2><p className="mt-1 text-sm font-semibold text-slate-500">افتح المصدر لمراجعة تفاصيل البيع أو الفاتورة أو القسط أو الدين المرتبط.</p></div><Button asChild className="rounded-xl bg-teal-700 font-black hover:bg-teal-800"><Link href={sourceHref}><ExternalLink className="ml-1.5 h-4 w-4" />{cashDrawerSourceLinkLabel(movement.sourceType)}</Link></Button></section>}
    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm font-semibold leading-7 text-sky-900"><Banknote className="ml-2 inline h-4 w-4" />حركة الدرج توضح مكان وجود المال فقط. مصدر الإيراد أو الدين أو القسط يبقى في العملية الأصلية ولا يتم احتسابه مرة ثانية من سجل الدرج.</div>
  </div>;
}

function DetailCard({ icon: Icon, label, value, subValue }: { icon: LucideIcon; label: string; value: string; subValue?: string }) { return <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-teal-700"><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-1.5 break-words text-sm font-black text-slate-800">{value}</p>{subValue && <p className="mt-1 break-words text-xs font-semibold text-slate-400">{subValue}</p>}</div></div></div>; }
function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="rounded-xl bg-slate-50 p-3.5"><dt className="text-xs font-black text-slate-400">{label}</dt><dd className={`mt-1.5 break-all text-sm font-bold text-slate-700 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>; }