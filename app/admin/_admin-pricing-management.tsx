"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Edit2, Globe2, Loader2, Search, X } from "lucide-react";
import { SubscriptionPlan, SubscriptionBillingInterval } from "@prisma/client";
import { COUNTRY_DIAL_CODES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { adminUpdateSubscriptionPriceAction } from "./actions";
import {
  adminUpsertLifetimeMaintenancePriceAction,
  adminUpsertLifetimePriceAction,
} from "./lifetime-actions";

export interface SubscriptionPriceRecord {
  id: string;
  countryCode: string;
  plan: SubscriptionPlan;
  billingInterval: SubscriptionBillingInterval | "LIFETIME" | "LIFETIME_MAINTENANCE";
  currencyCode: string;
  amount: number;
}

type EditablePrice = SubscriptionPriceRecord & { isNewLifetime?: boolean };

type PriceGroup = {
  code: string;
  name: string;
  flag: string;
  currency: string;
  six?: SubscriptionPriceRecord;
  annual?: SubscriptionPriceRecord;
  lifetime?: SubscriptionPriceRecord;
  lifetimeMaintenance?: SubscriptionPriceRecord;
};

export function AdminPricingManagement({ initialPrices }: { initialPrices: SubscriptionPriceRecord[] }) {
  const [prices, setPrices] = useState(initialPrices);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditablePrice | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const meta = new Map(COUNTRY_DIAL_CODES.map((c) => [c.code, c]));
    const map = new Map<string, PriceGroup>();

    for (const p of prices) {
      const m = meta.get(p.countryCode);
      if (!map.has(p.countryCode)) {
        map.set(p.countryCode, {
          code: p.countryCode,
          name: m?.name ?? p.countryCode,
          flag: m?.flag ?? "🌐",
          currency: p.currencyCode,
        });
      }

      const g = map.get(p.countryCode)!;
      if (p.billingInterval === "SIX_MONTHS") g.six = p;
      else if (p.billingInterval === "ANNUAL") g.annual = p;
      else if (p.billingInterval === "LIFETIME") {
        g.lifetime = p;
        g.currency = p.currencyCode;
      } else if (p.billingInterval === "LIFETIME_MAINTENANCE") {
        g.lifetimeMaintenance = p;
      }
    }

    return Array.from(map.values())
      .filter((g) => !search.trim() || `${g.name} ${g.code} ${g.currency}`.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [prices, search]);

  function open(price: EditablePrice) {
    setEditing(price);
    setAmount(price.amount > 0 ? String(price.amount) : "");
    setCurrency(price.currencyCode);
    setFeedback(null);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return setFeedback("أدخل مبلغاً صحيحاً أكبر من صفر.");
    }

    const formData = new FormData();
    formData.set("countryCode", editing.countryCode);
    formData.set("amount", String(value));

    if (editing.billingInterval !== "LIFETIME_MAINTENANCE") {
      formData.set("currencyCode", currency.toUpperCase());
    }
    if (editing.billingInterval !== "LIFETIME" && editing.billingInterval !== "LIFETIME_MAINTENANCE") {
      formData.set("billingInterval", editing.billingInterval);
    }

    startTransition(async () => {
      const res = editing.billingInterval === "LIFETIME"
        ? await adminUpsertLifetimePriceAction(formData)
        : editing.billingInterval === "LIFETIME_MAINTENANCE"
          ? await adminUpsertLifetimeMaintenancePriceAction(formData)
          : await adminUpdateSubscriptionPriceAction(formData);

      if (!res.success || !res.price) {
        const error = "error" in res ? res.error : null;
        return setFeedback(error || "تعذر حفظ السعر.");
      }

      const saved: SubscriptionPriceRecord = {
        ...(res.price as Omit<SubscriptionPriceRecord, "plan" | "billingInterval">),
        plan: SubscriptionPlan.PROFESSIONAL,
        billingInterval: editing.billingInterval,
      };

      setPrices((prev) => {
        const exists = prev.some((p) => p.countryCode === saved.countryCode && p.billingInterval === saved.billingInterval);
        let next = exists
          ? prev.map((p) => p.countryCode === saved.countryCode && p.billingInterval === saved.billingInterval ? saved : p)
          : [...prev, saved];

        if (saved.billingInterval === "LIFETIME") {
          next = next.map((p) =>
            p.countryCode === saved.countryCode && p.billingInterval === "LIFETIME_MAINTENANCE"
              ? { ...p, currencyCode: saved.currencyCode }
              : p,
          );
        }
        return next;
      });

      setFeedback("تم حفظ السعر بنجاح.");
      setTimeout(() => setEditing(null), 700);
    });
  }

  const intervalLabel = (interval: SubscriptionPriceRecord["billingInterval"]) => {
    if (interval === "ANNUAL") return "سنة واحدة";
    if (interval === "SIX_MONTHS") return "6 أشهر";
    if (interval === "LIFETIME_MAINTENANCE") return "الصيانة والتحديث السنوي بعد خطة مدى الحياة";
    return "مدى الحياة";
  };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-violet-400" /><h3 className="text-lg font-black text-white">أسعار الاشتراك حسب الدولة</h3></div>
        <p className="mt-1 text-xs text-slate-400">إدارة 6 أشهر والسنة ومدى الحياة، مع رسم صيانة وتحديث سنوي مستقل يبدأ من السنة الثانية. عملته مرتبطة تلقائياً بعملة خطة مدى الحياة.</p>
      </div>
      <div className="relative w-full sm:w-72"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="بحث بالدولة..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pr-9 pl-3 text-xs text-white" /></div>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => {
        const lifetimePlaceholder: EditablePrice = g.lifetime ?? {
          id: `new-${g.code}`,
          countryCode: g.code,
          plan: SubscriptionPlan.PROFESSIONAL,
          billingInterval: "LIFETIME",
          currencyCode: g.currency,
          amount: 0,
          isNewLifetime: true,
        };
        const maintenancePlaceholder: EditablePrice = g.lifetimeMaintenance ?? {
          id: `maintenance-new-${g.code}`,
          countryCode: g.code,
          plan: SubscriptionPlan.PROFESSIONAL,
          billingInterval: "LIFETIME_MAINTENANCE",
          currencyCode: g.lifetime?.currencyCode ?? g.currency,
          amount: 0,
        };

        return <div key={g.code} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3"><div className="flex items-center gap-2"><span className="text-2xl">{g.flag}</span><div><div className="text-sm font-black text-white">{g.name}</div><div className="text-[10px] font-bold text-slate-500">{g.code}</div></div></div><span className="rounded-lg bg-violet-500/10 px-2 py-1 text-xs font-black text-violet-300">{g.currency}</span></div>
          <div className="grid gap-2">
            {[g.six, g.annual].map((p, idx) => p ? <PriceRow key={p.id} label={idx === 0 ? "6 أشهر" : "سنة واحدة"} price={p} onEdit={() => open(p)} /> : null)}
            <PriceRow label="مدى الحياة" highlight price={lifetimePlaceholder} onEdit={() => open(lifetimePlaceholder)} />
            <PriceRow
              label="صيانة وتحديث سنوي — يبدأ من السنة الثانية"
              price={maintenancePlaceholder}
              accent="teal"
              disabled={!g.lifetime}
              helper={!g.lifetime ? "حدد سعر مدى الحياة أولاً" : "السنة الأولى مجانية"}
              onEdit={() => open(maintenancePlaceholder)}
            />
          </div>
        </div>;
      })}
    </div>

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between"><div><h3 className="font-black text-white">تعديل سعر {intervalLabel(editing.billingInterval)}</h3><p className="mt-1 text-xs font-bold text-slate-400">الدولة: {editing.countryCode}</p></div><button onClick={()=>setEditing(null)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button></div>
      {feedback && <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-bold text-slate-300"><CheckCircle2 className="ml-1 inline h-4 w-4" />{feedback}</div>}
      <form onSubmit={save} className="mt-5 space-y-4">
        <div><label className="mb-1 block text-xs font-bold text-slate-300">المبلغ</label><input type="number" min="0.01" step="0.01" required value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white" /></div>
        {editing.billingInterval === "LIFETIME_MAINTENANCE" ? (
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
            <div className="text-[10px] font-black text-teal-300">العملة مرتبطة بخطة مدى الحياة</div>
            <div className="mt-1 font-numeric text-sm font-black text-white">{editing.currencyCode}</div>
            <div className="mt-1 text-[10px] font-semibold text-slate-400">تتغير تلقائياً إذا غيّرت عملة سعر مدى الحياة لهذه الدولة.</div>
          </div>
        ) : (
          <div><label className="mb-1 block text-xs font-bold text-slate-300">العملة</label><input maxLength={3} required value={currency} onChange={(e)=>setCurrency(e.target.value.toUpperCase())} className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white" /></div>
        )}
        {editing.billingInterval === "LIFETIME_MAINTENANCE" ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] font-bold leading-5 text-amber-200">السنة الأولى بعد شراء خطة مدى الحياة مجانية. يبدأ هذا الرسم من السنة الثانية ويخص الصيانة والتحديثات السنوية.</div> : null}
        <Button type="submit" disabled={pending} className="w-full rounded-xl bg-teal-600 font-black">{pending?<Loader2 className="h-4 w-4 animate-spin" />:"حفظ السعر"}</Button>
      </form>
    </div></div>}
  </div>;
}

