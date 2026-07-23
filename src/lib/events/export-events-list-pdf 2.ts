/**
 * Client-side PDF export for the Events home list view.
 * Uses html2canvas (already in the app) + a minimal JPEG-page PDF writer.
 */

export type EventsListPdfRow = {
  title: string;
  typeLabel: string | null;
  dateTime: string;
  statusLabel: string;
  assignee: string | null;
  imageUrl: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export function eventStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Filename like events-next-month-2026-07-23.pdf */
export function buildEventsListPdfFilename(input: {
  monthFilter: string;
  today: string;
}): string {
  const raw =
    input.monthFilter === "all"
      ? "all"
      : input.monthFilter.replace(/_/g, "-");
  const slug = raw.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "filtered";
  return `events-${slug}-${input.today}.pdf`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExportMarkup(
  rows: EventsListPdfRow[],
  subtitle: string,
): string {
  const items = rows
    .map((row) => {
      const thumb = row.imageUrl
        ? `<img class="thumb" src="${escapeHtml(row.imageUrl)}" alt="" crossorigin="anonymous" />`
        : `<div class="thumb placeholder" aria-hidden="true"></div>`;
      const type = row.typeLabel
        ? `<span class="badge">${escapeHtml(row.typeLabel)}</span>`
        : "";
      const assignee = row.assignee
        ? `<span class="assignee">${escapeHtml(row.assignee)}</span>`
        : "";
      return `
        <article class="row">
          ${thumb}
          <div class="body">
            <div class="title-line">
              <span class="title">${escapeHtml(row.title)}</span>
              ${type}
            </div>
            <p class="meta">${escapeHtml(row.dateTime)}</p>
          </div>
          <span class="status">${escapeHtml(row.statusLabel)}</span>
          ${assignee}
        </article>
      `;
    })
    .join("");

  return `
    <div class="sheet">
      <header class="header">
        <h1>All Events</h1>
        <p>${escapeHtml(subtitle)}</p>
      </header>
      <div class="list">${items}</div>
    </div>
  `;
}

function createPlaceholderThumb(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "thumb placeholder";
  el.setAttribute("aria-hidden", "true");
  return el;
}

async function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), "image/jpeg", 0.86),
  );
  if (!blob) {
    throw new Error("Could not encode PDF page image.");
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/** Slice a tall canvas into letter-sized page canvases (top → bottom). */
function sliceCanvasIntoPages(
  source: HTMLCanvasElement,
  pageHeightPx: number,
): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  const width = source.width;
  const totalHeight = source.height;
  let offsetY = 0;

  while (offsetY < totalHeight) {
    const sliceHeight = Math.min(pageHeightPx, totalHeight - offsetY);
    const page = document.createElement("canvas");
    page.width = width;
    page.height = sliceHeight;
    const ctx = page.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create PDF page canvas.");
    }
    ctx.fillStyle = "#f6f2eb";
    ctx.fillRect(0, 0, width, sliceHeight);
    ctx.drawImage(
      source,
      0,
      offsetY,
      width,
      sliceHeight,
      0,
      0,
      width,
      sliceHeight,
    );
    pages.push(page);
    offsetY += sliceHeight;
  }

  return pages.length > 0 ? pages : [source];
}

function buildPdfFromJpegPages(
  pages: Array<{ jpeg: Uint8Array; width: number; height: number }>,
): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let size = 0;

  const appendBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    size += bytes.length;
  };
  const appendText = (text: string) => {
    appendBytes(encoder.encode(text));
  };

  const objectOffsets: number[] = [];
  const markObject = () => {
    objectOffsets.push(size);
  };

  appendText("%PDF-1.4\n");

  markObject();
  appendText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  const pageObjectNumbers = pages.map((_, index) => 3 + index * 3);
  markObject();
  appendText(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers
      .map((n) => `${n} 0 R`)
      .join(" ")}] /Count ${pages.length} >>\nendobj\n`,
  );

  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i]!;
    const pageObj = 3 + i * 3;
    const contentObj = pageObj + 1;
    const imageObj = pageObj + 2;

    const pageWidthPt = 612;
    const pageHeightPt = 792;
    const scale = Math.min(
      pageWidthPt / page.width,
      pageHeightPt / page.height,
    );
    const drawWidth = page.width * scale;
    const drawHeight = page.height * scale;
    const offsetX = (pageWidthPt - drawWidth) / 2;
    const offsetY = pageHeightPt - drawHeight;

    markObject();
    appendText(
      `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Contents ${contentObj} 0 R /Resources << /XObject << /Im${i} ${imageObj} 0 R >> >> >>\nendobj\n`,
    );

    const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${offsetX.toFixed(2)} ${offsetY.toFixed(2)} cm\n/Im${i} Do\nQ\n`;
    markObject();
    appendText(
      `${contentObj} 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`,
    );

    markObject();
    appendText(
      `${imageObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    appendBytes(page.jpeg);
    appendText("\nendstream\nendobj\n");
  }

  const xrefStart = size;
  const objectCount = objectOffsets.length + 1;
  appendText(`xref\n0 ${objectCount}\n`);
  appendText("0000000000 65535 f \n");
  for (const offset of objectOffsets) {
    appendText(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }
  appendText(
    `trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  const merged = new Uint8Array(size);
  let cursor = 0;
  for (const chunk of chunks) {
    merged.set(chunk, cursor);
    cursor += chunk.length;
  }
  return new Blob([merged], { type: "application/pdf" });
}

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const fail = () => {
            img.replaceWith(createPlaceholderThumb());
            resolve();
          };
          if (img.complete) {
            if (!img.naturalWidth) {
              fail();
              return;
            }
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = fail;
        }),
    ),
  ).then(() => undefined);
}

