"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Lock,
  Mail,
  User,
  Store,
  Phone,
  Coins,
  MapPin,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { registerAction } from "@/app/actions/authActions";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);

    if (result && !result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  const currencies = [
    { code: "SAR", name: "ريال سعودي (SAR)" },
    { code: "AED", name: "درهم إماراتي (AED)" },
    { code: "KWD", name: "دينار كويتي (KWD)" },
    { code: "BHD", name: "دينار بحريني (BHD)" },
    { code: "OMR", name: "ريال عماني (OMR)" },
    { code: "QAR", name: "ريال قطري (QAR)" },
    { code: "EGP", name: "جنيه مصري (EGP)" },
    { code: "JOD", name: "دينار أردني (JOD)" },
    { code: "USD", name: "دولار أمريكي (USD)" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-teal-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute top-10 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-primary text-slate-950 shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="text-right">
              <span className="text-xl font-black tracking-tight text-white block">مصلح OS</span>
              <span className="text-[10px] font-bold text-teal-400 tracking-wider">منظومة إدارة مراكز الصيانة</span>
            </div>
          </Link>

          <h2 className="mt-6 text-2xl sm:text-3xl font-black tracking-tight text-white">
            ابدأ إدارة مركز الصيانة الخاص بك الآن
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            سجّل بياناتك وبيانات متجرك وابدأ في استقبال الأجهزة وإصدار الفواتير فوراً
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-10 shadow-2xl rounded-3xl">
          {error && (
            <div className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Owner Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <User className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">بيانات الحساب الشخصي (المالك)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="مثال: أحمد محمد"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pr-9 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="name@example.com"
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pr-9 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="لا تقل عن 6 خانات"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pr-9 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Shop Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Store className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">بيانات متجر / مركز الصيانة</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    اسم المحل أو الورشة
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                      <Store className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      name="shopName"
                      required
                      placeholder="مثال: مركز النخبة لصيانة الهواتف"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pr-9 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    العملة الرسمية للنظام
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                      <Coins className="h-4 w-4" />
                    </div>
                    <select
                      name="currency"
                      defaultValue="SAR"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pr-9 pl-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                    >
                      {currencies.map((curr) => (
                        <option key={curr.code} value={curr.code} className="bg-slate-900 text-white">
                          {curr.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    رقم هاتف المتجر / الواتساب
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="مثال: 966500000000"
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pr-9 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    المدينة / العنوان
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      name="address"
                      placeholder="مثال: الرياض - شارع التحلية"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pr-9 pl-3 text-sm text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Features highlights */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
                <span>عزل كامل لبيانات متجرك وسجلات عملائك وحساباتك</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
                <span>تفعيل فوري لجميع أدوات الصيانة، الـ POS، ومزامنة الواتساب</span>
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
                    إنشاء الحساب وبدء العمل
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-800/80 pt-6 text-center">
            <p className="text-xs text-slate-400">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="font-bold text-teal-400 hover:text-teal-300 transition">
                تسجيل الدخول هنا
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
