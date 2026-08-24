"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRepairOrderAction } from "./actions";

interface DeleteRepairOrderButtonProps {
  repairOrderId: string;
  ticketNumber: string;
  variant?: "button" | "icon" | "danger-zone";
}

export function DeleteRepairOrderButton({
  repairOrderId,
  ticketNumber,
  variant = "button",
}: DeleteRepairOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    const formData = new FormData();
    formData.append("repairOrderId", repairOrderId);

    startTransition(async () => {
      try {
        await deleteRepairOrderAction(formData);
      } catch (err: unknown) {
        // In Next.js redirect throws a NEXT_REDIRECT error which is normal behavior
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
          return;
        }
        setError(err instanceof Error ? err.message : "فشل حذف طلب الصيانة");
      }
    });
  }

  return (
    <>
      {variant === "danger-zone" ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-black text-rose-900">منطقة الحذف (إلغاء تذكرة الصيانة)</h4>
            <p className="text-xs text-rose-700/80 mt-0.5">
              سيتم حذف تذكرة الصيانة وسجلاتها نهائياً من قائمة طلبات المتجر.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(true)}
            className="border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white font-bold text-xs rounded-xl h-10 px-4 transition shrink-0"
          >
            <Trash2 className="h-4 w-4 ml-1.5" />
            حذف طلب الصيانة
          </Button>
        </div>
      ) : variant === "icon" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="حذف طلب الصيانة"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full font-bold shadow-xs rounded-xl py-5 text-xs justify-center hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border-slate-200 text-slate-600"
        >
          <Trash2 className="h-4 w-4 ml-2 text-rose-500 shrink-0" />
          حذف تذكرة الصيانة
        </Button>
      )}

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    تأكيد حذف طلب الصيانة
                  </h3>
                  <p className="text-xs font-numeric font-bold text-slate-500 mt-0.5">
                    رقم التذكرة: {ticketNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
                ⚠️ {error}
              </div>
            )}

            <div className="py-4 text-xs text-slate-600 leading-relaxed font-medium">
              هل أنت متأكد من رغبتك في حذف طلب الصيانة هذا؟ سيتم إخفاء التذكرة وسجلاتها وإلغاء أي فواتير غير مدفوعة مرتبطة بها.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="font-bold text-xs h-11 px-4 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                تراجع
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="font-bold text-xs h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 border-0"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 ml-1.5" />
                    نعم، احذف الطلب
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
