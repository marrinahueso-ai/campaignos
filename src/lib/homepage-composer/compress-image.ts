/**
 * Browser-side artwork compression for Homepage Composer uploads.
 * Chat / phone photos are often ~2MB+; we downscale + JPEG-encode so
 * volunteers never have to manually shrink a file first.
 */

export type CompressImageOptions = {
  /** Soft cap for the encoded binary (before base64). */
  maxBytes?: number;
  /** Longest edge after resize (1:1 cards do not need full camera resolution). */
  maxEdge?: number;
};

export type CompressImageResult = {
  dataUrl: string;
  /** Encoded binary size in bytes (not the data-URL string length). */
  byteLength: number;
  didCompress: boolean;
  originalBytes: number;
};

const DEFAULT_MAX_BYTES = Math.floor(650 * 1024);
const DEFAULT_MAX_EDGE = 1100;
const QUALITY_STEPS = [0.84, 0.76, 0.68, 0.6, 0.52, 0.44];

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read compressed image."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read that image."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through — Safari / HEIC / odd chat exports often need <img>.
    }
  }

  // Data URL keeps the decoded image usable after load (blob: URLs are
  // easy to revoke too early in Safari).
  const dataUrl = await fileToDataUrl(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () =>
      reject(
        new Error(
          "Could not open that image. Try exporting it as JPG or PNG first.",
        ),
      );
    el.src = dataUrl;
  });
}

function drawToCanvas(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image canvas.");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function scaledSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Compress an image file to a JPEG data URL under `maxBytes`.
 * Always re-encodes (photos from chat stay small enough for drafts + MTK paste).
 */
export async function compressImageForUpload(
  file: File,
  options: CompressImageOptions = {},
): Promise<CompressImageResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const originalBytes = file.size;

  const bitmap = await loadBitmap(file);
  const sourceWidth =
    "naturalWidth" in bitmap ? bitmap.naturalWidth || bitmap.width : bitmap.width;
  const sourceHeight =
    "naturalHeight" in bitmap
      ? bitmap.naturalHeight || bitmap.height
      : bitmap.height;

  if (!sourceWidth || !sourceHeight) {
    if ("close" in bitmap) bitmap.close();
    throw new Error("That image looks empty or damaged.");
  }

  let edge = maxEdge;
  let best: Blob | null = null;

  try {
    for (let pass = 0; pass < 4; pass += 1) {
      const { width, height } = scaledSize(sourceWidth, sourceHeight, edge);
      const canvas = drawToCanvas(bitmap, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToJpegBlob(canvas, quality);
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= maxBytes) {
          const dataUrl = await blobToDataUrl(blob);
          return {
            dataUrl,
            byteLength: blob.size,
            didCompress:
              blob.size < originalBytes ||
              file.type !== "image/jpeg" ||
              width < sourceWidth ||
              height < sourceHeight,
            originalBytes,
          };
        }
      }

      edge = Math.max(480, Math.round(edge * 0.72));
    }
  } finally {
    if ("close" in bitmap) bitmap.close();
  }

  if (!best) {
    throw new Error("Could not compress that image. Try a different file.");
  }

  // Last resort: return the smallest we managed (still better than rejecting).
  const dataUrl = await blobToDataUrl(best);
  return {
    dataUrl,
    byteLength: best.size,
    didCompress: true,
    originalBytes,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