export async function downloadEventsListPdf(input: {
  rows: EventsListPdfRow[];
  filename: string;
  filterLabel: string;
}): Promise<void> {
  if (input.rows.length === 0) {
    throw new Error("No events to export.");
  }
  if (typeof document === "undefined") {
    throw new Error("PDF export requires a browser.");
  }

  const html2canvas = (await import("html2canvas")).default;
  const host = document.createElement("div");
  host.setAttribute("data-events-pdf-export", "true");
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;width:800px;pointer-events:none;z-index:-1;";

  const style = document.createElement("style");
  style.textContent = `
    [data-events-pdf-export] .sheet {
      box-sizing: border-box;
      width: 800px;
      padding: 28px 32px 36px;
      background: #f6f2eb;
      color: #2a2622;
      font-family: Georgia, "Times New Roman", serif;
    }
    [data-events-pdf-export] .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    [data-events-pdf-export] .header p {
      margin: 6px 0 20px;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 12px;
      color: #5c554c;
    }
    [data-events-pdf-export] .list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    [data-events-pdf-export] .row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border: 1px solid #ddd4c8;
      border-radius: 12px;
      background: #fffcf7;
    }
    [data-events-pdf-export] .thumb {
      width: 56px;
      height: 56px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
      background: #ebe4d9;
    }
    [data-events-pdf-export] .thumb.placeholder {
      background: linear-gradient(145deg, #ebe4d9, #ddd4c8);
    }
    [data-events-pdf-export] .body {
      flex: 1;
      min-width: 0;
    }
    [data-events-pdf-export] .title-line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    [data-events-pdf-export] .title {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #2a2622;
    }
    [data-events-pdf-export] .badge {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 10px;
      color: #5c554c;
      background: #f6f2eb;
      border-radius: 999px;
      padding: 2px 8px;
    }
    [data-events-pdf-export] .meta {
      margin: 4px 0 0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 12px;
      color: #5c554c;
    }
    [data-events-pdf-export] .status {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: #2a2622;
      background: #ebe4d9;
      border-radius: 999px;
      padding: 4px 10px;
      white-space: nowrap;
    }
    [data-events-pdf-export] .assignee {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #2a2622;
      min-width: 110px;
      text-align: right;
    }
  `;

  host.innerHTML = buildExportMarkup(
    input.rows,
    `${input.filterLabel} · ${input.rows.length} ${input.rows.length === 1 ? "event" : "events"}`,
  );
  document.body.appendChild(style);
  document.body.appendChild(host);

  try {
    await waitForImages(host);
    const sheet = host.querySelector(".sheet");
    if (!(sheet instanceof HTMLElement)) {
      throw new Error("Could not build PDF layout.");
    }

    const captureOptions = {
      logging: false,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#f6f2eb",
      scale: 2,
      imageTimeout: 4000,
    } as const;

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(sheet, captureOptions);
    } catch {
      // CORS-tainted artwork: fall back to placeholders and retry once.
      sheet.querySelectorAll("img.thumb").forEach((img) => {
        img.replaceWith(createPlaceholderThumb());
      });
      canvas = await html2canvas(sheet, captureOptions);
    }

    // Approximate letter aspect for the 800px-wide sheet at capture scale.
    const pageHeightPx = Math.round(canvas.width * (11 / 8.5));
    const pageCanvases = sliceCanvasIntoPages(canvas, pageHeightPx);
    const jpegPages = await Promise.all(
      pageCanvases.map(async (pageCanvas) => ({
        jpeg: await canvasToJpegBytes(pageCanvas),
        width: pageCanvas.width,
        height: pageCanvas.height,
      })),
    );

    const pdfBlob = buildPdfFromJpegPages(jpegPages);
    const url = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = input.filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } finally {
    host.remove();
    style.remove();
  }
}
