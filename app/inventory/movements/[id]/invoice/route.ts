import { getCurrentShopContext } from "@/lib/current-shop";
import { supplierInvoiceAttachmentService } from "@/lib/services/supplierInvoiceAttachmentService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getCurrentShopContext({ allowRedirect: false });
  if (!context.shopId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const attachment = await supplierInvoiceAttachmentService.getAttachmentFile(context.shopId, id);
  if (!attachment) return new Response("Not found", { status: 404 });

  const encodedName = encodeURIComponent(attachment.fileName).replace(/'/g, "%27");
  return new Response(new Uint8Array(attachment.fileData), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.fileSize),
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
