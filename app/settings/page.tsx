import { getCurrentShopContext } from "@/lib/current-shop";
import { shopService } from "@/lib/services/shopService";
import { PageHeader } from "@/components/page-header";
import { Store, Percent, Users, Save } from "lucide-react";
import { updateShopSettingsAction } from "@/app/actions/shopActions";
import { Button } from "@/components/ui/button";
import { formatDate, CURRENCY_OPTIONS } from "@/lib/format";
import { COUNTRY_DIAL_CODES, parseStoredPhone } from "@/lib/countries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { shopId } = await getCurrentShopContext();
  const shop = await shopService.getShopById(shopId);

  const currencies = CURRENCY_OPTIONS;
  const phoneParts = parseStoredPhone(shop.phone, shop.currency || "SAR");

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات المتجر والنظام"
        description="تخصيص معلومات المتجر، العملة الرسمية، الضرائب، وشروط الفواتير لفرعك."
      />

      <form action={updateShopSettingsAction} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Shop Profile Section */}
          <section className="erp-card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-primary/10">
                <Store className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">بيانات متجر الصيانة</h3>
                <p className="text-[10px] text-slate-400 font-semibold">المعلومات التي تظهر بإيصالات الاستلام وفواتير العملاء</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
                  اسم المتجر / المركز
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={shop.name}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
                  العملة الرسمية للنظام
                </label>
                <select
                  name="currency"
                  defaultValue={shop.currency || "SAR"}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-600">
                    رقم الهاتف الموحد / الواتساب
                  </label>
                  <span className="text-[10px] text-primary font-bold">
                    (الرقم بدون رمز الدولة)
                  </span>
                </div>
                <div className="flex items-center gap-2" dir="ltr">
                  <div className="relative w-[130px] shrink-0">
                    <select
                      name="dialCode"
                      defaultValue={phoneParts.dialCode}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-bold text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                    >
                      {COUNTRY_DIAL_CODES.map((item) => (
                        <option key={item.code} value={item.dialCode}>
                          {item.flag} {item.dialCode} {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={phoneParts.localPhone}
                      placeholder="501234567"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-numeric"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
                  عنوان الفرع
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={shop.address || ""}
                  placeholder="مثال: الرياض - طريق الملك فهد"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>
            </div>
          </section>

          {/* Tax & Invoice Settings */}
          <section className="erp-card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/5 text-amber-600 ring-1 ring-amber-500/10">
                <Percent className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">الضرائب والشروط والفواتير</h3>
                <p className="text-[10px] text-slate-400 font-semibold">حسابات الضريبة والشروط المطبوعة أسفل الإيصال</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
                  الرقم الضريبي الموحد للمنشأة (VAT Number)
                </label>
                <input
                  type="text"
                  name="taxNumber"
                  defaultValue={shop.taxNumber || ""}
                  placeholder="مثال: 300052345600003"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-numeric"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
                  نسبة الضريبة المضافة (%)
                </label>
                <input
                  type="number"
                  name="taxRate"
                  step="0.01"
                  min="0"
                  defaultValue={Number(shop.taxRate) || 15}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-numeric"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
                  شروط الضمان وسياسة الاستلام (تظهر بالإيصال)
                </label>
                <textarea
                  name="terms"
                  rows={3}
                  defaultValue={shop.terms || "الضمان يشمل القطع المستبدلة فقط لمدة 30 يوماً. المحل غير مسؤول عن الأجهزة المتروكة لأكثر من 60 يوماً."}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Save button banner */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            className="h-11 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-xs shadow-md shadow-primary/20"
          >
            <Save className="h-4 w-4 ml-1.5" />
            حفظ التغييرات
          </Button>
        </div>
      </form>

      {/* Users / Team Members in this shop */}
      <section className="erp-card p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/5 text-blue-600 ring-1 ring-blue-500/10">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">مستخدمو المتجر المسجلون</h3>
            <p className="text-[10px] text-slate-400 font-semibold">حسابات الفنيين والمديرين المرتبطين بهذا الفرع</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-extrabold">
                <th className="pb-3 pr-2">الاسم</th>
                <th className="pb-3">البريد الإلكتروني</th>
                <th className="pb-3">الدور / الصلاحية</th>
                <th className="pb-3">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shop.users.map((user) => (
                <tr key={user.id} className="text-slate-800">
                  <td className="py-3.5 pr-2 font-bold flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                      {user.name.charAt(0)}
                    </span>
                    {user.name}
                  </td>
                  <td className="py-3.5 font-medium text-slate-600" dir="ltr">{user.email}</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                      {user.role === "OWNER" ? "المالك / المدير العام" : "فني / موظف"}
                    </span>
                  </td>
                  <td className="py-3.5 font-numeric text-slate-500">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
