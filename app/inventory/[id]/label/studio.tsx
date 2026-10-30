"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Check, Printer, ScanBarcode, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeviceLabelData } from "@/lib/device-label";

// Keep the barcode encoder in the server bundle. This small client handles only
// preview and printing; it never fetches device data or sends it to a third party.
export const PRINT_SIZES = {
  "60x40": { width: 60, height: 40 },
  "50x30": { width: 50, height: 30 },
  "70x50": { width: 70, height: 50 },
  "90x50": { width: 90, height: 50 },
} as const;
type SizeKey = keyof typeof PRINT_SIZES;

const LABEL_LAYOUTS = {
  "50x30": {
    padding: "1.3mm 2mm",
    shop: 7.5,
    model: 14,
    specs: 10,
    battery: 8.5,
    price: 13,
    barcode: 6.5,
    code: 7,
  },
  "60x40": {
    padding: "1.8mm 2.6mm",
    shop: 9,
    model: 19,
    specs: 12,
    battery: 10,
    price: 17,
    barcode: 9,
    code: 8.5,
  },
  "70x50": {
    padding: "2mm 2.6mm",
    shop: 11,
    model: 24,
    specs: 15,
    battery: 12,
    price: 21,
    barcode: 11,
    code: 10,
  },
  "90x50": {
    padding: "2mm 2.6mm",
    shop: 11,
    model: 26,
    specs: 15,
    battery: 12,
    price: 22,
    barcode: 11,
    code: 10,
  },
} as const;

