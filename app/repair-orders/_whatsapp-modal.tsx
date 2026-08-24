"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  X,
  KeyRound,
  AlertCircle,
  Clock,
  RefreshCw,
  Edit3,
  BookmarkPlus,
  Trash2,
  Bookmark,
  Plus,
  Save,
  Pencil,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizePhoneForWhatsApp } from "@/lib/services/whatsappService";

export type WhatsAppModalProps = {
  customerName?: string | null;
  customerPhone?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  ticketNumber: string;
  statusLabel: string;
  totalAmount?: string | number | null;
  shopName: string;
  currency?: string;
  trackingUrl: string;
};

export type CustomWhatsAppTemplate = {
  id: string;
  title: string;
  templateText: string;
  createdAt: number;
};

const STORAGE_KEY = "phone_repair_whatsapp_custom_templates_v1";

// Helper to replace template variables with actual values
function resolveVariables(
  templateStr: string,
  vars: {
    name: string;
    device: string;
    ticketNumber: string;
    amount: string;
    shopName: string;
    status: string;
    trackingUrl: string;
  }
): string {
  return templateStr
    .replace(/\{(?:اسم_العميل|name|العميل)\}/gi, vars.name)
    .replace(/\{(?:الجهاز|device|موديل_الجهاز)\}/gi, vars.device)
    .replace(/\{(?:رقم_التذكرة|ticketNumber|رقم_الطلب|ticket)\}/gi, vars.ticketNumber)
    .replace(/\{(?:المبلغ|amount|المبلغ_المطلوب|السعر)\}/gi, vars.amount)
    .replace(/\{(?:اسم_المحل|shopName|المحل)\}/gi, vars.shopName)
    .replace(/\{(?:الحالة|status|حالة_الطلب)\}/gi, vars.status)
    .replace(/\{(?:رابط_التتبع|trackingUrl|التتبع|رابط)\}/gi, vars.trackingUrl);
}