function PriceRow({
  label,
  price,
  onEdit,
  highlight = false,
  accent = "default",
  disabled = false,
  helper,
}: {
  label: string;
  price: SubscriptionPriceRecord;
  onEdit: () => void;
  highlight?: boolean;
  accent?: "default" | "teal";
  disabled?: boolean;
  helper?: string;
}) {
  const tone = highlight
    ? "border-amber-500/30 bg-amber-500/5"
    : accent === "teal"
      ? "border-teal-500/25 bg-teal-500/5"
      : "border-slate-800 bg-slate-950/60";
  const labelTone = highlight ? "text-amber-300" : accent === "teal" ? "text-teal-300" : "text-slate-400";

  return <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${tone} ${disabled ? "opacity-60" : ""}`}>
    <div>
      <div className={`text-[10px] font-black ${labelTone}`}>{label}</div>
      <div className="mt-0.5 font-numeric text-sm font-black text-white">{price.amount > 0 ? `${price.amount.toLocaleString()} ${price.currencyCode}` : "غير محدد"}</div>
      {helper ? <div className="mt-1 text-[9px] font-bold text-slate-500">{helper}</div> : null}
    </div>
    <Button size="sm" variant="ghost" onClick={onEdit} disabled={disabled} className="h-8 w-8 p-0 text-slate-400"><Edit2 className="h-3.5 w-3.5" /></Button>
  </div>;
}
