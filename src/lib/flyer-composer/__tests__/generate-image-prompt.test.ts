import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSampleDirectionInput } from "@/lib/flyer-composer/direction-payload";
import {
  buildFlyerComposerImagePrompt,
  resolveFlyerComposerAiDirection,
  resolveFlyerComposerImageSize,
} from "@/lib/flyer-composer/generate-image-prompt";

describe("flyer composer image prompt", () => {
  it("keeps event facts and a single freeform AI direction body", () => {
    const input = buildSampleDirectionInput({
      fields: {
        headline: "Back to School",
        datesEvents:
          "Aug 15 — Back to School Night\nSep 12 — Fall Festival\nJan 10 — Science Fair",
        aiDirection:
          "Bright back-to-school look with month boxes. Friendly and easy to scan.",
        bodyCopy: "",
        lastYearNotes: "",
      },
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /EVENT DETAILS/i);
    assert.match(prompt, /PRIMARY CREATIVE BRIEF/i);
    assert.match(prompt, /Artwork direction from the user/i);
    assert.match(prompt, /Bright back-to-school look/);
    assert.match(prompt, /prefer the artwork direction/i);
    assert.match(prompt, /Aug 15 — Back to School Night/);
    assert.match(prompt, /Sample PTA/);
    assert.match(prompt, /#2F4A3C/i);
    assert.doesNotMatch(prompt, /CONTENT TO RENDER ON THE FLYER/i);
    assert.doesNotMatch(prompt, /Body copy:/i);
  });

  it("resolves aiDirection with legacy bodyCopy fallback", () => {
    assert.equal(
      resolveFlyerComposerAiDirection({
        aiDirection: "Primary direction",
        bodyCopy: "Legacy body",
      }),
      "Primary direction",
    );
    assert.equal(
      resolveFlyerComposerAiDirection({
        aiDirection: "",
        bodyCopy: "Legacy body",
        lastYearNotes: "Update dates",
      }),
      "Legacy body\n\nUpdate dates",
    );
  });

  it("uses simple letter layout for default new-flyer direction", () => {
    const input = buildSampleDirectionInput();
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /US Letter|clean US Letter/i);
    assert.match(prompt, /New flyer/i);
    assert.doesNotMatch(prompt, /Optional layout guide: Semester/i);
  });

  it("mentions semester layout guide when proven semester is chosen", () => {
    const input = buildSampleDirectionInput({
      start: {
        path: "proven",
        pathLabel: "Use a proven layout",
        printSize: null,
        printSizeLabel: null,
      },
      template: {
        templateId: "semester",
        templateName: "Semester at a Glance",
        isCustom: false,
        ratio: "3/4",
        hasQr: true,
      },
      fields: {
        datesEvents: "Aug 15 — Back to School Night",
        aiDirection: "Month boxes for the semester.",
      },
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /semester calendar/i);
    assert.match(prompt, /Aug 15 — Back to School Night/);
  });

  it("uses portrait size for letter ratio and landscape for half page", () => {
    const letter = buildSampleDirectionInput();
    assert.equal(resolveFlyerComposerImageSize(letter), "1024x1536");

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
    assert.equal(resolveFlyerComposerImageSize(half), "1536x1024");
  });

  it("requires US Letter portrait format in the prompt", () => {
    const input = buildSampleDirectionInput();
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /US Letter 8\.5×11 inch portrait/i);
    assert.match(prompt, /not square/i);
    assert.match(prompt, /not Instagram/i);
  });

  it("instructs no stock hero photography when no inspiration photo", () => {
    const input = buildSampleDirectionInput({
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
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /Inspiration photo: none/i);
    assert.match(prompt, /Do NOT invent stock crowd/i);
  });

  it("includes QR placeholder instructions when QR URL is set", () => {
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
