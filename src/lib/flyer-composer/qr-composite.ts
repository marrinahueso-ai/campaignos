import sharp from "sharp";

import { generateFlyerQrPng, isFlyerQrTarget } from "@/lib/flyer-composer/qr-code";
import { resolveFlyerQrStampRect } from "@/lib/flyer-composer/qr-layout";

/**
 * Overlay a scannable QR on a fixed lower-right white square.
 * Size and position are deterministic so every flyer gets the same QR footprint.
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

    const rect = resolveFlyerQrStampRect(width, height);
    const inset = Math.max(2, Math.round(rect.boxSize * 0.06));
    const qrSize = Math.max(40, rect.boxSize - inset * 2);
    const left = rect.left + inset;
    const top = rect.top + inset;

    const qrPng = await generateFlyerQrPng(qrUrl, qrSize);
    if (!qrPng) return null;

    const stamp = await sharp(qrPng)
      .resize(qrSize, qrSize, { fit: "fill" })
      .png()
      .toBuffer();

    const whiteBox = await sharp({
      create: {
        width: rect.boxSize,
        height: rect.boxSize,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const composited = await sharp(flyerBytes)
      .composite([
        { input: whiteBox, left: rect.left, top: rect.top },
        { input: stamp, left, top },
      ])
      .png()
      .toBuffer();

    return composited.toString("base64");
  } catch {
    return null;
  }
}
