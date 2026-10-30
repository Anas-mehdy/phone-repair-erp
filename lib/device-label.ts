import bwipjs from "bwip-js/node";
import {
  DEVICE_CONDITIONS,
  normalizeDeviceDetails,
  normalizeDeviceBarcode,
  type DeviceDetails,
} from "./inventory-device";

export type DeviceLabelData = {
  model: string;
  condition: string;
  storage: string;
  batteryHealth: number | null;
  barcode: string;
  barcodeDataUrl: string;
  minimumBarcodeWidthMm: number;
  priceConfigured: boolean;
  price: string;
  currency: string;
  shopName: string;
};
export function makeDeviceLabel(
  item: DeviceDetails & {
    barcode: string | null;
    unitPrice: { toString(): string };
    salePriceConfigured?: boolean;
  },
  shopName: string,
  currency: string,
): DeviceLabelData {
  const device = normalizeDeviceDetails(item);
  if (!device.isDevice)
    throw new Error("طباعة ليبل الجهاز متاحة للأصناف المسجلة كأجهزة مستقلة.");
  const barcode = normalizeDeviceBarcode(item.barcode);
  if (!barcode)
    throw new Error(
      "احفظ بيانات الجهاز في المخزون لتوليد باركوده قبل الطباعة.",
    );
  const svg = bwipjs.toSVG({
    bcid: "code128",
    text: barcode,
    scale: 2,
    height: 10,
    includetext: false,
    paddingwidth: 12,
    paddingheight: 1,
    backgroundcolor: "FFFFFF",
  });
  // Let the barcode use the paper's full printable width independently of its
  // height. Keep the quiet zones and enforce a minimum module width below.
  const printableSvg = svg.replace("<svg ", '<svg preserveAspectRatio="none" ');
  const svgWidth = Number(/viewBox="0 0 ([0-9.]+) /.exec(svg)?.[1]);
  if (!Number.isFinite(svgWidth)) throw new Error("تعذر تجهيز أبعاد الباركود.");
  return {
    model: device.deviceModel!,
    condition: DEVICE_CONDITIONS[device.deviceCondition!],
    storage: device.storageCapacity!,
    batteryHealth: device.batteryHealth,
    barcode,
    barcodeDataUrl: `data:image/svg+xml;base64,${Buffer.from(printableSvg).toString("base64")}`,
    minimumBarcodeWidthMm: (svgWidth / 2) * 0.25,
    priceConfigured: item.salePriceConfigured ?? true,
    price: item.unitPrice.toString(),
    currency,
    shopName,
  };
}
