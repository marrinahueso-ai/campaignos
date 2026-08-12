import sharp from "sharp";

import { generateFlyerQrPng, isFlyerQrTarget } from "@/lib/flyer-composer/qr-code";
import { resolveFlyerQrStampRect } from "@/lib/flyer-composer/qr-layout";
import { findFlyerQrPlaceholderSlot } from "@/lib/flyer-composer/qr-slot";

/**
 * Overlay a scannable QR on a lower-right white square.
 * The QR fills the white box edge-to-edge (quiet zone is inside the QR PNG).
 * Prefer a detected AI placeholder in the lower-right when present so the
 * stamped code matches that box size; otherwise use the fixed stamp geometry.
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

    const fixed = resolveFlyerQrStampRect(width, height);
    let left = fixed.left;
    let top = fixed.top;
    let boxSize = fixed.boxSize;

    const detected = await findFlyerQrPlaceholderSlot(flyerBytes);
    if (detected) {
      const detectedRight = detected.left + detected.size;
      const detectedBottom = detected.top + detected.size;
      const overlapsFixed =
        detected.left < fixed.left + fixed.boxSize &&
        detectedRight > fixed.left &&
        detected.top < fixed.top + fixed.boxSize &&
        detectedBottom > fixed.top;
      const nearLowerRight =
        detectedRight >= width - Math.max(fixed.margin * 4, 24) &&
        detectedBottom >= height - Math.max(fixed.margin * 4, 24);
      if (overlapsFixed || nearLowerRight) {
        left = detected.left;
        top = detected.top;
        boxSize = detected.size;
      }
    }

    // QR PNG already includes a quiet zone (margin:1). Stamp at the same
    // size as the white box so the code fills the square.
    const qrSize = Math.max(40, boxSize);

    const qrPng = await generateFlyerQrPng(qrUrl, qrSize);
    if (!qrPng) return null;

    const stamp = await sharp(qrPng)
      .resize(qrSize, qrSize, { fit: "fill" })
      .png()
      .toBuffer();

    const whiteBox = await sharp({
      create: {
        width: boxSize,
        height: boxSize,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const composited = await sharp(flyerBytes)
      .composite([
        { input: whiteBox, left, top },
        { input: stamp, left, top },
      ])
      .png()
      .toBuffer();

    return composited.toString("base64");
  } catch {
    return null;
  }
}
