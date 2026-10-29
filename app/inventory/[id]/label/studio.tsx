"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Check, Printer, ScanBarcode, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeviceLabelData } from "@/lib/device-label";

// Keep the barcode encoder in the server bundle. This small client handles only
// preview and printing; it never fetches device data or sends it to a third party.
export const PRINT_SIZES = { "60x40": { width: 60, height: 40 }, "50x30": { width: 50, height: 30 }, "70x50": { width: 70, height: 50 }, "90x50": { width: 90, height: 50 } } as const;
type SizeKey = keyof typeof PRINT_SIZES;

export function DeviceLabelCard({ data, showPrice, size }: { data: DeviceLabelData; showPrice: boolean; size: SizeKey }) {
  const compact = size === "50x30";
  const dimensions = PRINT_SIZES[size];
  const style = { width: `${dimensions.width}mm`, height: `${dimensions.height}mm`, padding: compact ? "1.4mm 2mm" : "2.4mm 2.6mm", fontFamily: "Arial, sans-serif", color: "#000", background: "#fff", boxSizing: "border-box" as const, display: "flex", flexDirection: "column" as const, gap: compact ? "0.45mm" : "0.9mm", overflow: "hidden", direction: "ltr" as const, lineHeight: 1.15 };
  return <article className="device-label-card" style={style}>
    <div dir="auto" style={{ fontSize: compact ? "6pt" : "7pt", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.shopName}</div>
    <div className="device-label-model" dir="auto" style={{ fontSize: data.model.length > 40 ? compact ? "7pt" : "9pt" : compact ? "9pt" : "11pt", fontWeight: 900, overflowWrap: "anywhere", flexShrink: 0 }}>{data.model}</div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: "2mm", fontSize: compact ? "7pt" : "8pt", fontWeight: 700 }}><span>{data.condition}</span><span>{data.storage}</span></div>
    {data.batteryHealth !== null ? <div style={{ fontSize: compact ? "6.5pt" : "7.5pt" }}>Battery Health: <strong>{data.batteryHealth}%</strong></div> : null}
    {showPrice && data.priceConfigured ? <div className="device-label-price" style={{ fontSize: compact ? "9pt" : "12pt", fontWeight: 900, marginTop: "0.2mm" }}>{new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(data.price))} <span style={{ fontSize: compact ? "6pt" : "7pt" }}>{data.currency}</span></div> : null}
    <div className="device-label-barcode" style={{ marginTop: "auto", flexShrink: 0, textAlign: "center" }}>
      {/* The image is an inline vector barcode; Next image optimization would rasterize it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.barcodeDataUrl} alt={`Barcode ${data.barcode}`} style={{ display: "block", width: "100%", height: compact ? "6mm" : "8.5mm", objectFit: "fill" }} />
      <div style={{ fontSize: compact ? "6pt" : "7pt", fontFamily: "Arial, sans-serif", letterSpacing: "0.3pt", marginTop: "0.5mm" }}>{data.barcode}</div>
    </div>
  </article>;
}

export function DeviceLabelStudio({ data, inventoryItemId }: { data: DeviceLabelData; inventoryItemId: string }) {
  const [size, setSize] = useState<SizeKey>("60x40");
  const [showPrice, setShowPrice] = useState(data.priceConfigured);
  const [copies, setCopies] = useState("1");
  const [ready, setReady] = useState(false);
  const [fit, setFit] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const barcodeFits = data.minimumBarcodeWidthMm <= PRINT_SIZES[size].width - (size === "50x30" ? 4 : 5.2);
  const count = Number(copies);
  const validCount = Number.isInteger(count) && count >= 1 && count <= 50;
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    function checkFit() {
      const card = preview.current?.querySelector<HTMLElement>(".device-label-card");
      setFit(Boolean(card && card.scrollHeight <= card.clientHeight + 1));
    }
    const observer = new ResizeObserver(checkFit);
    if (preview.current) observer.observe(preview.current);
    checkFit();
    void document.fonts.ready.then(checkFit);
    return () => observer.disconnect();
  }, [size, showPrice, data]);
  async function print() {
    if (!validCount || !fit || !barcodeFits || !ready) return;
    setPrintError(null);
    setPrinting(true);
    try {
      await document.fonts.ready;
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("#device-label-print-root img"));
      await Promise.all(images.map((image) => image.decode()));
      window.print();
    } catch { setPrintError("تعذر تجهيز الباركود للطباعة. أعد تحميل الصفحة وحاول مجدداً."); } finally { setPrinting(false); }
  }
  const dimensions = PRINT_SIZES[size];
  const printCss = `.device-label-card > * { flex-shrink: 0; }
    @page { size: ${dimensions.width}mm ${dimensions.height}mm; margin: 0; }
    @media screen { #device-label-print-root { display: none; } }
    @media print {
      html, body { width: ${dimensions.width}mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
      body > * { display: none !important; }
      body > #device-label-print-root { display: block !important; width: ${dimensions.width}mm !important; margin: 0 !important; padding: 0 !important; position: static !important; }
      #device-label-print-root .device-label-card { break-after: page; break-inside: avoid; margin: 0 !important; box-shadow: none !important; border: 0 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      #device-label-print-root .device-label-card:last-child { break-after: auto; }
    }`;
  return <div className="mx-auto max-w-5xl space-y-6 pb-10">
    <style>{printCss}</style>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black text-teal-700 dark:text-teal-300">المخزون / الأجهزة</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">ليبل الجهاز</h1><p className="mt-2 text-sm text-slate-500">معلومات واضحة على ظهر الجهاز، وباركود يفتح نفس الصنف عند مسحه بنقطة البيع.</p></div><Button asChild variant="outline"><Link href={`/inventory/${inventoryItemId}`}><ArrowRight className="ml-2 h-4 w-4" />تفاصيل الجهاز</Link></Button></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div className="flex items-center gap-2 text-sm font-black"><Tag className="h-4 w-4 text-teal-600" />معاينة الملصق</div><span dir="ltr" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">{dimensions.width} × {dimensions.height} mm</span></div>
        <div className="flex min-h-[340px] items-center justify-center overflow-auto bg-slate-100/80 p-8 dark:bg-slate-900/70"><div ref={preview} className="shrink-0 border border-slate-300 bg-white shadow-xl"><DeviceLabelCard data={data} showPrice={showPrice} size={size} /></div></div>
        <div className="flex items-start gap-2 border-t border-slate-100 p-5 text-xs leading-6 text-slate-500 dark:border-slate-800"><ScanBarcode className="mt-1 h-4 w-4 shrink-0 text-teal-600" /><span>باركود Code 128 واضح للطباعة الحرارية. الموديل والحالة والسعة والبطارية تأتي من بيانات الجهاز المحفوظة.</span></div>
      </section>
      <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"><h2 className="text-sm font-black">إعدادات الطباعة</h2>
        <label className="grid gap-2 text-xs font-bold">مقاس الملصق<select className="erp-input" dir="ltr" value={size} onChange={(event) => setSize(event.target.value as SizeKey)}>{Object.entries(PRINT_SIZES).map(([key, value]) => <option key={key} value={key}>{value.width} × {value.height} mm{key === "60x40" ? " — مقترح" : ""}</option>)}</select></label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold dark:border-slate-700"><span>إظهار سعر البيع</span><input type="checkbox" disabled={!data.priceConfigured} checked={showPrice} onChange={(event) => setShowPrice(event.target.checked)} /></label>
        {!data.priceConfigured ? <p className="text-xs leading-6 text-amber-700">سعر البيع غير محدد. احفظ سعر البيع من تفاصيل الجهاز قبل إظهاره على الليبل.</p> : null}
        <label className="grid gap-2 text-xs font-bold">عدد النسخ<input className="erp-input" type="number" min="1" max="50" step="1" value={copies} onChange={(event) => setCopies(event.target.value)} /></label>
        {!validCount ? <p role="alert" className="text-xs font-bold text-rose-600">اختر عدداً صحيحاً من 1 إلى 50 نسخة.</p> : null}
        {!barcodeFits ? <p role="alert" className="text-xs font-bold leading-6 text-rose-600">الباركود كثيف لهذا المقاس. اختر مقاساً أكبر أو استخدم باركوداً رقمياً أقصر من بيانات الجهاز.</p> : null}
        {!fit ? <p role="alert" className="text-xs font-bold leading-6 text-rose-600">البيانات أطول من المساحة المتاحة. اختر مقاساً أكبر أو أخفِ السعر قبل الطباعة.</p> : null}
        {printError ? <p role="alert" className="text-xs font-bold text-rose-600">{printError}</p> : null}
        <Button className="h-12 w-full rounded-xl font-black" disabled={!ready || !validCount || !fit || !barcodeFits || printing} onClick={() => void print()}><Printer className="ml-2 h-4 w-4" />{printing ? "تجهيز الطباعة..." : "طباعة الليبل"}</Button>
        <div className="rounded-xl bg-teal-50 p-3 text-[11px] leading-6 text-teal-900 dark:bg-teal-950 dark:text-teal-200"><p className="flex items-center gap-1 font-black"><Check className="h-3.5 w-3.5" />قبل الطباعة</p><p>اختر نفس المقاس في تعريف الطابعة، واجعل القياس 100% والهوامش بدون، وأوقف رؤوس وتذييلات الصفحات. الطباعة لا تغيّر المخزون.</p></div>
      </aside>
    </div>
    {ready ? createPortal(<div id="device-label-print-root" style={{ "--label-width": `${dimensions.width}mm` } as CSSProperties}>{Array.from({ length: validCount ? count : 1 }, (_, index) => <DeviceLabelCard key={index} data={data} showPrice={showPrice} size={size} />)}</div>, document.body) : null}
  </div>;
}
