"use client";

import { useMemo, useState } from "react";
import { Truck, Calculator, Package, Trash2, Layers, AlertCircle } from "lucide-react";
import { Field, inputClassName, selectClassName } from "./_components";
import { Button } from "@/components/ui/button";

export type SupplierOption = {
  id: string;
  name: string;
  phone: string | null;
};

export type InventoryItemOption = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: string | number;
  unitCost: string | number | null;
};

export type RepairOrderItemDraft = {
  id?: string;
  source: "inventory" | "external";
  inventoryItemId: string;
  supplierId: string;
  supplierName: string;
  partName: string;
  quantity: number;
  unitCost: string;
  unitPrice: string;
  notes: string;
};

type SupplierFieldsProps = {
  suppliers: SupplierOption[];
  inventoryItems?: InventoryItemOption[];
  currency?: string;
  defaultSupplierName?: string;
  defaultPartName?: string;
  defaultPartCost?: string | number | null;
  defaultDeductPartCost?: boolean;
  defaultSupplierNotes?: string;
  initialItems?: Array<{
    id?: string;
    inventoryItemId?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    partName: string;
    quantity: number;
    unitCost?: string | number | null;
    unitPrice?: string | number | null;
    notes?: string | null;
  }>;
  readOnly?: boolean;
};

function createEmptyItem(source: "inventory" | "external" = "inventory"): RepairOrderItemDraft {
  return {
    source,
    inventoryItemId: "",
    supplierId: "",
    supplierName: "",
    partName: "",
    quantity: 1,
    unitCost: "0",
    unitPrice: "0",
    notes: "",
  };
}

