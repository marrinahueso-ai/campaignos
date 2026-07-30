import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSampleDirectionInput } from "@/lib/flyer-composer/direction-payload";
import {
  buildFlyerComposerImagePrompt,
  resolveFlyerComposerImageSize,
} from "@/lib/flyer-composer/generate-image-prompt";

describe("flyer composer image prompt", () => {
  it("locks semester template to month-grid layout with full dates list", () => {
    const input = buildSampleDirectionInput({
      fields: {
        headline: "Back to School",
        datesEvents:
          "Aug 15 — Back to School Night\nSep 12 — Fall Festival\nJan 10 — Science Fair",
      },
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /SEMESTER AT A GLANCE/i);
    assert.match(prompt, /month/i);
    assert.match(prompt, /Aug 15 — Back to School Night/);
    assert.match(prompt, /Jan 10 — Science Fair/);
    assert.match(prompt, /Sample PTA/);
    assert.match(prompt, /#2F4A3C/i);
    assert.match(prompt, /never use placeholder org names/i);
  });

  it("locks investor template to donation tiers", () => {
    const input = buildSampleDirectionInput({
      template: {
        templateId: "investor",
        templateName: "Become an Investor",
        isCustom: false,
        ratio: "3/4",
        hasQr: true,
      },
      fields: {
        donationTiers: "$25 — Supporter\n$100 — Champion",
      },
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /BECOME AN INVESTOR/i);
    assert.match(prompt, /\$25 — Supporter/);
  });

  it("uses portrait size for letter ratio and landscape for half page", () => {
    const letter = buildSampleDirectionInput();
    assert.equal(resolveFlyerComposerImageSize(letter), "1024x1792");

    const half = buildSampleDirectionInput({
      start: {
        path: "new",
        pathLabel: "New flyer",
        printSize: "half",
        printSizeLabel: "Half page",
      },
      template: {
        templateId: "simple-half",
        templateName: "Simple flyer · Half page",
        isCustom: false,
        ratio: "3/2",
        hasQr: false,
      },
    });
    assert.equal(resolveFlyerComposerImageSize(half), "1792x1024");
  });

  it("includes QR placeholder instructions when template has QR", () => {
    const input = buildSampleDirectionInput({
      fields: {
        qrUrl: "https://example.org/calendar",
        qrCaption: "Scan to add dates",
      },
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /QR/i);
    assert.match(prompt, /placeholder/i);
    assert.match(prompt, /Scan to add dates/);
  });
});
