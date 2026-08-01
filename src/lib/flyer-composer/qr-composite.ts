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

    // Match prompt: ~10–12% width square in the footer CTA, bottom-right.
    const qrSize = Math.round(Math.min(width, height) * 0.11);
    const margin = Math.round(Math.min(width, height) * 0.035);
    const pad = Math.max(3, Math.round(qrSize * 0.04));

    const qrPng = await generateFlyerQrPng(qrUrl, qrSize);
    if (!qrPng) return null;

    const stamp = await sharp(qrPng)
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    const stampMeta = await sharp(stamp).metadata();
    const stampW = stampMeta.width ?? qrSize + pad * 2;
    const stampH = stampMeta.height ?? qrSize + pad * 2;
    const left = Math.max(0, width - stampW - margin);
    const top = Math.max(0, height - stampH - margin);

    const composited = await sharp(flyerBytes)
      .composite([{ input: stamp, left, top }])
      .png()
      .toBuffer();

    return composited.toString("base64");
  } catch {
    return null;
  }
}