export function DeviceLabelCard({
  data,
  showPrice,
  size,
  textScale = 1,
}: {
  data: DeviceLabelData;
  showPrice: boolean;
  size: SizeKey;
  textScale?: number;
}) {
  const dimensions = PRINT_SIZES[size];
  const layout = LABEL_LAYOUTS[size];
  const font = (points: number) =>
    `calc(${points}pt * var(--label-text-scale, 1))`;
  const priceVisible = showPrice && data.priceConfigured;
  const style = {
    "--label-text-scale": textScale,
    width: `${dimensions.width}mm`,
    height: `${dimensions.height}mm`,
    padding: layout.padding,
    fontFamily: "Arial, sans-serif",
    color: "#000",
    background: "#fff",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    direction: "rtl",
    lineHeight: 1.13,
  } as CSSProperties;
  return (
    <article className="device-label-card" style={style}>
      <div
        className="device-label-details"
        style={{
          flex: "1 1 0",
          minHeight: 0,
          paddingBottom: "0.5mm",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "0.35mm",
        }}
      >
        <div
          dir="auto"
          style={{
            fontSize: font(layout.shop),
            textAlign: "center",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.shopName}
        </div>
        <div
          className="device-label-model"
          dir="auto"
          style={{
            fontSize: font(
              data.model.length > 40 ? layout.model * 0.75 : layout.model,
            ),
            textAlign: "center",
            fontWeight: 900,
            overflowWrap: "anywhere",
            lineHeight: 1.08,
          }}
        >
          {data.model}
        </div>
        <div
          className="device-label-specs"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2mm",
            fontSize: font(layout.specs),
            fontWeight: 800,
          }}
        >
          <span className="device-label-condition" lang="ar" dir="rtl">
            {data.condition}
          </span>
          <span dir="ltr">{data.storage}</span>
        </div>
        {priceVisible || data.batteryHealth !== null ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5mm 2mm",
            }}
          >
            {data.batteryHealth !== null ? (
              <div
                className="device-label-battery"
                style={{ fontSize: font(layout.battery), fontWeight: 700 }}
              >
                صحة البطارية: <strong dir="ltr">{data.batteryHealth}%</strong>
              </div>
            ) : null}
            {priceVisible ? (
              <div
                className="device-label-price"
                dir="ltr"
                style={{
                  fontSize: font(layout.price),
                  fontWeight: 900,
                  lineHeight: 1.05,
                }}
              >
                {new Intl.NumberFormat("en-US", {
                  maximumFractionDigits: 2,
                }).format(Number(data.price))}{" "}
                <span dir="auto" style={{ fontSize: font(layout.battery) }}>
                  {data.currency}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        className="device-label-barcode"
        dir="ltr"
        style={{ marginTop: "0.8mm", flexShrink: 0, textAlign: "center" }}
      >
        {/* Preserve the vector barcode for thermal printing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.barcodeDataUrl}
          alt={`باركود ${data.barcode}`}
          style={{
            display: "block",
            width: "100%",
            height: `${layout.barcode}mm`,
            objectFit: "fill",
          }}
        />
        <div
          style={{
            fontSize: `${layout.code}pt`,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0.25pt",
            marginTop: "0.4mm",
            lineHeight: 1,
          }}
        >
          {data.barcode}
        </div>
      </div>
    </article>
  );
}

export function DeviceLabelStudio({
  data,
  inventoryItemId,
}: {
  data: DeviceLabelData;
  inventoryItemId: string;
}) {
  const [size, setSize] = useState<SizeKey>("60x40");
  const [showPrice, setShowPrice] = useState(data.priceConfigured);
  const [copies, setCopies] = useState("1");
  const [ready, setReady] = useState(false);
  const [fit, setFit] = useState(true);
  const [textScale, setTextScale] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const barcodeFits =
    data.minimumBarcodeWidthMm <=
    PRINT_SIZES[size].width - (size === "50x30" ? 4 : 5.2);
  const count = Number(copies);
  const validCount = Number.isInteger(count) && count >= 1 && count <= 50;
  useEffect(() => {
    setReady(true);
  }, []);
  useLayoutEffect(() => {
    let active = true;
    function checkFit() {
      if (!active) return;
      const card =
        preview.current?.querySelector<HTMLElement>(".device-label-card");
      const details = card?.querySelector<HTMLElement>(".device-label-details");
      if (!card || !details) {
        setFit(false);
        return;
      }
      const fits = () =>
        details.scrollHeight <= details.clientHeight + 1 &&
        details.scrollWidth <= details.clientWidth + 1 &&
        card.scrollHeight <= card.clientHeight + 1;
      // Measure the largest legible type first and shrink only when needed.
      // Use the same measured scale for the preview and every printed copy.
      card.style.setProperty("--label-text-scale", "1");
      let scale = 1;
      if (!fits()) {
        let low = 0.68,
          high = 1;
        card.style.setProperty("--label-text-scale", String(low));
        if (fits()) {
          for (let i = 0; i < 9; i++) {
            const middle = (low + high) / 2;
            card.style.setProperty("--label-text-scale", String(middle));
            if (fits()) low = middle;
            else high = middle;
          }
        }
        scale = low;
      }
      card.style.setProperty("--label-text-scale", String(scale));
      setTextScale(scale);
      setFit(fits());
    }
    const observer = new ResizeObserver(checkFit);
    if (preview.current) observer.observe(preview.current);
    checkFit();
    void document.fonts.ready.then(checkFit);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [size, showPrice, data]);
  async function print() {
    if (!validCount || !fit || !barcodeFits || !ready) return;
    setPrintError(null);
    setPrinting(true);
    try {
      await document.fonts.ready;
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          "#device-label-print-root img",
        ),
      );
      await Promise.all(images.map((image) => image.decode()));
      window.print();
    } catch {
      setPrintError(
        "تعذر تجهيز الباركود للطباعة. أعد تحميل الصفحة وحاول مجدداً.",
      );
    } finally {
      setPrinting(false);
    }
  }
  const dimensions = PRINT_SIZES[size];
  const printCss = `.device-label-details > * { flex-shrink: 0; }
    @page { size: ${dimensions.width}mm ${dimensions.height}mm; margin: 0; }
    @media screen { #device-label-print-root { display: none; } }
    @media print {
      html, body { width: ${dimensions.width}mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
      body > * { display: none !important; }
      body > #device-label-print-root { display: block !important; width: ${dimensions.width}mm !important; margin: 0 !important; padding: 0 !important; position: static !important; }
      #device-label-print-root .device-label-card { break-after: page; break-inside: avoid; margin: 0 !important; box-shadow: none !important; border: 0 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      #device-label-print-root .device-label-card:last-child { break-after: auto; }
    }`;
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <style>{printCss}</style>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-700 dark:text-teal-300">
            المخزون / الأجهزة
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            ليبل الجهاز
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            معلومات واضحة على ظهر الجهاز، وباركود يفتح نفس الصنف عند مسحه بنقطة
            البيع.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/inventory/${inventoryItemId}`}>
            <ArrowRight className="ml-2 h-4 w-4" />
            تفاصيل الجهاز
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-black">
              <Tag className="h-4 w-4 text-teal-600" />
              معاينة الملصق
            </div>
            <span
              dir="ltr"
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800"
            >
              {dimensions.width} × {dimensions.height} mm
            </span>
          </div>
          <div className="flex min-h-[340px] items-center justify-center overflow-auto bg-slate-100/80 p-8 dark:bg-slate-900/70">
            <div
              ref={preview}
              className="shrink-0 border border-slate-300 bg-white shadow-xl"
            >
              <DeviceLabelCard
                data={data}
                showPrice={showPrice}
                size={size}
                textScale={textScale}
              />
            </div>
          </div>
          <div className="flex items-start gap-2 border-t border-slate-100 p-5 text-xs leading-6 text-slate-500 dark:border-slate-800">
            <ScanBarcode className="mt-1 h-4 w-4 shrink-0 text-teal-600" />
            <span>
              باركود Code 128 واضح للطباعة الحرارية. الموديل والحالة والسعة
              والبطارية تأتي من بيانات الجهاز المحفوظة.
            </span>
          </div>
        </section>
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-sm font-black">إعدادات الطباعة</h2>
          <label className="grid gap-2 text-xs font-bold">
            مقاس الملصق
            <select
              className="erp-input"
              dir="ltr"
              value={size}
              onChange={(event) => setSize(event.target.value as SizeKey)}
            >
              {Object.entries(PRINT_SIZES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.width} × {value.height} mm
                  {key === "60x40" ? " — مقترح" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold dark:border-slate-700">
            <span>إظهار سعر البيع</span>
            <input
              type="checkbox"
              disabled={!data.priceConfigured}
              checked={showPrice}
              onChange={(event) => setShowPrice(event.target.checked)}
            />
          </label>
          {!data.priceConfigured ? (
            <p className="text-xs leading-6 text-amber-700">
              سعر البيع غير محدد. احفظ سعر البيع من تفاصيل الجهاز قبل إظهاره على
              الليبل.
            </p>
          ) : null}
          <label className="grid gap-2 text-xs font-bold">
            عدد النسخ
            <input
              className="erp-input"
              type="number"
              min="1"
              max="50"
              step="1"
              value={copies}
              onChange={(event) => setCopies(event.target.value)}
            />
          </label>
          {!validCount ? (
            <p role="alert" className="text-xs font-bold text-rose-600">
              اختر عدداً صحيحاً من 1 إلى 50 نسخة.
            </p>
          ) : null}
          {!barcodeFits ? (
            <p
              role="alert"
              className="text-xs font-bold leading-6 text-rose-600"
            >
              الباركود كثيف لهذا المقاس. اختر مقاساً أكبر أو استخدم باركوداً
              رقمياً أقصر من بيانات الجهاز.
            </p>
          ) : null}
          {!fit ? (
            <p
              role="alert"
              className="text-xs font-bold leading-6 text-rose-600"
            >
              البيانات أطول من المساحة المتاحة. اختر مقاساً أكبر أو أخفِ السعر
              قبل الطباعة.
            </p>
          ) : null}
          {printError ? (
            <p role="alert" className="text-xs font-bold text-rose-600">
              {printError}
            </p>
          ) : null}
          <Button
            className="h-12 w-full rounded-xl font-black"
            disabled={!ready || !validCount || !fit || !barcodeFits || printing}
            onClick={() => void print()}
          >
            <Printer className="ml-2 h-4 w-4" />
            {printing ? "تجهيز الطباعة..." : "طباعة الليبل"}
          </Button>
          <div className="rounded-xl bg-teal-50 p-3 text-[11px] leading-6 text-teal-900 dark:bg-teal-950 dark:text-teal-200">
            <p className="flex items-center gap-1 font-black">
              <Check className="h-3.5 w-3.5" />
              قبل الطباعة
            </p>
            <p>
              اختر نفس المقاس في تعريف الطابعة، واجعل القياس 100% والهوامش بدون،
              وأوقف رؤوس وتذييلات الصفحات. الطباعة لا تغيّر المخزون.
            </p>
          </div>
        </aside>
      </div>
      {ready
        ? createPortal(
            <div
              id="device-label-print-root"
              style={
                { "--label-width": `${dimensions.width}mm` } as CSSProperties
              }
            >
              {Array.from({ length: validCount ? count : 1 }, (_, index) => (
                <DeviceLabelCard
                  key={index}
                  data={data}
                  showPrice={showPrice}
                  size={size}
                  textScale={textScale}
                />
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
