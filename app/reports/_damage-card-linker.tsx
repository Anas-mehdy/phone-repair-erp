"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type CardLink = {
  label: string;
  href: string;
  preserveRange?: boolean;
  selector?: string;
};

const links: CardLink[] = [
  { label: "إجمالي المبيعات", href: "/reports/details/sales", preserveRange: true },
  { label: "المقبوض فعلياً", href: "/reports/details/collected", preserveRange: true },
  { label: "المتبقي عند العملاء", href: "/reports/details/outstanding", preserveRange: true },
  { label: "التكاليف المباشرة", href: "/reports/details/direct-costs", preserveRange: true },
  { label: "إجمالي التوالف", href: "/reports/damages", preserveRange: true },
  { label: "ربح الخدمات الإلكترونية", href: "/reports/details/electronic-profit", preserveRange: true },
  { label: "ربح التحويلات", href: "/reports/details/transfer-profit", preserveRange: true },
  { label: "مجمل الربح", href: "/reports/details/gross-profit", preserveRange: true },
  { label: "المصروفات", href: "/reports/details/expenses", preserveRange: true },
  { label: "صافي الربح", href: "/reports/details/net-profit", preserveRange: true },
  { label: "قيمة المخزون الحالية", href: "/reports/details/inventory-value", preserveRange: true },

  // Existing dedicated pages: route directly instead of rebuilding another ledger.
  { label: "الديون", href: "/debts" },
  { label: "الدرج النقدي", href: "/cash-drawer", selector: "div.rounded-xl.border" },
  { label: "المحافظ", href: "/transfers", selector: "div.rounded-xl.border" },
  { label: "الحسابات البنكية", href: "/bank-accounts", selector: "div.rounded-xl.border" },
  { label: "قيمة الخدمات", href: "/electronic-services/reports", selector: "div.rounded-xl.border" },
  { label: "تكلفة المزودين", href: "/electronic-services/reports", selector: "div.rounded-xl.border" },
  { label: "تحصيل مباشر", href: "/electronic-services/reports", selector: "div.rounded-xl.border" },
  { label: "المتبقي على العملاء", href: "/debts", selector: "div.rounded-xl.border" },
  { label: "الربح", href: "/electronic-services/reports", selector: "div.rounded-xl.border" },

  // Cash drawer / wallet report panel already has full dedicated ledgers.
  { label: "رصيد الدرج الحالي", href: "/cash-drawer" },
  { label: "دخول الدرج خلال الفترة", href: "/cash-drawer" },
  { label: "خروج الدرج خلال الفترة", href: "/cash-drawer" },
  { label: "صافي حركة الدرج", href: "/cash-drawer" },
  { label: "رصيد المحافظ الحالي", href: "/transfers" },
  { label: "دخول المحافظ خلال الفترة", href: "/transfers" },
  { label: "خروج المحافظ خلال الفترة", href: "/transfers" },
  { label: "صافي حركة المحافظ", href: "/transfers" },
  { label: "إجمالي السيولة الحالية", href: "/cash-drawer" },
];

function withReportRange(href: string, searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  const preset = searchParams.get("preset") || "month";
  params.set("preset", preset);

  if (preset === "custom") {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (start) params.set("start", start);
    if (end) params.set("end", end);
  }

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${params.toString()}`;
}

export function DamageCardLinker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== "/reports") return;

    const cleanups: Array<() => void> = [];
    const textNodes = Array.from(document.querySelectorAll("p, span"));

    for (const item of links) {
      const label = textNodes.find((node) => node.textContent?.trim() === item.label);
      if (!label) continue;

      const selector = item.selector || "div.rounded-2xl.border";
      const card = label.closest(selector) as HTMLElement | null;
      if (!card || card.dataset.reportLinked === "1") continue;

      const href = item.preserveRange
        ? withReportRange(item.href, new URLSearchParams(searchParams.toString()))
        : item.href;

      card.dataset.reportLinked = "1";
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `فتح تفاصيل ${item.label}`);
      card.setAttribute("title", `اضغط لعرض تفاصيل ${item.label}`);
      card.classList.add(
        "cursor-pointer",
        "transition",
        "hover:-translate-y-0.5",
        "hover:shadow-md",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-primary/40",
      );

      const navigate = (event?: Event) => {
        const target = event?.target as HTMLElement | null;
        if (target?.closest("a, button, input, select, textarea, form")) return;
        window.location.href = href;
      };

      const onClick = (event: MouseEvent) => navigate(event);
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        navigate(event);
      };

      card.addEventListener("click", onClick);
      card.addEventListener("keydown", onKeyDown);

      cleanups.push(() => {
        card.removeEventListener("click", onClick);
        card.removeEventListener("keydown", onKeyDown);
        delete card.dataset.reportLinked;
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [pathname, searchParams]);

  return null;
}
