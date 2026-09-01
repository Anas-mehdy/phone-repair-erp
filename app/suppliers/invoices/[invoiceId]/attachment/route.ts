import { requirePermission } from "@/lib/auth/context";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";
import { fetchSupplierInvoiceReference } from "@/lib/services/supplierInvoiceStorage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { invoiceId } = await params;
    const auth = await requirePermission("suppliers:manage", { allowRedirect: false });
    const invoice = await supplierInvoiceService.getSupplierInvoiceById(auth.shop.id, invoiceId);

    if (!invoice?.attachmentPath) {
      return new Response("Attachment not found", { status: 404 });
    }

    const stored = await fetchSupplierInvoiceReference(invoice.attachmentPath);
    if (!stored.ok) {
      return new Response("Attachment unavailable", { status: stored.status === 404 ? 404 : 502 });
    }

    const filename = invoice.attachmentName || "supplier-invoice";
    const body = await stored.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": invoice.attachmentMimeType || stored.headers.get("content-type") || "application/octet-stream",
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `inline; filename="supplier-invoice"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}
