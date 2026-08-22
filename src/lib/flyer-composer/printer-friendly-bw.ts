/**
 * Deterministic printer-friendly B&W from an existing flyer PNG.
 * Client-only; never calls AI or writes a new flyer version.
 */

const PAPER_WHITE = 200;
/** Brand forest / navy headlines crush to copier black; photos stay above this. */
const INK_BLACK = 105;

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * In-place RGBA transform: lift pale fills to paper white, crush ink to black,
 * keep midtones as grayscale for photos/illustrations. QR modules (near-black
 * on pale quiet zones) become true black/white.
 */
export function applyPrinterFriendlyBw(data: Uint8ClampedArray): void {
  const span = PAPER_WHITE - INK_BLACK;
  for (let i = 0; i < data.length; i += 4) {
    const L = luma(data[i]!, data[i + 1]!, data[i + 2]!);
    let g: number;
    if (L >= PAPER_WHITE) {
      g = 255;
    } else if (L <= INK_BLACK) {
      g = 0;
    } else {
      const t = (L - INK_BLACK) / span;
      const s = t * t * (3 - 2 * t);
      g = Math.round(s * 255);
    }
    data[i] = g;
    data[i + 1] = g;
    data[i + 2] = g;
  }
}

export async function composePrinterFriendlyBwPngBlob(
  imageUrl: string,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Printer-friendly export requires a browser.");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Could not load flyer image.");
  }
  const sourceBlob = await response.blob();
  const bitmap = await createImageBitmap(sourceBlob);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not prepare printer-friendly preview.");
    }
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyPrinterFriendlyBw(image.data);
    ctx.putImageData(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Could not build printer-friendly image.")),
        "image/png",
      );
    });
  } finally {
    bitmap.close();
  }
}
