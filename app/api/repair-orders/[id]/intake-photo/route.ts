import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission("repairs:read", { allowRedirect: false });
    const { id } = await context.params;
    const repairOrderId = z.string().uuid().parse(id);

    const photo = await prisma.repairOrderIntakePhoto.findFirst({
      where: {
        shopId: auth.shop.id,
        repairOrderId,
        repairOrder: { shopId: auth.shop.id, deletedAt: null },
      },
      select: { fileData: true, mimeType: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(photo.fileData), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": 'inline; filename="intake-photo.jpg"',
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "الصورة غير متاحة." }, { status: 404 });
  }
}
