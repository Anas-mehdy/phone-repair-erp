import { randomUUID } from "node:crypto";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { installmentService } from "@/lib/services/installmentService";
import { InstallmentPlanForm } from "./_plan-form";

export const dynamic = "force-dynamic";

export default async function NewInstallmentPage({ searchParams }: { searchParams: Promise<{ invoiceId?: string; error?: string }> }) {
  const query = await searchParams;
  const auth = await requirePermission("invoices:pay");
  const { customers, invoices } = await installmentService.getCreationOptions(auth.shop.id);
  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center justify-between gap-3"><PageHeader title="خطة أقساط جديدة" description="أدخل المبلغ والعدد وسيحسب النظام الجدول تلقائياً" /><Button asChild variant="outline"><Link href="/installments"><ArrowRight className="ml-2 h-4 w-4" />رجوع</Link></Button></div>
    {query.error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{query.error}</div>}
    <InstallmentPlanForm
      requestId={randomUUID()}
      initialInvoiceId={query.invoiceId}
      currency={auth.shop.currency}
      customers={customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone }))}
      invoices={invoices.map((invoice) => ({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, balanceDue: invoice.balanceDue.toString(), customer: invoice.customer ? { id: invoice.customer.id, name: invoice.customer.name, phone: invoice.customer.phone } : null }))}
    />
  </div>;
}
