import { DEVICE_CONDITIONS, DEVICE_CONDITIONS_EN } from "./inventory-device";
import type { DeviceLabelData } from "./device-label";

export type LabelLanguage = "ar" | "en";

export function deviceLabelText(data: DeviceLabelData, language: LabelLanguage) {
  const english = language === "en";
  return {
    condition: data.conditionCode ? (english ? DEVICE_CONDITIONS_EN : DEVICE_CONDITIONS)[data.conditionCode] : "",
    storage: english ? "Storage" : "السعة",
    batteryHealth: english ? "Battery health" : "صحة البطارية",
    batteryCycles: english ? "Battery cycles" : "دورات الشحن",
    barcode: english ? "Barcode" : "باركود",
  };
}
