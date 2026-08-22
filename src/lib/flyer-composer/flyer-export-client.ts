import type { FlyerPrintSize } from "@/lib/flyers/types";
import {
  buildHalfPagePrintHtml,
  composeHalfPageLetterSheetPngBlob,
} from "@/lib/flyer-composer/half-page-sheet";

async function downloadPng(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadFlyerExport(input: {
  imageUrl: string;
  filenameBase: string;
  printSize: FlyerPrintSize;
}) {
  const safeBase =
    input.filenameBase.replace(/\s+/g, "-").toLowerCase() || "flyer";
  if (input.printSize === "half") {
    const sheetBlob = await composeHalfPageLetterSheetPngBlob(input.imageUrl);
    const objectUrl = URL.createObjectURL(sheetBlob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${safeBase}-letter-2up.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }
  await downloadPng(input.imageUrl, `${safeBase}.png`);
}

function buildSinglePagePrintHtml(
  imageUrl: string,
  page: { width: string; height: string },
): string {
  const safe = imageUrl.replace(/"/g, "&quot;");
  return `<!doctype html><html><head><title>Print flyer</title>
<style>
  @page { size: ${page.width} ${page.height}; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { display: block; width: ${page.width}; height: ${page.height}; object-fit: fill; }
</style>
</head>
<body>
  <img src="${safe}" alt="Flyer" onload="window.focus();window.print();" />
</body></html>`;
}

export function printFlyerExport(imageUrl: string, printSize: FlyerPrintSize) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  if (printSize === "half") {
    popup.document.write(buildHalfPagePrintHtml(imageUrl));
  } else if (printSize === "school_poster") {
    popup.document.write(
      buildSinglePagePrintHtml(imageUrl, { width: "11in", height: "17in" }),
    );
  } else if (printSize === "event_poster") {
    popup.document.write(
      buildSinglePagePrintHtml(imageUrl, { width: "18in", height: "24in" }),
    );
  } else {
    popup.document.write(
      `<!doctype html><html><head><title>Print flyer</title></head><body style="margin:0;background:#fff;display:flex;justify-content:center;"><img src="${imageUrl.replace(/"/g, "&quot;")}" alt="Flyer" style="max-width:100%;height:auto;" onload="window.focus();window.print();" /></body></html>`,
    );
  }
  popup.document.close();
}

export async function saveFlyerToEventFiles(input: {
  eventId: string;
  imageUrl: string;
  title: string | null;
  versionId?: string | null;
}): Promise<{ ok: true; message: string; filesHref: string | null } | { ok: false; error: string }> {
  const response = await fetch("/api/flyer-composer/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: input.eventId,
      imageUrl: input.imageUrl,
      headline: input.title,
      title: input.title,
      versionId: input.versionId ?? null,
    }),
  });
  const data = (await response.json()) as {
    success?: boolean;
    message?: string;
    error?: string;
    filesHref?: string | null;
  };
  if (!response.ok || !data.success) {
    return {
      ok: false,
      error: data.error || data.message || "Couldn’t save to Files.",
    };
  }
  return {
    ok: true,
    message:
      data.message ||
      (data.filesHref
        ? "Saved to the event’s Files tab."
        : "Saved to Files."),
    filesHref: data.filesHref ?? null,
  };
}
