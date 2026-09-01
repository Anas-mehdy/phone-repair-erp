import { Plus, Search, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { financialTransferService, type FinancialTransferType } from "@/lib/services/financialTransferService";
import { getTransferDailyData } from "@/lib/services/transferDailyStatsService";
import { createWalletAction, updateWalletAction, voidTransferAction } from "./actions";
import { TransferStatsCards } from "./_transfer-stats-cards";
import { TransferForm } from "./_transfer-form";

export const dynamic = "force-dynamic";

type SearchParams = { saved?: string; walletSaved?: string; walletUpdated?: string; voided?: string; error?: string; wallet?: string; type?: string; q?: string; from?: string; to?: string };
const transferLabels: Record<FinancialTransferType, string> = { CUSTOMER_DEPOSIT: "إيداع للعميل", CUSTOMER_WITHDRAWAL: "سحب للعميل", WALLET_TOPUP: "شحن المحفظة", WALLET_WITHDRAWAL: "سحب من المحفظة" };
const commissionLabels = { ADDED: "مضافة", DEDUCTED: "مخصومة", NONE: "بدون عمولة" } as const;
function parseStartDate(value?: string) { if (!value) return undefined; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? undefined : date; }
function parseEndDate(value?: string) { if (!value) return undefined; const date = new Date(`${value}T00:00:00`); if (Number.isNaN(date.getTime())) return undefined; date.setDate(date.getDate() + 1); return date; }

export default async function TransfersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const context = await getCurrentShopContext();
  const type = Object.prototype.hasOwnProperty.call(transferLabels, query.type ?? "") ? (query.type as FinancialTransferType) : undefined;
  const [wallets, dailyData, transfers, customers] = await Promise.all([
    financialTransferService.listWallets(context.shopId),
    getTransferDailyData(context.shopId),
    financialTransferService.listTransfers(context.shopId, { walletId: query.wallet || undefined, operationType: type, q: query.q, from: parseStartDate(query.from), to: parseEndDate(query.to) }),
    prisma.customer.findMany({ where: { shopId: context.shopId, deletedAt: null }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);

  const currency = context.currency || "SAR";
  const statsWallets = wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, balance: Number(wallet.currentBalance), monthlyLimit: wallet.monthlyLimit == null ? null : Number(wallet.monthlyLimit), monthlyUsed: Number(wallet.monthlyUsed) }));
  const statsOperations = dailyData.operations.map((row) => ({ id: row.id, walletName: row.walletName, userName: row.userName, customerName: row.customerName, operationType: row.operationType, amount: row.amount, commission: row.commission, createdAt: row.createdAt.toISOString() }));
  const formWallets = wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, balance: Number(wallet.currentBalance), depositCommission: Number(wallet.defaultDepositCommission), withdrawalCommission: Number(wallet.defaultWithdrawalCommission) }));

  return <div className="space-y-7">
    <PageHeader eyebrow="المحافظ والأرصدة" title="التحويلات المالية" description="إدارة محافظ التحويل، إيداعات وسحوبات العملاء، العمولات وحركة الرصيد من مكان واحد." />
    {query.saved ? <Notice text="تم تسجيل العملية وتحديث رصيد المحفظة." /> : null}
    {query.walletSaved ? <Notice text="تمت إضافة المحفظة بنجاح." /> : null}
    {query.walletUpdated ? <Notice text="تم تعديل بيانات المحفظة بنجاح." /> : null}
    {query.voided ? <Notice text="تم إلغاء العملية وعكس أثرها على رصيد المحفظة والدين المرتبط إن وجد." /> : null}
    {query.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{query.error}</div> : null}

    <TransferStatsCards stats={dailyData.stats} wallets={statsWallets} operations={statsOperations} currency={currency} />

    <section className="erp-section">
      <div className="mb-5 border-b border-slate-100 pb-4"><h2 className="text-sm font-black text-slate-900">المحافظ والأرصدة</h2><p className="mt-1 text-[11px] font-medium text-slate-500">أضف Vodafone Cash أو InstaPay أو أي محفظة تستخدمها، وحدد رصيدها وحدها الشهري وعمولاتها الافتراضية.</p></div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {wallets.map((wallet) => { const balance = Number(wallet.currentBalance); const used = Number(wallet.monthlyUsed); const limit = wallet.monthlyLimit == null ? null : Number(wallet.monthlyLimit); const percent = limit && limit > 0 ? Math.min(100, Math.max(0, used / limit * 100)) : 0; return <div key={wallet.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-slate-800">{wallet.name}</p><p className="mt-3 font-numeric text-2xl font-black text-slate-950">{formatCurrency(balance, currency)}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><WalletCards className="h-5 w-5" /></div></div>
          {limit ? <div className="mt-4"><div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500"><span>استخدام الشهر</span><span>{formatCurrency(used, currency)} / {formatCurrency(limit, currency)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${percent}%` }} /></div><p className="mt-1 text-[10px] font-bold text-slate-400">المتبقي {formatCurrency(Math.max(0, limit - used), currency)}</p></div> : <p className="mt-4 text-[10px] font-bold text-slate-400">لا يوجد حد شهري محدد.</p>}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-[10px] font-bold text-slate-600"><span>عمولة الإيداع: {Number(wallet.defaultDepositCommission)}%</span><span>عمولة السحب: {Number(wallet.defaultWithdrawalCommission)}%</span></div>
          <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <summary className="cursor-pointer text-[10px] font-black text-slate-600">تعديل المحفظة</summary>
            <form action={updateWalletAction} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="walletId" value={wallet.id} />
              <div className="sm:col-span-2"><Label>اسم المحفظة</Label><input name="name" required defaultValue={wallet.name} className={inputClass} /></div>
              <div><Label>الرصيد الحالي</Label><input name="balance" type="number" min="0" step="0.01" required defaultValue={balance.toFixed(2)} className={`${inputClass} font-numeric`} /></div>
              <div><Label>الحد الشهري</Label><input name="monthlyLimit" type="number" min="0" step="0.01" defaultValue={limit == null ? "" : limit} className={`${inputClass} font-numeric`} placeholder="بدون حد" /></div>
              <div><Label>عمولة الإيداع %</Label><input name="defaultDepositCommission" type="number" min="0" step="0.01" defaultValue={Number(wallet.defaultDepositCommission)} className={`${inputClass} font-numeric`} /></div>
              <div><Label>عمولة السحب %</Label><input name="defaultWithdrawalCommission" type="number" min="0" step="0.01" defaultValue={Number(wallet.defaultWithdrawalCommission)} className={`${inputClass} font-numeric`} /></div>
              <p className="sm:col-span-2 text-[9px] font-bold leading-4 text-amber-600">تعديل الرصيد هنا يغيّره مباشرة دون إنشاء حركة سحب أو إيداع في سجل التحويلات.</p>
              <div className="sm:col-span-2"><ConfirmSubmitButton message="حفظ جميع تعديلات المحفظة؟" size="sm" className="w-full rounded-lg text-[10px] font-black">حفظ التعديلات</ConfirmSubmitButton></div>
            </form>
          </details>
        </div>; })}
        {wallets.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs font-bold text-slate-400">ابدأ بإضافة أول محفظة.</div> : null}
      </div>
      <form action={createWalletAction} className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2"><Label>اسم المحفظة *</Label><input name="name" required className={inputClass} placeholder="مثال: Vodafone Cash" /></div><div><Label>الرصيد الافتتاحي</Label><input name="openingBalance" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" /></div><div><Label>الحد الشهري</Label><input name="monthlyLimit" type="number" min="0" step="0.01" className={inputClass} placeholder="اختياري" /></div><div><Label>عمولة الإيداع %</Label><input name="defaultDepositCommission" type="number" min="0" step="0.01" className={inputClass} placeholder="0" /></div><div><Label>عمولة السحب %</Label><input name="defaultWithdrawalCommission" type="number" min="0" step="0.01" className={inputClass} placeholder="0" /></div><div className="sm:col-span-2 xl:col-span-6 flex justify-end"><Button type="submit" className="rounded-xl font-black"><Plus className="ml-1.5 h-4 w-4" />إضافة محفظة</Button></div>
      </form>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1fr_410px]">
      <div className="erp-section min-w-0">
        <div className="mb-4 border-b border-slate-100 pb-3"><h2 className="text-sm font-black text-slate-900">سجل التحويلات</h2><p className="mt-1 text-[11px] font-medium text-slate-500">كل تعديل على الرصيد محفوظ هنا ويمكن تتبعه أو إلغاؤه بعكس الحركة.</p></div>
        <form method="get" className="mb-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5"><div className="relative xl:col-span-2"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input name="q" defaultValue={query.q} className={`${inputClass} pr-9`} placeholder="بحث بالعميل أو الرقم أو المحفظة" /></div><select name="wallet" defaultValue={query.wallet ?? ""} className={inputClass}><option value="">كل المحافظ</option>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select><select name="type" defaultValue={query.type ?? ""} className={inputClass}><option value="">كل العمليات</option>{Object.entries(transferLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Button type="submit" variant="outline" className="rounded-xl font-black">تطبيق الفلاتر</Button><input type="date" name="from" defaultValue={query.from} className={inputClass} /><input type="date" name="to" defaultValue={query.to} className={inputClass} /></form>
        {transfers.length === 0 ? <div className="py-14 text-center text-xs font-bold text-slate-400">لا توجد عمليات ضمن النطاق الحالي.</div> : <div className="overflow-x-auto rounded-xl border border-slate-200/70"><table className="erp-table min-w-[980px]"><thead><tr><th>العملية</th><th>المحفظة</th><th>العميل</th><th>المبلغ</th><th>العمولة</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead><tbody>{transfers.map((transfer) => <tr key={transfer.id} className={transfer.status === "VOID" ? "opacity-50" : undefined}>
          <td className="font-black text-slate-800">{transferLabels[transfer.operationType]}</td><td className="font-bold text-slate-700">{transfer.walletName}</td><td><div className="font-bold text-slate-700">{transfer.customerName || "-"}</div><div className="font-numeric text-[10px] text-slate-400">{transfer.customerPhone || ""}</div></td><td className="font-numeric font-black">{formatCurrency(transfer.amount, currency)}</td><td><div className="font-numeric font-bold text-teal-700">{formatCurrency(transfer.commission, currency)}</div><div className="text-[9px] font-bold text-slate-400">{commissionLabels[transfer.commissionMode]}</div></td><td>{transfer.isDeferred ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-700">آجل — دفتر الديون</span> : <span className="text-[10px] font-bold text-slate-400">فوري</span>}</td><td className="text-xs font-black">{transfer.status === "ACTIVE" ? <span className="text-emerald-700">فعالة</span> : <span className="text-rose-600">ملغاة</span>}</td><td className="font-numeric text-xs text-slate-500">{formatDate(transfer.createdAt)}</td><td>{transfer.status === "ACTIVE" ? <form action={voidTransferAction}><input type="hidden" name="id" value={transfer.id} /><ConfirmSubmitButton message="إلغاء العملية وعكس أثرها على الرصيد والدين المرتبط إن وجد؟" variant="ghost" size="sm" className="text-xs font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700">إلغاء</ConfirmSubmitButton></form> : null}</td>
        </tr>)}</tbody></table></div>}
      </div>
      <aside className="erp-section h-fit xl:sticky xl:top-24"><div className="mb-4 border-b border-slate-100 pb-3"><h2 className="text-sm font-black text-slate-900">عملية جديدة</h2><p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">حدد طريقة العمولة، ويمكن تسجيل الإيداع كدين على عميل مسجل عند عدم التحصيل الفوري.</p></div>{wallets.length === 0 ? <div className="rounded-xl bg-amber-50 p-4 text-xs font-bold text-amber-800">أضف محفظة أولاً قبل تسجيل العمليات.</div> : <TransferForm wallets={formWallets} customers={customers} currency={currency} />}</aside>
    </section>
  </div>;
}

const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1.5 block text-[11px] font-black text-slate-600">{children}</label>; }
function Notice({ text }: { text: string }) { return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{text}</div>; }
