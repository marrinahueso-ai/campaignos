/**
 * Half (8.5×5.5) flyers are generated as a single landscape image.
 * At download / print time only, stack two copies on one US Letter page.
 */

export const HALF_PAGE_SHEET_COPIES = 2 as const;

/** Letter sheet layout for stacking two 8.5×5.5 halves (exact 8.5×11 fit). */
export function halfPageSheetLayout(sheetWidthPx: number): {
  sheetWidthPx: number;
  sheetHeightPx: number;
  halfHeights: [number, number];
  copies: typeof HALF_PAGE_SHEET_COPIES;
} {
  const width = Math.max(1, Math.round(sheetWidthPx));
  const sheetHeightPx = Math.round((width * 11) / 8.5);
  const topHalf = Math.floor(sheetHeightPx / 2);
  const bottomHalf = sheetHeightPx - topHalf;
  return {
    sheetWidthPx: width,
    sheetHeightPx,
    halfHeights: [topHalf, bottomHalf],
    copies: HALF_PAGE_SHEET_COPIES,
  };
}

/**
 * Build a Letter-page PNG with the same half-page flyer drawn twice (top + bottom).
 * Does not change AI generation — call only from export / print.
 */
export async function composeHalfPageLetterSheetPngBlob(
  imageUrl: string,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Half-page sheet export requires a browser.");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Could not download flyer image.");
  }
  const sourceBlob = await response.blob();
  const bitmap = await createImageBitmap(sourceBlob);

  try {
    const sheetWidth = Math.max(bitmap.width, 1700);
    const layout = halfPageSheetLayout(sheetWidth);
    const canvas = document.createElement("canvas");
    canvas.width = layout.sheetWidthPx;
    canvas.height = layout.sheetHeightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not prepare print sheet.");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 0;
    for (let i = 0; i < layout.copies; i += 1) {
      const height = layout.halfHeights[i]!;
      ctx.drawImage(bitmap, 0, y, layout.sheetWidthPx, height);
      y += height;
    }

    // Light cut guide between the two halves (does not alter the artwork).
    const cutY = layout.halfHeights[0]! + 0.5;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cutY);
    ctx.lineTo(layout.sheetWidthPx, cutY);
    ctx.stroke();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Could not build print sheet.")),
        "image/png",
      );
    });
    return blob;
  } finally {
    bitmap.close();
  }
}

/** Print HTML: two half flyers stacked on a Letter page (export only). */
export function buildHalfPagePrintHtml(imageUrl: string): string {
  const safe = imageUrl.replace(/"/g, "&quot;");
  return `<!doctype html>
<html>
<head>
  <title>Print flyer</title>
  <style>
    @page { size: letter; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .sheet {
      width: 8.5in;
      height: 11in;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
    }
    .sheet img {
      display: block;
      width: 8.5in;
      height: 5.5in;
      object-fit: fill;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <img src="${safe}" alt="Flyer (top half)" />
    <img src="${safe}" alt="Flyer (bottom half)" />
  </div>
  <script>
    (function () {
      var imgs = document.images;
      var left = imgs.length;
      function maybePrint() {
        left -= 1;
        if (left <= 0) {
          window.focus();
          window.print();
        }
      }
      for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].complete) maybePrint();
        else imgs[i].onload = maybePrint;
      }
    })();
  </script>
</body>
</html>`;
}
