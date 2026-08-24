"use client";

import { useState, useTransition, useEffect } from "react";
import { RepairStatus } from "@prisma/client";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { repairStatusOptions, getRepairStatusLabel, selectClassName, textareaClassName, Field } from "./_components";
import { updateRepairOrderStatusAction } from "./actions";

interface StatusUpdateFormProps {
  repairOrderId: string;
  currentStatus: RepairStatus;
}

export function StatusUpdateForm({ repairOrderId, currentStatus }: StatusUpdateFormProps) {
  const [selectedStatus, setSelectedStatus] = useState<RepairStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Keep state in sync whenever server component revalidates and passes new currentStatus
  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessStatus(null);

    const formData = new FormData();
    formData.append("repairOrderId", repairOrderId);
    formData.append("status", selectedStatus);
    if (note.trim()) {
      formData.append("note", note.trim());
    }

    startTransition(async () => {
      try {
        await updateRepairOrderStatusAction(formData);
        const label = getRepairStatusLabel(selectedStatus);
        setSuccessStatus(`تم تحديث الحالة بنجاح إلى "${label}"`);
        setNote(""); // clear note after save
        setTimeout(() => {
          setSuccessStatus(null);
        }, 4000);
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="erp-section h-fit space-y-4">
      <div className="border-b border-slate-100/60 pb-3">
        <h3 className="font-bold text-slate-800 text-sm">تحديث حالة الصيانة</h3>
      </div>

      {successStatus && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successStatus}</span>
        </div>
      )}

      <div className="grid gap-4">
        <Field label="الحالة الجديدة">
          <select
            className={selectClassName}
            name="status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as RepairStatus)}
            disabled={isPending}
          >
            {repairStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="ملاحظة الحالة">
          <textarea
            className={textareaClassName}
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="اكتب ملاحظة حول تغيير الحالة..."
            disabled={isPending}
            rows={3}
          />
        </Field>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full font-bold shadow-sm rounded-xl py-5 text-xs bg-teal-800 hover:bg-teal-700 text-white flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري حفظ وتحديث الحالة...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              حفظ وتحديث الحالة
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
