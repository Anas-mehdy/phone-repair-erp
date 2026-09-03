import { NextResponse } from "next/server";
import { platformBrandingService } from "@/lib/services/platformBrandingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const asset = await platformBrandingService.getDarkModeLogoAsset();

  if (!asset) {
    return NextResponse.redirect(new URL("/masar-logo.png", request.url), 307);
  }

  const bytes = Buffer.from(asset.base64, "base64");

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
