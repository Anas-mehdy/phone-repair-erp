"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Store,
  RefreshCw,
  MessageCircle,
  Clock,
  Shield,
  Wifi,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { normalizePhoneForWhatsApp } from "@/lib/services/whatsappService";

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  shop: {
    id: string;
    name: string;
    currency: string;
  } | null;
  lastActiveAt: string | null;
  secondsAgo: number;
}

interface PresenceData {
  onlineUsers: OnlineUser[];
  onlineUsersCount: number;
  activeShopsCount: number;
  activeShopIds: string[];
  serverTime: string;
}

export function AdminOnlineUsers({
  initialOnlineCount = 0,
  initialActiveShopsCount = 0,
}: {
  initialOnlineCount?: number;
  initialActiveShopsCount?: number;
}) {
  const [data, setData] = useState<PresenceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isOpen, setIsOpen] = useState(false);

  const fetchPresence = useCallback(async (isManual = false) => {
    if (isManual) setIsLoading(true);
    try {
      const res = await fetch("/api/admin/presence", { cache: "no-store" });
      if (res.ok) {
        const json: PresenceData = await res.json();
        setData(json);
        setLastRefreshedAt(new Date());
      }
    } catch {
      // ignore transient fetch errors
    } finally {
      if (isManual) setIsLoading(false);
    }
  }, []);

  // Fetch immediately on mount
  useEffect(() => {
    fetchPresence();
    // Auto-poll every 25 seconds for live real-time feel
    const interval = setInterval(() => {
      fetchPresence();
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchPresence]);

  const onlineCount = data ? data.onlineUsersCount : initialOnlineCount;
  const shopsCount = data ? data.activeShopsCount : initialActiveShopsCount;
  const usersList = data?.onlineUsers || [];

  const formatRelativeTime = (seconds: number) => {
    if (seconds < 60) return "نشط الآن";
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return "منذ دقيقة";
    if (minutes === 2) return "منذ دقيقتين";
    if (minutes <= 10) return `منذ ${minutes} دقائق`;
    return `منذ ${minutes} دقيقة`;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return {
          label: "مالك المتجر",
          className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "ADMIN":
        return {
          label: "مدير فرع",
          className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        };
      case "TECHNICIAN":
        return {
          label: "فني صيانة",
          className: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        };
      default:
        return {
          label: "مستخدم",
          className: "bg-slate-700/50 text-slate-300 border-slate-700",
        };
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-emerald-950/20 p-5 shadow-xl shadow-emerald-950/20 backdrop-blur-xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
            <Wifi className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">المتواجدون الآن في السستم (Live Presence)</h2>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-numeric">
                مباشر
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              رصد حي ولحظي للمستخدمين والمتاجر المتصلة وفاتحة شاشة النظام حالياً
            </p>
          </div>
        </div>

        {/* Action & Stats Quick Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">المتصلون:</span>
              <span className="font-numeric font-black text-emerald-400 text-sm">
                {onlineCount}
              </span>
            </div>
            <span className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">المتاجر:</span>
              <span className="font-numeric font-black text-violet-400 text-sm">
                {shopsCount}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchPresence(true)}
            disabled={isLoading}
            title="تحديث قائمة المتواجدين"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Online Users List or Empty State */}
      <div className="mt-4">
        {usersList.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80">
            <Users className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-bold text-slate-400">
              لا يوجد مستخدمون متصلون في هذه اللحظة
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              يتم رصد وتحديث القائمة تلقائياً بمجرد فتح أي متجر أو فني لشاشة السستم
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {usersList.map((user) => {
              const roleBadge = getRoleBadge(user.role);
              const waNumber = user.phone ? normalizePhoneForWhatsApp(user.phone) : null;

              return (
                <div
                  key={user.id}
                  className="flex flex-col justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/40 transition group relative shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {/* Avatar with Live Indicator */}
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 font-black text-sm border border-slate-700">
                        {user.name ? user.name[0].toUpperCase() : "U"}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950" />
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate max-w-[140px]">
                            {user.name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${roleBadge.className}`}
                          >
                            {roleBadge.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px] mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Action */}
                    {waNumber && (
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        title="محادثة واتساب مباشرة"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-850 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1 text-slate-300 font-bold">
                      <Store className="h-3 w-3 text-violet-400" />
                      <span className="truncate max-w-[130px]">
                        {user.shop ? user.shop.name : "متجر غير محدد"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(user.secondsAgo)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
