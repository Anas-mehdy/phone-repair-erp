import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { prisma } from "@/lib/prisma";
import { softwareServiceService } from "@/lib/services/softwareServiceService";
import { SoftwareServiceForm } from "../_software-service-form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewSoftwareServicePage({ searchParams }: Props) {
  const query = await searchParams;
  const context = await getCurrentShopContext();
  const [customers, catalog] = await Promise.all([
    prisma.customer.findMany({
      where: { shopId: context.shopId, deletedAt: null },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    softwareServiceService.listCatalog(context.shopId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="بيع خدمة غير مخزنية"
          title="إضافة خدمة سوفتوير"
          description="سجّل الخدمة مباشرةً، وسيُنشئ مسار فاتورة مالية عادية مرتبطة بها بدون حالات صيانة أو QR."
        />
        <Button asChild variant="outline" className="shrink-0 rounded-xl">
          <Link href="/software-services"><ArrowRight className="ml-1 h-4 w-4" />رجوع</Link>
        </Button>
      </div>
      {query.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          {query.error}
        </div>
      ) : null}
      <SoftwareServiceForm
        customers={customers}
        catalog={catalog.map((item) => ({
          id: item.id,
          name: item.name,
          defaultPrice: item.defaultPrice?.toString() ?? null,
          defaultCost: item.defaultCost?.toString() ?? null,
        }))}
      />
    </div>
  );
}
