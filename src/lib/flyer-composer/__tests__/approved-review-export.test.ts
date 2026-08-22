import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const review = readFileSync(
  new URL("../../../components/flyers/FlyerApproverReviewShell.tsx", import.meta.url),
  "utf8",
);
const builder = readFileSync(
  new URL("../../../components/flyers/FlyerBuilderShell.tsx", import.meta.url),
  "utf8",
);
const exportUi = readFileSync(
  new URL("../../../components/flyers/FlyerExportActions.tsx", import.meta.url),
  "utf8",
);
const bw = readFileSync(
  new URL("../printer-friendly-bw.ts", import.meta.url),
  "utf8",
);

describe("approved flyer review exports", () => {
  it("exposes download, print, and save-to-files after approval", () => {
    assert.match(review, /status === "approved"/);
    assert.match(review, /FlyerExportActions/);
    assert.match(review, /saveFlyerToEventFiles/);
    assert.match(review, /Save to Files/);
  });

  it("saves the original color flyer, not the B&W export", () => {
    assert.match(review, /imageUrl: previewImageUrl/);
    assert.doesNotMatch(review, /imageUrl: exportAppearance/);
  });
});

describe("printer-friendly B&W export UI", () => {
  it("offers Full Color and Printer-Friendly B&W without AI generate", () => {
    assert.match(exportUi, /Full Color/);
    assert.match(exportUi, /Printer-Friendly B&W/);
    assert.match(exportUi, /Printer-friendly version • No AI credits used/);
    assert.match(exportUi, /composePrinterFriendlyBwPngBlob/);
    assert.doesNotMatch(exportUi, /openai|flyer-composer\/generate|ai-credits/i);
    assert.doesNotMatch(bw, /openai|generate/i);
  });

  it("is wired into builder and approved review", () => {
    assert.match(builder, /FlyerExportActions/);
    assert.match(builder, /useFlyerExportAppearance/);
    assert.match(review, /useFlyerExportAppearance/);
  });
});
