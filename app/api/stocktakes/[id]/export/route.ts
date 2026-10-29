import { requireAccountant } from "@/lib/auth/stocktake";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/context";
import { getStocktake } from "@/lib/services/stocktakeService";
import { exportStocktake, parseStocktakeReport } from "@/lib/stocktake-report";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAccountant();
    const { id } = await params;
    const data = await getStocktake(
      { shopId: auth.shop.id, userId: auth.user.id },
      id,
    );
    if (data.status !== "CLOSED")
      return Response.json(
        { error: "أغلق جلسة الجرد قبل تصدير التقرير النهائي." },
        { status: 409 },
      );
    const report = parseStocktakeReport(
      new URL(request.url).searchParams.get("report"),
    );
    return new Response("\uFEFF" + exportStocktake(data, report), {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="stocktake-${id}-${report}.xls"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    )
      return Response.json({ error: "غير مصرح بالدخول." }, { status: 403 });
    console.error("[stocktake export]", error);
    return Response.json({ error: "تعذر تجهيز التقرير." }, { status: 400 });
  }
}
