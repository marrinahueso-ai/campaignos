import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sharp from "sharp";

import { resolveFlyerComposerQrUrl } from "@/lib/flyer-composer/qr-code";
import { compositeFlyerQrCode } from "@/lib/flyer-composer/qr-composite";
import {
  FLYER_QR_SLOT_FRACTION,
  resolveFlyerQrStampRect,
} from "@/lib/flyer-composer/qr-layout";
import { findFlyerQrPlaceholderSlot } from "@/lib/flyer-composer/qr-slot";
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

  it("finds a large white QR placeholder in the bottom-right", async () => {
    const width = 512;
    const height = 768;
    const slotSize = 140;
    const slotLeft = width - slotSize - 24;
    const slotTop = height - slotSize - 28;

    const flyer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 20, g: 40, b: 80 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: slotSize,
              height: slotSize,
              channels: 3,
              background: { r: 255, g: 255, b: 255 },
            },
          })
            .png()
            .toBuffer(),
          left: slotLeft,
          top: slotTop,
        },
      ])
      .png()
      .toBuffer();

    const found = await findFlyerQrPlaceholderSlot(flyer);
    assert.ok(found);
    assert.ok(Math.abs(found!.size - slotSize) <= 8, `size ${found!.size}`);
    assert.ok(Math.abs(found!.left - slotLeft) <= 8, `left ${found!.left}`);
    assert.ok(Math.abs(found!.top - slotTop) <= 8, `top ${found!.top}`);
  });

  it("stamps a fixed-size square QR in the lower-right on every flyer", async () => {
    const width = 512;
    const height = 768;
    const rect = resolveFlyerQrStampRect(width, height);
    assert.equal(rect.boxSize, Math.max(48, Math.round(Math.min(width, height) * FLYER_QR_SLOT_FRACTION)));

    const flyer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 20, g: 40, b: 80 },
      },
    })
      .png()
      .toBuffer();

    const composited = await compositeFlyerQrCode({
      imageBase64: flyer.toString("base64"),
      qrUrl: "https://www.facebook.com/HeyRalli/",
    });
    assert.ok(composited);

    const { data, info } = await sharp(Buffer.from(composited!, "base64"))
      .raw()
      .toBuffer({ resolveWithObject: true });

    let darkInSlot = 0;
    let whiteInSlot = 0;
    for (let y = rect.top; y < rect.top + rect.boxSize; y += 1) {
      for (let x = rect.left; x < rect.left + rect.boxSize; x += 1) {
        const i = (y * info.width + x) * info.channels;
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        if (r < 40 && g < 40 && b < 40) darkInSlot += 1;
        if (r > 240 && g > 240 && b > 240) whiteInSlot += 1;
      }
    }

    const slotPixels = rect.boxSize * rect.boxSize;
    assert.ok(
      darkInSlot > slotPixels * 0.08,
      `expected QR modules in fixed box; dark=${darkInSlot}`,
    );
    // White square + QR quiet zone (antialiased modules leave some mid grays).
    assert.ok(
      darkInSlot + whiteInSlot > slotPixels * 0.55,
      `expected most of fixed box covered; covered=${darkInSlot + whiteInSlot}`,
    );

    // Lower-right corners of the painted white square should stay bright.
    const corner = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    };
    assert.ok(corner(rect.left + 1, rect.top + 1) > 240);
    assert.ok(
      corner(rect.left + rect.boxSize - 2, rect.top + rect.boxSize - 2) > 200,
    );
  });

  it("uses the same stamp rect for equal shorter sides", () => {
    const a = resolveFlyerQrStampRect(1024, 1536);
    const b = resolveFlyerQrStampRect(1024, 1792);
    assert.equal(a.boxSize, b.boxSize);
    assert.equal(a.margin, b.margin);
  });
});
