import sharp from "sharp";

import { generateFlyerQrPng, isFlyerQrTarget } from "@/lib/flyer-composer/qr-code";
import { findFlyerQrPlaceholderSlot } from "@/lib/flyer-composer/qr-slot";

/**
 * Overlay a scannable QR code onto the flyer’s blank white QR placeholder.
 * Falls back to bottom-right if no white square is detected.
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

    const slot = await findFlyerQrPlaceholderSlot(flyerBytes);

    let left: number;
    let top: number;
    let qrSize: number;
    let cover: { left: number; top: number; size: number } | null = null;

    if (slot) {
      // Fill the AI white box — small inset keeps a clean edge inside rounded corners.
      const inset = Math.max(2, Math.round(slot.size * 0.05));
      qrSize = Math.max(48, slot.size - inset * 2);
      left = slot.left + inset;
      top = slot.top + inset;
      cover = slot;
    } else {
      qrSize = Math.round(Math.min(width, height) * 0.14);
      const margin = Math.round(Math.min(width, height) * 0.03);
      left = Math.max(0, width - qrSize - margin);
      top = Math.max(0, height - qrSize - margin);
    }

    const qrPng = await generateFlyerQrPng(qrUrl, qrSize);
    if (!qrPng) return null;

    // Use a tight quiet zone — the white box already provides padding.
    const stamp = await sharp(qrPng)
      .resize(qrSize, qrSize, { fit: "fill" })
      .png()
      .toBuffer();

    const layers: sharp.OverlayOptions[] = [];
    if (cover) {
      // Re-paint the placeholder solid white so any leftover empty area matches.
      const whiteBox = await sharp({
        create: {
          width: cover.size,
          height: cover.size,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();
      layers.push({ input: whiteBox, left: cover.left, top: cover.top });
    }
    layers.push({ input: stamp, left, top });

    const composited = await sharp(flyerBytes)
      .composite(layers)
      .png()
      .toBuffer();

    return composited.toString("base64");
  } catch {
    return null;
  }
}