export function SupplierFields({
  suppliers,
  inventoryItems = [],
  currency = "SAR",
  defaultSupplierName = "",
  defaultPartName = "",
  defaultPartCost = "",
  defaultDeductPartCost = true,
  defaultSupplierNotes = "",
  initialItems,
  readOnly = false,
}: SupplierFieldsProps) {
  // Initialize items from initialItems or legacy defaults
  const [items, setItems] = useState<RepairOrderItemDraft[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((item) => ({
        id: item.id,
        source: item.inventoryItemId ? "inventory" : "external",
        inventoryItemId: item.inventoryItemId || "",
        supplierId: item.supplierId || "",
        supplierName: item.supplierName || "",
        partName: item.partName || "",
        quantity: item.quantity || 1,
        unitCost: item.unitCost ? String(item.unitCost) : "0",
        unitPrice: item.unitPrice ? String(item.unitPrice) : "0",
        notes: item.notes || "",
      }));
    }

    if (defaultPartName || defaultSupplierName || defaultPartCost) {
      return [
        {
          source: "external",
          inventoryItemId: "",
          supplierId: "",
          supplierName: defaultSupplierName || "",
          partName: defaultPartName || "",
          quantity: 1,
          unitCost: defaultPartCost ? String(defaultPartCost) : "0",
          unitPrice: "0",
          notes: defaultSupplierNotes || "",
        },
      ];
    }

    return [];
  });

  const [deductCost, setDeductCost] = useState(defaultDeductPartCost !== false);

  // Total cost calculation
  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      const itemCost = Number(String(item.unitCost).replace(",", ".")) || 0;
      const itemQty = Number(item.quantity) || 1;
      return sum + itemCost * itemQty;
    }, 0);
  }, [items]);

  // Primary supplier and part name for backward compatibility
  const primaryPartName = items.map((i) => i.partName.trim()).filter(Boolean).join("، ");
  const primarySupplierName = items.find((i) => i.supplierName)?.supplierName || defaultSupplierName || "";

  // Serialized items payload for form submission
  const serializedItems = useMemo(() => {
    return JSON.stringify(
      items
        .filter((item) => Boolean(item.partName.trim()))
        .map((item) => ({
          id: item.id || undefined,
          inventoryItemId: item.source === "inventory" && item.inventoryItemId ? item.inventoryItemId : null,
          supplierId: item.source === "external" && item.supplierId ? item.supplierId : null,
          supplierName: item.source === "external" && item.supplierName ? item.supplierName.trim() : null,
          partName: item.partName.trim(),
          quantity: Number(item.quantity) || 1,
          unitCost: item.source === "external" ? String(item.unitCost || "0") : undefined, // Backend will fetch unitCost for inventory
          unitPrice: String(item.unitPrice || "0"),
          notes: item.notes.trim() || null,
        })),
    );
  }, [items]);

  function addItem(source: "inventory" | "external" = "inventory") {
    setItems((curr) => [...curr, createEmptyItem(source)]);
  }

  function removeItem(index: number) {
    setItems((curr) => curr.filter((_, idx) => idx !== index));
  }

  function updateItem(index: number, updates: Partial<RepairOrderItemDraft>) {
    setItems((curr) =>
      curr.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, ...updates };
      }),
    );
  }

  function handleInventorySelect(index: number, inventoryItemId: string) {
    const selectedItem = inventoryItems.find((inv) => inv.id === inventoryItemId);
    if (selectedItem) {
      updateItem(index, {
        inventoryItemId,
        partName: selectedItem.name,
        unitCost: selectedItem.unitCost ? String(selectedItem.unitCost) : "0",
        unitPrice: selectedItem.unitPrice ? String(selectedItem.unitPrice) : "0",
      });
    } else {
      updateItem(index, {
        inventoryItemId: "",
        partName: "",
        unitCost: "0",
        unitPrice: "0",
      });
    }
  }

  return (
    <section className="erp-section border-teal-100 bg-gradient-to-b from-teal-50/20 to-transparent">
      {/* Hidden serialization for server action */}
      <input type="hidden" name="items" value={serializedItems} />
      <input type="hidden" name="supplierName" value={primarySupplierName} />
      <input type="hidden" name="partName" value={primaryPartName} />
      <input type="hidden" name="partCost" value={totalCost > 0 ? totalCost.toFixed(2) : ""} />

      {/* Header */}
      <div className="border-b border-teal-100/60 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">قطع الغيار والموردين (خاص بورشة الصيانة)</h3>
            <p className="mt-0.5 text-xs text-slate-400 font-medium">
              اختر قطع غيار من المخزون الداخلي مع الخصم التلقائي، أو وثّق القطع المشتراة من موردين خارجيين.
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addItem("inventory")}
              className="border-teal-300 text-teal-800 hover:bg-teal-50 text-xs font-bold gap-1.5 h-8"
            >
              <Package className="h-3.5 w-3.5" />
              + قطعة من المخزون
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addItem("external")}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5 h-8"
            >
              <Truck className="h-3.5 w-3.5" />
              + مورد خارجي
            </Button>
          </div>
        )}
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-teal-200/80 bg-white/50 p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-2">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-700">لم يتم تحديد أي قطع غيار لهذه التذكرة</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
            يمكنك إضافة قطع من المخزون لخصم كميتها تلقائياً وتوثيق تكلفتها، أو تسجيل قطعة من مورد خارجي.
          </p>
          {!readOnly && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem("inventory")}
                className="border-teal-300 text-teal-800 hover:bg-teal-50 text-xs font-bold gap-1.5"
              >
                <Package className="h-3.5 w-3.5" />
                إضافة من المخزون
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem("external")}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5"
              >
                <Truck className="h-3.5 w-3.5" />
                إضافة مورد خارجي
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const selectedInventoryItem = inventoryItems.find((inv) => inv.id === item.inventoryItemId);
            const isOutOfStock = selectedInventoryItem && selectedInventoryItem.quantity < item.quantity;

            return (
              <div
                key={item.id || idx}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-2xs space-y-3 transition-all hover:border-teal-200"
              >
                {/* Item header & Type Switcher */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-800">
                      {idx + 1}
                    </span>
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200/60 text-xs font-bold">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => updateItem(idx, { source: "inventory" })}
                        className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                          item.source === "inventory"
                            ? "bg-teal-700 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Package className="h-3 w-3" />
                        من المخزون الداخلي
                      </button>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => updateItem(idx, { source: "external" })}
                        className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                          item.source === "external"
                            ? "bg-slate-800 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Truck className="h-3 w-3" />
                        مورد خارجي
                      </button>
                    </div>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                      title="حذف القطعة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Form fields depending on source */}
                {item.source === "inventory" ? (
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <Field label="اختر القطعة من المخزون">
                        <select
                          className={selectClassName}
                          value={item.inventoryItemId}
                          disabled={readOnly}
                          onChange={(e) => handleInventorySelect(idx, e.target.value)}
                        >
                          <option value="">-- اختر قطعة الغيار --</option>
                          {inventoryItems.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} (المتوفر: {inv.quantity}) {inv.sku ? `[${inv.sku}]` : ""}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {selectedInventoryItem && (
                        <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
                          <span>
                            الرصيد المتاح:{" "}
                            <strong className={selectedInventoryItem.quantity > 0 ? "text-emerald-700" : "text-rose-600"}>
                              {selectedInventoryItem.quantity} قطعة
                            </strong>
                          </span>
                          <span>
                            سعر التكلفة:{" "}
                            <strong className="text-slate-700 font-numeric">
                              {Number(selectedInventoryItem.unitCost || 0).toFixed(2)} {currency}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <Field label="الكمية المطلوبة">
                        <input
                          type="number"
                          min="1"
                          className={`${inputClassName} font-numeric`}
                          value={item.quantity}
                          disabled={readOnly}
                          onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        />
                      </Field>
                    </div>

                    <div className="sm:col-span-4">
                      <Field label="ملاحظات القطعة (اختياري)">
                        <input
                          className={inputClassName}
                          value={item.notes}
                          disabled={readOnly}
                          onChange={(e) => updateItem(idx, { notes: e.target.value })}
                          placeholder="مثال: تم استبدال الشاشة الأصلية..."
                        />
                      </Field>
                    </div>

                    {isOutOfStock && (
                      <div className="sm:col-span-12 flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 text-amber-800 text-xs border border-amber-200">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          تنبيه: الكمية المطلوبة ({item.quantity}) أكبر من المتوفر حالياً ({selectedInventoryItem.quantity}).
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <Field label="اسم المورد الخارجي">
                        <input
                          className={inputClassName}
                          list={`suppliers-list-${idx}`}
                          value={item.supplierName}
                          disabled={readOnly}
                          onChange={(e) => updateItem(idx, { supplierName: e.target.value })}
                          placeholder="اختر أو اكتب اسم المورد..."
                        />
                        <datalist id={`suppliers-list-${idx}`}>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.phone ? `(${s.phone})` : ""}
                            </option>
                          ))}
                        </datalist>
                      </Field>
                    </div>

                    <div className="sm:col-span-4">
                      <Field label="اسم قطعة الغيار">
                        <input
                          className={inputClassName}
                          value={item.partName}
                          disabled={readOnly}
                          onChange={(e) => updateItem(idx, { partName: e.target.value })}
                          placeholder="مثال: مدخل شحن Type-C أصلي..."
                        />
                      </Field>
                    </div>

                    <div className="sm:col-span-2">
                      <Field label="التكلفة">
                        <div className="relative">
                          <input
                            className={`${inputClassName} font-numeric pl-8`}
                            value={item.unitCost}
                            disabled={readOnly}
                            inputMode="decimal"
                            onChange={(e) => updateItem(idx, { unitCost: e.target.value })}
                            placeholder="0.00"
                          />
                          <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-slate-400">
                            {currency}
                          </span>
                        </div>
                      </Field>
                    </div>

                    <div className="sm:col-span-2">
                      <Field label="الكمية">
                        <input
                          type="number"
                          min="1"
                          className={`${inputClassName} font-numeric`}
                          value={item.quantity}
                          disabled={readOnly}
                          onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        />
                      </Field>
                    </div>

                    <div className="sm:col-span-12">
                      <Field label="ملاحظات المورد والضمان">
                        <input
                          className={inputClassName}
                          value={item.notes}
                          disabled={readOnly}
                          onChange={(e) => updateItem(idx, { notes: e.target.value })}
                          placeholder="مثال: رقم الفاتورة أو مدة الضمان من المورد..."
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Deduction Checkbox & Summary Card */}
      <div className="mt-4 pt-3 border-t border-teal-100 flex flex-col gap-3">
        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50/80 transition">
          <input
            type="checkbox"
            name="deductPartCost"
            checked={deductCost}
            disabled={readOnly}
            onChange={(e) => setDeductCost(e.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
          />
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              خصم إجمالي تكلفة قطع الغيار من صافي أرباح الصيانة
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              {deductCost
                ? "مفعّل: سيتم طرح تكلفة القطع المستهلكة من إجمالي الصيانة لحساب صافي الربح الحقيقي."
                : "معطّل: لن يتم خصم تكلفة القطع من الربح (مثلاً إذا دفع العميل التكلفة منفصلة)."}
            </span>
          </div>
        </label>

        {totalCost > 0 && (
          <div className="p-4 rounded-2xl bg-teal-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-teal-200">ملخص حساب تكلفة قطع الغيار</p>
                <p className="text-[11px] text-teal-100/80 font-medium">
                  عدد القطع: {items.length} | إجمالي التكلفة: {totalCost.toFixed(2)} {currency}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl self-start sm:self-auto font-numeric text-xs font-bold text-teal-100">
              <span>إجمالي التكلفة:</span>
              <span className="text-sm font-black text-white">
                {totalCost.toFixed(2)} {currency}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
