"use client";

import { useState, useTransition } from "react";
import {
  Search,
  MessageCircle,
  KeyRound,
  LogIn,
  Store,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  X,
  Sparkles,
  Ban,
  RotateCcw,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminResetPasswordAction, adminToggleShopAction, adminImpersonateShopAction } from "./actions";
import { normalizePhoneForWhatsApp } from "@/lib/services/whatsappService";

export interface ShopRowData {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  createdAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
  counts: {
    repairOrders: number;
    customers: number;
    invoices: number;
    suppliers: number;
    inventoryItems: number;
  };
}

export function AdminShopTable({ initialShops }: { initialShops: ShopRowData[] }) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "top">("all");
  
  // Password Reset Modal State
  const [resetModalShop, setResetModalShop] = useState<ShopRowData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetResult, setResetResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [isResetPending, startResetTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Impersonation state
  const [isImpersonating, startImpersonateTransition] = useTransition();

  // Action status toggle state
  const [isTogglePending, startToggleTransition] = useTransition();

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pass = "Shop@";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  }

  function handleOpenReset(shop: ShopRowData) {
    setResetModalShop(shop);
    setNewPassword("12345678");
    setResetResult(null);
    setCopied(false);
  }

  function handleCopyCredentials() {
    if (!resetModalShop || !resetModalShop.owner) return;
    const text = `بيانات الدخول لحساب متجر ${resetModalShop.name}:
📧 البريد: ${resetModalShop.owner.email}
🔑 كلمة المرور: ${newPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetModalShop || !resetModalShop.owner) return;

    const formData = new FormData();
    formData.append("userId", resetModalShop.owner.id);
    formData.append("newPassword", newPassword);

    startResetTransition(async () => {
      const res = await adminResetPasswordAction(formData);
      setResetResult(res);
    });
  }

  function handleToggleShop(shopId: string, suspend: boolean) {
    if (!confirm(suspend ? "هل أنت متأكد من تجميد هذا المتجر؟" : "هل أنت متأكد من تنشيط هذا المتجر؟")) {
      return;
    }
    const formData = new FormData();
    formData.append("shopId", shopId);
    formData.append("suspend", String(suspend));
    startToggleTransition(async () => {
      await adminToggleShopAction(formData);
    });
  }

  function handleImpersonate(shopId: string) {
    if (!confirm("سيتم نقلك لتصفح النظام كصاحب هذا المتجر. متابعة؟")) {
      return;
    }
    const formData = new FormData();
    formData.append("shopId", shopId);
    startImpersonateTransition(async () => {
      await adminImpersonateShopAction(formData);
    });
  }

  // Filtered Shops
  const filtered = initialShops.filter((shop) => {
    if (activeTab === "active" && !shop.isActive) return false;
    if (activeTab === "top" && shop.counts.repairOrders === 0) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      shop.name.toLowerCase().includes(q) ||
      (shop.phone && shop.phone.includes(q)) ||
      (shop.currency && shop.currency.toLowerCase().includes(q)) ||
      (shop.owner && shop.owner.name.toLowerCase().includes(q)) ||
      (shop.owner && shop.owner.email.toLowerCase().includes(q))
    );
  });

  const sortedShops = activeTab === "top"
    ? [...filtered].sort((a, b) => b.counts.repairOrders - a.counts.repairOrders)
    : filtered;

  return (
    <div className="space-y-4">
      {/* Search and Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الإيميل، الهاتف، العملة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2 pr-9 pl-3 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "all"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            جميع المتاجر ({initialShops.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "active"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            المتاجر النشطة ({initialShops.filter((s) => s.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("top")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "top"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            الأعلى نشاطاً 🔥
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table className="w-full text-right text-xs text-slate-300">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">المتجر / المالك</th>
              <th className="py-3.5 px-4">الواتساب والاتصال</th>
              <th className="py-3.5 px-4 text-center">البلد والعملة</th>
              <th className="py-3.5 px-4 text-center">تذاكر الصيانة</th>
              <th className="py-3.5 px-4 text-center">العملاء</th>
              <th className="py-3.5 px-4 text-center">الموردون</th>
              <th className="py-3.5 px-4">تاريخ التسجيل</th>
              <th className="py-3.5 px-4 text-left">إجراءات الأدمن</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {sortedShops.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-bold">
                  لا توجد متاجر مطابقة لبحثك
                </td>
              </tr>
            ) : (
              sortedShops.map((shop) => {
                const normalizedWa = shop.phone
                  ? normalizePhoneForWhatsApp(shop.phone, shop.currency)
                  : null;
                const waUrl = normalizedWa
                  ? `https://wa.me/${normalizedWa}?text=${encodeURIComponent(
                      `مرحباً ${shop.owner?.name || shop.name}، معك إدارة منصة مصلح لإدارة مراكز الصيانة.`
                    )}`
                  : null;

                return (
                  <tr key={shop.id} className="hover:bg-slate-800/40 transition">
                    {/* Shop and Owner */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-white text-xs">{shop.name}</span>
                            {!shop.isActive && (
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                                مجمد
                              </span>
                            )}
                          </div>
                          {shop.owner ? (
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {shop.owner.name} • <span className="text-slate-500 font-mono text-[10px]">{shop.owner.email}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">لا يوجد مالك</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone & WhatsApp */}
                    <td className="py-3.5 px-4">
                      {shop.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="font-numeric font-bold text-slate-300" dir="ltr">
                            {shop.phone}
                          </span>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="فتح محادثة واتساب"
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">غير محدد</span>
                      )}
                    </td>

                    {/* Currency */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 font-bold font-numeric text-[11px] border border-slate-700">
                        <Tag className="h-3 w-3 text-violet-400" />
                        {shop.currency}
                      </span>
                    </td>

                    {/* Repair Orders */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-lg font-black font-numeric text-xs ${
                          shop.counts.repairOrders > 0
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                            : "bg-slate-800/60 text-slate-500"
                        }`}
                      >
                        {shop.counts.repairOrders}
                      </span>
                    </td>

                    {/* Customers */}
                    <td className="py-3.5 px-4 text-center font-numeric font-bold text-slate-300">
                      {shop.counts.customers}
                    </td>

                    {/* Suppliers */}
                    <td className="py-3.5 px-4 text-center font-numeric font-bold text-slate-400">
                      {shop.counts.suppliers}
                    </td>

                    {/* Registered Date */}
                    <td className="py-3.5 px-4 font-numeric text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(shop.createdAt).toLocaleDateString("ar-EG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Admin Actions */}
                    <td className="py-3.5 px-4 text-left whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {shop.owner && (
                          <button
                            type="button"
                            onClick={() => handleOpenReset(shop)}
                            title="إعادة تعيين كلمة المرور"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-violet-600 hover:text-white border border-slate-700 text-[11px] font-bold transition"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span>كلمة السر</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isImpersonating}
                          onClick={() => handleImpersonate(shop.id)}
                          title="الدخول كمتجر"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/20 text-[11px] font-bold transition"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          <span>دخول</span>
                        </button>

                        <button
                          type="button"
                          disabled={isTogglePending}
                          onClick={() => handleToggleShop(shop.id, shop.isActive)}
                          title={shop.isActive ? "تجميد المتجر" : "تنشيط المتجر"}
                          className={`p-1 rounded-lg border transition ${
                            shop.isActive
                              ? "bg-slate-800/80 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 border-slate-700"
                              : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border-emerald-500/30"
                          }`}
                        >
                          {shop.isActive ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      {resetModalShop && resetModalShop.owner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">إعادة تعيين كلمة المرور</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{resetModalShop.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalShop(null)}
                className="rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {resetResult && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  resetResult.success
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                }`}
              >
                {resetResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{resetResult.message || resetResult.error}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400">
                  صاحب المتجر: <span className="font-bold text-white">{resetModalShop.owner.name}</span>
                </div>
                <div className="text-slate-400">
                  البريد الإلكتروني: <span className="font-mono text-violet-300">{resetModalShop.owner.email}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-300">
                    كلمة المرور الجديدة:
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300"
                  >
                    <Sparkles className="h-3 w-3" />
                    توليد كلمة عشوائية
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3 text-sm font-mono text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={isResetPending}
                  className="flex-1 h-11 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl"
                >
                  {isResetPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ كلمة المرور الجديدة"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCredentials}
                  className="h-11 px-3 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
