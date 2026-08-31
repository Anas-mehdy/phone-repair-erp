"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { createSaleAction, type SaleActionState } from "./actions";
import { Field, inputClassName } from "./_components";
import {
  InventorySearchCombobox,
  type SaleInventoryOption,
} from "./inventory-search-combobox";

type InventoryOption = SaleInventoryOption;

type SaleLineDraft = {
  id: string;
  inventoryItemId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  discountTotal: string;
};

const initialState: SaleActionState = {};

function createLine(): SaleLineDraft {
  return {
    id: crypto.randomUUID(),
    inventoryItemId: "",
    description: "",
    quantity: 1,
    unitPrice: "0",
    discountTotal: "0",
  };
}

export function SaleForm({
  inventoryItems,
  currency = "SAR",
}: {
  inventoryItems: InventoryOption[];
  currency?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createSaleAction,
    initialState,
  );
  const [lines, setLines] = useState<SaleLineDraft[]>([createLine()]);

  const serializedItems = useMemo(() => {
    return JSON.stringify(
      lines.map((line) => ({
        inventoryItemId: line.inventoryItemId || null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountTotal: line.discountTotal || "0",
      })),
    );
  }, [lines]);

  const subtotal = lines.reduce((sum, line) => {
    return sum + Number(line.unitPrice || 0) * Number(line.quantity || 0);
  }, 0);
  const discountTotal = lines.reduce((sum, line) => {
    return sum + Number(line.discountTotal || 0);
  }, 0);
  const total = subtotal - discountTotal;

  function updateLine(id: string, updates: Partial<SaleLineDraft>) {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === id ? { ...line, ...updates } : line,
      ),
    );
  }

  function handleInventorySelect(line: SaleLineDraft, item: InventoryOption | null) {
    updateLine(line.id, {
      inventoryItemId: item?.id ?? "",
      description: item?.name ?? "",
      unitPrice: item?.unitPrice ?? "0",
    });
  }

  function removeLine(id: string) {
    setLines((currentLines) =>
      currentLines.length === 1
        ? currentLines
        : currentLines.filter((line) => line.id !== id),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input name="items" type="hidden" value={serializedItems} />

      {state.error ? (
        <div className="rounded-2xl border border-rose-250/30 bg-rose-50/40 p-4.5 text-xs font-extrabold text-rose-700">
          ⚠️ {state.error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="space-y-6">
          <section className="erp-section">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100/60 pb-3.5 mb-5">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">سلة بنود البيع</h3>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">أضف قطع الغيار أو الخدمات المنجزة لعملية البيع.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="font-bold shadow-sm border-slate-200/80 hover:bg-primary/5 hover:text-primary hover:border-primary/20 rounded-xl"
                onClick={() => setLines((currentLines) => [...currentLines, createLine()])}
              >
                <Plus className="h-4 w-4 ml-1.5" aria-hidden="true" />
                إضافة بند جديد
              </Button>
            </div>

            <div className="space-y-5">
              {lines.map((line, index) => {
                const isInventoryItem = !!line.inventoryItemId;

                return (
                  <div key={line.id} className="rounded-2xl border border-slate-200/60 bg-slate-50/20 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-slate-50/40">
                    <div className="mb-4 flex items-center justify-between pb-2 border-b border-slate-200/40">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-700">بند رقم #{index + 1}</span>
                        {isInventoryItem ? (
                          <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/40">قطعة من المخزن</span>
                        ) : (
                          <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">بند يدوي / خدمة</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-650 hover:bg-rose-50 hover:text-rose-700 rounded-lg"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                        aria-label="حذف البند"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_100px_120px_120px]">
                      <Field label="قطعة من المخزون">
                        <InventorySearchCombobox
                          value={line.inventoryItemId}
                          selectedLabel={line.description}
                          initialOptions={inventoryItems}
                          onSelect={(item) => handleInventorySelect(line, item)}
                        />
                      </Field>
                      <Field label="الوصف / التفاصيل">
                        <input
                          className={inputClassName}
                          value={line.description}
                          onChange={(event) =>
                            updateLine(line.id, { description: event.target.value })
                          }
                          placeholder="وصف مخصص للبند..."
                        />
                      </Field>
                      <Field label="الكمية">
                        <input
                          className={`${inputClassName} font-numeric text-center`}
                          min="1"
                          step="1"
                          type="number"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.id, {
                              quantity: Number(event.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="سعر الوحدة (USD)">
                        <input
                          className={`${inputClassName} font-numeric`}
                          min="0"
                          step="0.01"
                          type="number"
                          value={line.unitPrice}
                          onChange={(event) =>
                            updateLine(line.id, { unitPrice: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="الخصم الكلي للبند">
                        <input
                          className={`${inputClassName} font-numeric`}
                          min="0"
                          step="0.01"
                          type="number"
                          value={line.discountTotal}
                          onChange={(event) =>
                            updateLine(line.id, {
                              discountTotal: event.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="erp-section">
            <div className="border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">بيانات العميل (اختياري)</h3>
            </div>
            <div className="grid gap-4">
              <Field label="اسم العميل">
                <input className={inputClassName} name="customerName" placeholder="مثال: محمد علي" />
              </Field>
              <Field label="رقم الهاتف">
                <input className={`${inputClassName} font-numeric`} name="customerPhone" inputMode="tel" placeholder="05xxxxxxxx" />
              </Field>
            </div>
          </section>

          <section className="erp-section">
            <div className="border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">الحسابات والملخص المالي</h3>
            </div>
            <div className="space-y-3.5">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>الإجمالي الفرعي:</span>
                <span className="font-numeric font-bold">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>إجمالي الخصومات:</span>
                <span className="font-numeric text-rose-600 font-bold">
                  {discountTotal > 0 ? formatCurrency(-discountTotal, currency) : formatCurrency(0, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-850 pt-3.5 border-t border-slate-200">
                <span>الإجمالي النهائي:</span>
                <span className="font-numeric text-xl text-primary font-black">{formatCurrency(total, currency)}</span>
              </div>
            </div>
            <div className="mt-6 pt-1">
              <Button type="submit" disabled={isPending} className="w-full font-bold shadow-md h-12 rounded-xl text-xs justify-center">
                <Save className="h-4.5 w-4.5 ml-1.5" aria-hidden="true" />
                {isPending ? "جاري تسجيل عملية البيع..." : "إتمام وإصدار عملية البيع"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
