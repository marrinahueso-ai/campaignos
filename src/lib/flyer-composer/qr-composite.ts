import "server-only";

import sharp from "sharp";

import { generateFlyerQrPng, isFlyerQrTarget } from "@/lib/flyer-composer/qr-code";

/**
 * Overlay a scannable QR code on the bottom-right of a generated flyer.
 * Assumes the image model left a placeholder region per prompt instructions.
 */
export async function compositeFlyerQrCode(input: {
  imageBase64: string;
  qrUrl: string;
}): Promise<string | null> {
  const qrUrl = input.qrUrl.trim();
  if (!isFlyerQrTarget(qrUrl)) {
    return null;
  }

  try {
    const flyerBytes = Buffer.from(input.imageBase64, "base64");
    const meta = await sharp(flyerBytes).metadata();
    const width = meta.width ?? 1024;
    const height = meta.height ?? 1792;

    const qrSize = Math.round(Math.min(width, height) * 0.12);
    const margin = Math.round(Math.min(width, height) * 0.04);

    const qrPng = await generateFlyerQrPng(qrUrl, qrSize);
    if (!qrPng) return null;

    const left = width - qrSize - margin;
    const top = height - qrSize - margin;

    const composited = await sharp(flyerBytes)
      .composite([
        {
          input: await sharp(qrPng)
            .extend({
              top: 4,
              bottom: 4,
              left: 4,
              right: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .png()
            .toBuffer(),
          left,
          top,
        },
      ])
      .png()
      .toBuffer();

    return composited.toString("base64");
  } catch {
    return null;
  }
}
