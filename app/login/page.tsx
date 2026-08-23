"use client";

import { useState } from "react";
import Link from "next/link";
import { Smartphone, Lock, Mail, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { loginAction } from "@/app/actions/authActions";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result && !result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full max-w-full bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden selection:bg-teal-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-primary text-slate-950 shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="text-right">
              <span className="text-xl font-black tracking-tight text-white block">مصلح OS</span>
              <span className="text-[10px] font-bold text-teal-400 tracking-wider">منظومة إدارة مراكز الصيانة</span>
            </div>
          </Link>
        </div>

        <h2 className="mt-8 text-center text-2xl font-black tracking-tight text-white">
          تسجيل الدخول إلى حسابك
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          أو{" "}
          <Link href="/register" className="font-bold text-teal-400 hover:text-teal-300 transition">
            أنشئ حساباً جديداً لمتجرك مجاناً
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          {error && (
            <div className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pr-10 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  كلمة المرور
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pr-10 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-500 to-primary text-slate-950 font-black text-sm shadow-lg shadow-teal-500/20 hover:from-teal-400 hover:to-teal-600 transition duration-200 border-0"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    تسجيل الدخول
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-800/80 pt-6 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              نظام سحابي آمن ومعزول لكل متجر
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
