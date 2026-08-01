import { NextResponse } from "next/server";

import { requireFlyerComposerGenerateAccess } from "@/lib/flyer-composer/api-auth";
import {
  clampQrSize,
  generateFlyerQrPng,
  isFlyerQrTarget,
} from "@/lib/flyer-composer/qr-code";

export const dynamic = "force-dynamic";

/**
 * First-party QR PNG for Flyer composer Inspiration / letter preview.
 * Replaces third-party QR image hosts.
 */
export async function GET(request: Request) {
  const access = await requireFlyerComposerGenerateAccess();
  if (!access.ok) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data")?.trim() ?? "";
  if (!isFlyerQrTarget(data)) {
    return NextResponse.json(
      { success: false, error: "Provide a http(s) URL in data." },
      { status: 400 },
    );
  }

  const sizeRaw = Number(searchParams.get("size") ?? "256");
  const size = clampQrSize(sizeRaw);
  const png = await generateFlyerQrPng(data, size);
  if (!png) {
    return NextResponse.json(
      { success: false, error: "Unable to generate QR code." },
      { status: 500 },
    );
  }

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
