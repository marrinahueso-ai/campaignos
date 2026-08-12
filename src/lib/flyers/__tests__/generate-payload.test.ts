import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFlyerGeneratePayload,
  printSizeLabel,
  templateForPrintSize,
} from "@/lib/flyers/generate-payload";

describe("flyer generate-payload", () => {
  it("maps letter and half templates with landscape half label", () => {
    assert.equal(printSizeLabel("letter"), "Letter (8.5×11)");
    assert.equal(printSizeLabel("half"), "Half (8.5×5.5)");
    assert.equal(templateForPrintSize("letter").templateId, "simple-letter");
    assert.equal(templateForPrintSize("half").templateId, "simple-half");
    assert.equal(templateForPrintSize("half").ratio, "8.5/5.5");
  });

  it("builds a new-path generate body with image-only inspiration and previous flyer", () => {
    const payload = buildFlyerGeneratePayload({
      printSize: "half",
      aiDirection: "Warm backyard BBQ look",
      title: "Welcome BBQ",
      qrEnabled: true,
      qrUrl: "https://example.org/bbq",
      brandEnabled: true,
      brandKit: {
        organizationShortName: "Ralli PTA",
        primaryColor: "#2F4A3C",
        accentColor: "#C4922E",
        fontStyle: "Modern",
        mascotLabel: "Eagles",
        ptoLogoUploaded: true,
        schoolLogoUploaded: false,
        logos: [
          {
            id: "pto",
            label: "PTO logo",
            url: "https://cdn.example/logo.png",
          },
        ],
      },
      selectedLogoId: "pto",
      inspirationPhotoUrl: "data:image/png;base64,abc",
      inspirationPhotoSource: "upload",
      inspirationPhotoLabel: "Picnic photo",
      previousFlyerUrl: "https://cdn.example/prev.png",
    });

    assert.equal(payload.start.path, "new");
    assert.equal(payload.start.printSize, "half");
    assert.equal(payload.start.printSizeLabel, "Half (8.5×5.5)");
    assert.equal(payload.template.templateId, "simple-half");
    assert.equal(payload.template.hasQr, true);
    assert.equal(payload.assets.inspirationPhotoPresent, true);
    assert.equal(payload.assets.inspirationPhotoSource, "upload");
    assert.equal(payload.assets.customTemplatePresent, true);
    assert.equal(payload.assets.customTemplateFileType, "image");
    assert.equal(
      payload.assets.customTemplateImageUrl,
      "https://cdn.example/prev.png",
    );
    assert.equal(payload.brandEnabled, true);
    assert.equal(payload.brandKit?.selectedLogoUrl, "https://cdn.example/logo.png");
    assert.equal(payload.fields.aiDirection, "Warm backyard BBQ look");
    assert.equal(payload.fields.qrUrl, "https://example.org/bbq");
    assert.equal(payload.fields.headline, "Welcome BBQ");
  });

  it("appends refine direction for Edit with AI and ignores non-image previous urls", () => {
    const payload = buildFlyerGeneratePayload({
      printSize: "letter",
      aiDirection: "Base direction",
      editDirection: "Make the QR larger",
      qrEnabled: false,
      brandEnabled: false,
      previousFlyerUrl: "data:application/pdf;base64,aaa",
    });

    assert.match(payload.fields.aiDirection ?? "", /Refine: Make the QR larger/);
    assert.equal(payload.assets.customTemplatePresent, false);
    assert.equal(payload.assets.customTemplateImageUrl, null);
    assert.equal(payload.template.hasQr, false);
    assert.equal(payload.fields.qrUrl, "");
  });
});

