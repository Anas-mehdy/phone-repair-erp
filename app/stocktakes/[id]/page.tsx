import { requireAccountantPage } from "@/lib/auth/stocktake";
import { getStocktake } from "@/lib/services/stocktakeService";
import { StocktakeWorkspace } from "./workspace";
export const dynamic = "force-dynamic";
export default async function StocktakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAccountantPage();
  const { id } = await params;
  const data = await getStocktake(
    { shopId: auth.shop.id, userId: auth.user.id },
    id,
  );
  return <StocktakeWorkspace data={data} />;
}
