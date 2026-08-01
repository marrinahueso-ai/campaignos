import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sharp from "sharp";

import { resolveFlyerComposerQrUrl } from "@/lib/flyer-composer/qr-code";
import { compositeFlyerQrCode } from "@/lib/flyer-composer/qr-composite";
import type { FlyerComposerGenerateInput } from "@/lib/flyer-composer/types";

function sampleInput(
  patch: Partial<FlyerComposerGenerateInput> & {
    fields?: Partial<FlyerComposerGenerateInput["fields"]>;
    template?: Partial<FlyerComposerGenerateInput["template"]>;
  } = {},
): FlyerComposerGenerateInput {
  return {
    start: { path: "proven", pathLabel: "Proven", printSize: null, printSizeLabel: null },
    template: {
      templateId: "festival",
      templateName: "Event flyer",
      isCustom: false,
      ratio: "3/4",
      hasQr: false,
      ...patch.template,
    },
    assets: {
      inspirationPhotoPresent: false,
      inspirationPhotoSource: null,
      inspirationPhotoLabel: null,
      inspirationPhotoNote: null,
      inspirationPhotoUrl: null,
      customTemplatePresent: false,
      customTemplateFileName: null,
      customTemplateFileType: null,
      customTemplateNote: null,
      customTemplateImageUrl: null,
    },
    brandEnabled: false,
    brandKit: null,
    fields: {
      orgName: "",
      headline: "",
      schoolYear: "",
      location: "",
      directions: "",
      datesEvents: "",
      aiDirection: "",
      bodyCopy: "",
      donationTiers: "",
      ctaLabel: "",
      ctaUrl: "",
      qrUrl: "",
      qrCaption: "",
      footerLine: "",
      lastYearNotes: "",
      ...patch.fields,
    },
  };
}

describe("flyer QR resolve + composite", () => {
  it("resolves explicit qrUrl even when template.hasQr is false", () => {
    const url = resolveFlyerComposerQrUrl(
      sampleInput({
        fields: { qrUrl: "https://www.facebook.com/HeyRalli/" },
        template: { hasQr: false },
      }),
    );
    assert.equal(url, "https://www.facebook.com/HeyRalli/");
  });

  it("stamps a non-white QR onto a blank white corner", async () => {
    const blank = await sharp({
      create: {
        width: 512,
        height: 768,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const composited = await compositeFlyerQrCode({
      imageBase64: blank.toString("base64"),
      qrUrl: "https://www.facebook.com/HeyRalli/",
    });
    assert.ok(composited);

    const { data, info } = await sharp(Buffer.from(composited!, "base64"))
      .raw()
      .toBuffer({ resolveWithObject: true });

    let dark = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i]! < 40 && data[i + 1]! < 40 && data[i + 2]! < 40) dark += 1;
    }
    assert.ok(dark > 200, `expected QR dark modules, found ${dark}`);
  });
});