export function WhatsAppMessageModal({
  customerName = "العميل",
  customerPhone,
  deviceBrand,
  deviceModel,
  ticketNumber,
  statusLabel,
  totalAmount,
  shopName,
  currency = "SAR",
  trackingUrl,
}: WhatsAppModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("ready");
  const [phoneOverride, setPhoneOverride] = useState(customerPhone || "");
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");

  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<CustomWhatsAppTemplate[]>([]);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateFormTitle, setTemplateFormTitle] = useState("");
  const [templateFormText, setTemplateFormText] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const device = [deviceBrand, deviceModel].filter(Boolean).join(" ") || "الجهاز";
  const formattedAmount = totalAmount ? `${totalAmount} ${currency}` : `غير محدد`;
  const name = customerName || "عميلنا العزيز";

  const contextVariables = {
    name,
    device,
    ticketNumber,
    amount: formattedAmount,
    shopName: shopName || "مركز الصيانة",
    status: statusLabel || "قيد المعالجة",
    trackingUrl,
  };

  // Load custom templates from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomTemplates(parsed);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  // Update phone override if customerPhone prop changes
  useEffect(() => {
    if (customerPhone) {
      setPhoneOverride(customerPhone);
    }
  }, [customerPhone]);

  const presetTemplates: Record<
    string,
    { title: string; icon: React.ComponentType<{ className?: string }>; getRawText: () => string }
  > = {
    ready: {
      title: "🎉 جاهز للاستلام",
      icon: Sparkles,
      getRawText: () => `مرحباً {اسم_العميل}،
يسرنا إبلاغك بأن جهازك ({الجهاز}) أصبح جاهزاً للاستلام الآن لدى {اسم_المحل} 🎉

📋 رقم التذكرة: {رقم_التذكرة}
💰 المبلغ المطلوب: {المبلغ}
🔗 تتبع حالة جهازك: {رابط_التتبع}

يرجى إحضار إيصال الاستلام عند الحضور. شكراً لثقتكم بنا!`,
    },
    passcode: {
      title: "🔑 طلب رمز القفل",
      icon: KeyRound,
      getRawText: () => `مرحباً {اسم_العميل}،
بخصوص صيانة جهازك ({الجهاز}) لدى {اسم_المحل}:

تم الانتهاء من تركيب القطع، ونرجو تزويدنا برمز قفل الشاشة (الرمز السري أو النمط) لنتمكن من فحص واختبار وظائف الجهاز والكاميرا والصوت واللمس بدقة قبل تسليمه لك.

📋 رقم التذكرة: {رقم_التذكرة}
شكراً لتعاونكم معنا!`,
    },
    price_approval: {
      title: "⚠️ موافقة على التكلفة",
      icon: AlertCircle,
      getRawText: () => `مرحباً {اسم_العميل}،
بخصوص جهازك ({الجهاز}) رقم التذكرة {رقم_التذكرة} لدى {اسم_المحل}:

بعد الفحص الفني، تبيّن وجود عطل يحتاج إلى صيانة وتغيير قطع، والتكلفة الإجمالية التقديرية هي: {المبلغ}.

نرجو منكم تأكيد الموافقة على المتابعة في عملية الصيانة. بانتظار ردكم الكريم!`,
    },
    delay: {
      title: "⏳ إشعار بتأخر القطع",
      icon: Clock,
      getRawText: () => `مرحباً {اسم_العميل}،
نعتذر منك بخصوص تأخر صيانة جهازك ({الجهاز})، القطعة المطلوبة قيد التوريد والشحن من المورد الخارجي.

سيتم إبلاغك فور وصول القطعة والبدء بتركيبها مباشرة.
📋 رقم التذكرة: {رقم_التذكرة}
🔗 رابط التتبع المباشر: {رابط_التتبع}

شكراً لصبركم وتفهمكم!`,
    },
    status_update: {
      title: "🔄 تحديث الحالة الحالي",
      icon: RefreshCw,
      getRawText: () => `مرحباً {اسم_العميل}،
تحديث بخصوص جهازك لدى {اسم_المحل}:

📋 رقم الطلب: {رقم_التذكرة}
📱 الجهاز: {الجهاز}
⚙️ الحالة الحالية: {الحالة}
🔗 رابط التتبع المباشر: {رابط_التتبع}

شكراً لتعاملكم معنا.`,
    },
    custom: {
      title: "✍️ رسالة حرة مخصصة",
      icon: Edit3,
      getRawText: () => `مرحباً {اسم_العميل}،

بخصوص جهازك ({الجهاز}) رقم التذكرة {رقم_التذكرة}:


مع تحيات {اسم_المحل}`,
    },
  };

  const [message, setMessage] = useState(() =>
    resolveVariables(presetTemplates.ready.getRawText(), contextVariables)
  );

  function showToast(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }

  function handleSelectPresetTemplate(id: string) {
    setSelectedTemplateId(id);
    const raw = presetTemplates[id]?.getRawText();
    if (raw) {
      setMessage(resolveVariables(raw, contextVariables));
    }
  }

  function handleSelectCustomTemplate(template: CustomWhatsAppTemplate) {
    setSelectedTemplateId(template.id);
    setMessage(resolveVariables(template.templateText, contextVariables));
  }

  function insertVariableInMessage(val: string) {
    setMessage((prev) => prev + ` ${val} `);
  }

  function insertPlaceholderInForm(placeholder: string) {
    setTemplateFormText((prev) => prev + placeholder);
  }

  function openCreateTemplateModal(initialContent = "") {
    setEditingTemplateId(null);
    setTemplateFormTitle("");
    setTemplateFormText(initialContent || message);
    setIsTemplateEditorOpen(true);
  }

  function openEditTemplateModal(tpl: CustomWhatsAppTemplate, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTemplateId(tpl.id);
    setTemplateFormTitle(tpl.title);
    setTemplateFormText(tpl.templateText);
    setIsTemplateEditorOpen(true);
  }

  function handleSaveCustomTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateFormTitle.trim() || !templateFormText.trim()) return;

    let updated: CustomWhatsAppTemplate[];
    if (editingTemplateId) {
      updated = customTemplates.map((t) =>
        t.id === editingTemplateId
          ? { ...t, title: templateFormTitle.trim(), templateText: templateFormText.trim() }
          : t
      );
      showToast("تم تحديث القالب بنجاح!");
    } else {
      const newTpl: CustomWhatsAppTemplate = {
        id: `tpl_${Date.now()}`,
        title: templateFormTitle.trim(),
        templateText: templateFormText.trim(),
        createdAt: Date.now(),
      };
      updated = [newTpl, ...customTemplates];
      showToast("تم حفظ القالب الجديد بنجاح!");
      setSelectedTemplateId(newTpl.id);
      setMessage(resolveVariables(newTpl.templateText, contextVariables));
      setActiveTab("custom");
    }

    setCustomTemplates(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore write errors
    }

    setIsTemplateEditorOpen(false);
    setEditingTemplateId(null);
  }

  function handleDeleteCustomTemplate(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا القالب؟")) return;

    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore write errors
    }
    showToast("تم حذف القالب");
    if (selectedTemplateId === id) {
      handleSelectPresetTemplate("ready");
    }
  }

  const normalizedPhone = normalizePhoneForWhatsApp(phoneOverride, currency);
  const whatsappUrl = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
    : null;

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full font-bold shadow-sm rounded-xl py-5 text-xs justify-center hover:bg-emerald-50 hover:text-emerald-700 border-slate-200"
        variant="outline"
      >
        <MessageCircle className="h-4.5 w-4.5 ml-2 text-emerald-600 shrink-0" aria-hidden="true" />
        مراسلة العميل عبر واتساب
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    مراسلة العميل عبر واتساب
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    اختر قالباً جاهزاً أو أنشئ قوالبك المخصصة بحرية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Notification Toast */}
            {notification && (
              <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-in fade-in slide-in-from-top">
                {notification}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Phone target confirmation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span>المرسل إليه:</span>
                  <span className="text-slate-900 font-black">{name}</span>
                  <span className="text-[11px] text-slate-500">({device})</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={phoneOverride}
                    onChange={(e) => setPhoneOverride(e.target.value)}
                    placeholder="رقم الواتساب..."
                    className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-numeric font-bold text-slate-900 w-36 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Template Tabs & Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  {/* Tabs */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("preset")}
                      className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                        activeTab === "preset"
                          ? "bg-white text-emerald-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      القوالب الجاهزة ({Object.keys(presetTemplates).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("custom")}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-lg transition ${
                        activeTab === "custom"
                          ? "bg-white text-emerald-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Bookmark className="h-3 w-3 text-amber-500" />
                      قوالبي المحفوظة ({customTemplates.length})
                    </button>
                  </div>

                  {/* Add New Template Quick Button */}
                  <button
                    type="button"
                    onClick={() => openCreateTemplateModal()}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition border border-emerald-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    قالب مخصص جديد
                  </button>
                </div>

                {/* Preset Templates Grid */}
                {activeTab === "preset" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(presetTemplates).map(([id, t]) => {
                      const active = selectedTemplateId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSelectPresetTemplate(id)}
                          className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition text-right border ${
                            active
                              ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-400/30"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <t.icon
                            className={`h-3.5 w-3.5 shrink-0 ${
                              active ? "text-emerald-600" : "text-slate-400"
                            }`}
                          />
                          <span className="truncate">{t.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Custom Templates Grid */}
                {activeTab === "custom" && (
                  <div>
                    {customTemplates.length === 0 ? (
                      <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <BookmarkPlus className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">لا توجد قوالب مخصصة محفوظة بعد</p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                          يمكنك حفظ نصوصك المتكررة كقوالب لتوفير الوقت واستخدامها بضغطة زر
                        </p>
                        <button
                          type="button"
                          onClick={() => openCreateTemplateModal()}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          إنشاء قالبك الأول الآن
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {customTemplates.map((t) => {
                          const active = selectedTemplateId === t.id;
                          return (
                            <div
                              key={t.id}
                              onClick={() => handleSelectCustomTemplate(t)}
                              className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition text-right border cursor-pointer ${
                                active
                                  ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-400/30"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate flex-1 pl-2">
                                <Bookmark className={`h-3.5 w-3.5 shrink-0 ${active ? "text-emerald-600" : "text-amber-500"}`} />
                                <span className="truncate">{t.title}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                                <button
                                  type="button"
                                  title="تعديل القالب"
                                  onClick={(e) => openEditTemplateModal(t, e)}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  title="حذف القالب"
                                  onClick={(e) => handleDeleteCustomTemplate(t.id, e)}
                                  className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    محتوى الرسالة (قابل للتعديل بحرية):
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openCreateTemplateModal(message)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                    >
                      <Save className="h-3 w-3" />
                      حفظ النص الحالي كقالب
                    </button>
                    <span className="text-[11px] font-bold text-slate-400">
                      {message.length} حرف
                    </span>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="erp-textarea w-full text-xs font-medium leading-relaxed resize-none p-3.5 rounded-2xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                  placeholder="اكتب نص الرسالة هنا..."
                />
              </div>

              {/* Quick variables insertion */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  إدراج بيانات الطلب الحالية سريعاً:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertVariableInMessage(name)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + اسم العميل ({name})
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariableInMessage(device)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + الجهاز ({device})
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariableInMessage(ticketNumber)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + رقم التذكرة ({ticketNumber})
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariableInMessage(formattedAmount)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + المبلغ ({formattedAmount})
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariableInMessage(trackingUrl)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                  >
                    + رابط التتبع
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                className="w-full sm:w-auto font-bold text-xs h-11 px-4 rounded-xl border-slate-300"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 ml-1.5 text-emerald-600" />
                    تم نسخ النص!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 ml-1.5" />
                    نسخ الرسالة
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="font-bold text-xs h-11 px-4 rounded-xl text-slate-500"
                >
                  إلغاء
                </Button>

                {whatsappUrl ? (
                  <Button
                    asChild
                    className="flex-1 sm:flex-none font-bold text-xs h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 border-0"
                  >
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      فتح في واتساب الآن
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : (
                  <Button disabled className="flex-1 sm:flex-none font-bold text-xs h-11 px-6 rounded-xl opacity-60">
                    أدخل رقم هاتف صحيح
                  </Button>
                )}
              </div>
            </div>

            {/* Sub-modal: Custom Template Creator / Editor */}
            {isTemplateEditorOpen && (
              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-xs flex flex-col justify-between p-6 animate-in fade-in duration-150">
                <div className="space-y-4 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                        <BookmarkPlus className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          {editingTemplateId ? "تعديل القالب المحفوظ" : "حفظ قالب واتساب جديد"}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          يمكنك إدراج المتغيرات التلقائية لتتغير بحسب كل عميل وجهاز
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTemplateEditorOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      اسم القالب:
                    </label>
                    <input
                      type="text"
                      value={templateFormTitle}
                      onChange={(e) => setTemplateFormTitle(e.target.value)}
                      placeholder="مثال: تذكير بالاستلام بعد أسبوع، طلب سداد دفعة مقدمة..."
                      className="erp-input w-full text-xs font-bold rounded-xl border-slate-300"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-extrabold text-slate-700">
                        نص القالب:
                      </label>
                    </div>

                    {/* Placeholder variable chips */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1.5">
                        <Info className="h-3 w-3 text-emerald-600" />
                        <span>انقر لإدراج متغير ديناميكي داخل النص:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => insertPlaceholderInForm("{اسم_العميل}")}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded-md transition"
                        >
                          + {"{اسم_العميل}"}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertPlaceholderInForm("{الجهاز}")}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded-md transition"
                        >
                          + {"{الجهاز}"}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertPlaceholderInForm("{رقم_التذكرة}")}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded-md transition"
                        >
                          + {"{رقم_التذكرة}"}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertPlaceholderInForm("{المبلغ}")}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded-md transition"
                        >
                          + {"{المبلغ}"}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertPlaceholderInForm("{الحالة}")}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded-md transition"
                        >
                          + {"{الحالة}"}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertPlaceholderInForm("{اسم_المحل}")}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded-md transition"
                        >
                          + {"{اسم_المحل}"}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertPlaceholderInForm("{رابط_التتبع}")}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded-md transition"
                        >
                          + {"{رابط_التتبع}"}
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={templateFormText}
                      onChange={(e) => setTemplateFormText(e.target.value)}
                      placeholder="اكتب نص القالب هنا واستخدم المتغيرات أعلاه..."
                      className="erp-textarea w-full text-xs font-medium resize-none p-3 rounded-xl border-slate-300"
                      required
                    />
                  </div>

                  {/* Live resolution preview */}
                  {templateFormText && (
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <span className="text-[11px] font-extrabold text-emerald-900 block mb-1">
                        معاينة كيف سيظهر مع العميل الحالي:
                      </span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                        {resolveVariables(templateFormText, contextVariables)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsTemplateEditorOpen(false)}
                    className="font-bold text-xs h-10 px-4 rounded-xl"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    disabled={!templateFormTitle.trim() || !templateFormText.trim()}
                    onClick={handleSaveCustomTemplate}
                    className="font-bold text-xs h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                  >
                    <Save className="h-4 w-4 ml-1.5" />
                    {editingTemplateId ? "حفظ التعديلات" : "حفظ القالب الآن"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

