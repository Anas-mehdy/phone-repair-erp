import { NextRequest } from "next/server";

import { requirePermission } from "@/lib/auth/context";
import { createXlsx } from "@/lib/export/simpleXlsx";
import { formatDate } from "@/lib/format";
import { reportSearchParamsFromUrl, resolveReportRange } from "@/lib/reports/reportRange";
import { reportDashboardService } from "@/lib/services/reportDashboardService";
import { timeZoneForCountry } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requirePermission("reports:read");
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const params = reportSearchParamsFromUrl(request.nextUrl.searchParams);
  const range = resolveReportRange(params, timeZone);
  const dashboard = await reportDashboardService.getReportDashboard(auth.shop.id, range);
  const endDisplay = new Date(range.end.getTime() - 1);
  const periodText = `${formatDate(range.start, timeZone)} - ${formatDate(endDisplay, timeZone)}`;
  const currency = auth.shop.currency || "SAR";
  const departments = Object.values(dashboard.departments);

  const workbook = createXlsx([
    {
      name: "الملخص",
      widths: [31, 22],
      rows: [
        ["البيان", "القيمة"],
        ["المتجر", auth.shop.name],
        ["الفترة", periodText],
        ["العملة", currency],
        ["إجمالي المبيعات", dashboard.summary.sales],
        ["التكاليف المباشرة", dashboard.summary.directCosts],
        ["مجمل الربح", dashboard.summary.grossProfit],
        ["المصروفات", dashboard.obligations.expenses],
        ["صافي الربح", dashboard.summary.netProfit],
        ["هامش الربح %", dashboard.summary.profitMargin],
        ["المقبوض فعلياً", dashboard.baseReport.metrics.collected],
        ["المتبقي عند العملاء", dashboard.baseReport.metrics.outstanding],
      ],
    },
    {
      name: "المبيعات حسب القسم",
      widths: [27, 16, 18, 18, 18],
      rows: [
        ["القسم", "عدد العمليات", "المبيعات / القيمة الداخلة", "التكلفة / القيمة الخارجة", "الربح"],
        ...departments.map((item) => [item.label, item.count, item.revenue, item.cost, item.profit]),
      ],
    },
    {
      name: "الأرصدة الحالية",
      widths: [31, 21, 46],
      rows: [
        ["الرصيد", "القيمة", "ملاحظة"],
        ["الدرج النقدي", dashboard.balances.drawer, "الرصيد الحالي — لا يتغير بتغيير فترة التقرير"],
        ["المحافظ الإلكترونية", dashboard.balances.wallets, "الرصيد الحالي"],
        ["الحسابات البنكية", dashboard.balances.banks, "الرصيد الحالي"],
        ["رصيد مزودي الخدمات الإلكترونية", dashboard.balances.electronicProviders, "رصيد تشغيلي مستقل عن السيولة"],
        ["إجمالي السيولة", dashboard.balances.liquidity, "الدرج + المحافظ + البنوك"],
        ["قيمة المخزون", dashboard.balances.inventory, "القيمة الحالية بسعر التكلفة"],
      ],
    },
    {
      name: "المتابعة",
      widths: [31, 18, 18],
      rows: [
        ["البيان", "القيمة", "عدد الحركات"],
        ["الديون والمستحقات", dashboard.obligations.debts, ""],
        ["المصروفات ضمن الفترة", dashboard.obligations.expenses, dashboard.obligations.expenseCount],
        ["التوالف ضمن الفترة", dashboard.obligations.damages, dashboard.obligations.damageCount],
      ],
    },
    {
      name: "مصادر الإيرادات",
      widths: [33, 20],
      rows: [
        ["المصدر", "القيمة"],
        ...dashboard.baseReport.revenueMix.map((item) => [item.label, item.value]),
      ],
    },
    {
      name: "مصادر المقبوضات",
      widths: [33, 20],
      rows: [
        ["المصدر", "القيمة"],
        ...dashboard.baseReport.paymentSources.map((item) => [item.label, item.value]),
      ],
    },
  ]);

  const dateToken = new Date().toISOString().slice(0, 10);
  const utf8Name = encodeURIComponent(`جرد-${auth.shop.name}-${dateToken}.xlsx`);

  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="massar-report-${dateToken}.xlsx"; filename*=UTF-8''${utf8Name}`,
      "Cache-Control": "private, no-store",
    },
  });
}
