import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/context";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { invoiceId } = await params;
    const auth = await requirePermission("suppliers:manage", { allowRedirect: false });
    const attachment = await supplierInvoiceService.getAttachment(auth.shop.id, invoiceId);
    if (!attachment) return new NextResponse("Not found", { status: 404 });

    const body = new Uint8Array(attachment.data);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Length": String(attachment.fileSize),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }
}
