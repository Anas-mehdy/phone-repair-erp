"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const KPI_ROUTES: Record<string, string> = {
  "طلبات صيانة مفتوحة": "/repair-orders",
  "جاهزة للتسليم": "/repair-orders?status=DONE",
  "طلبات استلمت اليوم": "/repair-orders",
  "طلبات سلمت اليوم": "/repair-orders?status=DELIVERED",
  "مبيعات اليوم": "/sales",
  "فواتير غير مكتملة": "/invoices?status=UNPAID",
  "مبالغ مستحقة": "/invoices?status=UNPAID",
  "تنبيهات المخزون": "/inventory?lowStockOnly=on",
};

export function DashboardKpiNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/dashboard") return;

    const cards = Array.from(document.querySelectorAll<HTMLElement>(".erp-card"));
    const cleanups: Array<() => void> = [];

    for (const card of cards) {
      const label = Object.keys(KPI_ROUTES).find((candidate) =>
        Array.from(card.querySelectorAll("p")).some(
          (element) => element.textContent?.trim() === candidate,
        ),
      );

      if (!label) continue;

      const href = KPI_ROUTES[label];
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `${label} — عرض التفاصيل`);
      card.dataset.dashboardKpiLink = "true";
      card.classList.add(
        "cursor-pointer",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-primary/40",
        "focus-visible:ring-offset-2",
      );

      const navigate = () => router.push(href);
      const onClick = (event: MouseEvent) => {
        if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) return;
        navigate();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        navigate();
      };

      card.addEventListener("click", onClick);
      card.addEventListener("keydown", onKeyDown);
      cleanups.push(() => {
        card.removeEventListener("click", onClick);
        card.removeEventListener("keydown", onKeyDown);
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [pathname, router]);

  return null;
}
