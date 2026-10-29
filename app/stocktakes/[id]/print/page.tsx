import Link from "next/link";
import { requireAccountantPage } from "@/lib/auth/stocktake";
import { getStocktake } from "@/lib/services/stocktakeService";
import { parseStocktakeReport } from "@/lib/stocktake-report";
import { StocktakePrint } from "./print";
export const dynamic = "force-dynamic";
export default async function StocktakePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ report?: string }>;
}) {
  const auth = await requireAccountantPage();
  const { id } = await params;
  const query = await searchParams;
  const data = await getStocktake(
    { shopId: auth.shop.id, userId: auth.user.id },
    id,
  );
  if (data.status !== "CLOSED")
    return (
      <div className="p-6">
        أغلق الجلسة قبل طباعة التقرير النهائي.{" "}
        <Link href={`/stocktakes/${id}`} className="underline">
          العودة للجرد
        </Link>
      </div>
    );
  return (
    <StocktakePrint data={data} report={parseStocktakeReport(query.report)} />
  );
}
