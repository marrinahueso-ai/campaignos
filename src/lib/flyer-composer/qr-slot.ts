import sharp from "sharp";

export type FlyerQrSlot = {
  left: number;
  top: number;
  size: number;
};

function isNearWhite(r: number, g: number, b: number): boolean {
  // AI placeholders are usually pure / near-pure white.
  return r >= 242 && g >= 242 && b >= 242;
}

/**
 * Find the largest near-white square in the bottom-right of a flyer —
 * the blank QR placeholder left by the image model.
 */
export async function findFlyerQrPlaceholderSlot(
  flyerBytes: Buffer,
): Promise<FlyerQrSlot | null> {
  const { data, info } = await sharp(flyerBytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = info.channels;
  if (w < 64 || h < 64) return null;

  const x0 = Math.floor(w * 0.4);
  const y0 = Math.floor(h * 0.5);
  const minSize = Math.round(Math.min(w, h) * 0.07);
  const maxSize = Math.round(Math.min(w, h) * 0.32);

  const white = new Uint8Array(w * h);
  for (let y = y0; y < h; y += 1) {
    for (let x = x0; x < w; x += 1) {
      const i = (y * w + x) * channels;
      if (isNearWhite(data[i]!, data[i + 1]!, data[i + 2]!)) {
        white[y * w + x] = 1;
      }
    }
  }

  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));
  for (let y = 1; y <= h; y += 1) {
    let row = 0;
    for (let x = 1; x <= w; x += 1) {
      row += white[(y - 1) * w + (x - 1)]!;
      integral[y * stride + x] = integral[(y - 1) * stride + x]! + row;
    }
  }

  const rectSum = (x: number, y: number, size: number): number => {
    const x2 = x + size;
    const y2 = y + size;
    return (
      integral[y2 * stride + x2]! -
      integral[y * stride + x2]! -
      integral[y2 * stride + x]! +
      integral[y * stride + x]!
    );
  };

  const step = Math.max(2, Math.round(Math.min(w, h) / 256));
  for (let size = maxSize; size >= minSize; size -= step) {
    const need = size * size * 0.9;
    for (let y = y0; y <= h - size; y += step) {
      for (let x = x0; x <= w - size; x += step) {
        if (rectSum(x, y, size) < need) continue;

        // Nudge to the densest nearby white square at this size.
        let bestX = x;
        let bestY = y;
        let bestSum = rectSum(x, y, size);
        for (let dy = -step; dy <= step; dy += 1) {
          for (let dx = -step; dx <= step; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < x0 || ny < y0 || nx + size > w || ny + size > h) continue;
            const sum = rectSum(nx, ny, size);
            if (sum > bestSum) {
              bestSum = sum;
              bestX = nx;
              bestY = ny;
            }
          }
        }
        if (bestSum >= need) {
          return { left: bestX, top: bestY, size };
        }
      }
    }
  }

  return null;
}
