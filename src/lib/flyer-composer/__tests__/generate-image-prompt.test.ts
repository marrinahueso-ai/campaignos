import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSampleDirectionInput } from "@/lib/flyer-composer/direction-payload";
import {
  buildFlyerComposerImagePrompt,
  resolveFlyerComposerAiDirection,
  resolveFlyerComposerImageSize,
} from "@/lib/flyer-composer/generate-image-prompt";

describe("flyer composer image prompt", () => {
  it("leads with volunteer direction, then short event facts", () => {
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

    assert.match(prompt, /Volunteer direction/i);
    assert.match(prompt, /main brief/i);
    assert.match(prompt, /Bright back-to-school look/);
    assert.match(prompt, /Facts to include/i);
    assert.match(prompt, /Aug 15 — Back to School Night/);
    assert.match(prompt, /Sample PTA/);
    assert.match(prompt, /#2F4A3C/i);
    assert.doesNotMatch(prompt, /EVENT DETAILS/i);
    assert.doesNotMatch(prompt, /PRIMARY CREATIVE BRIEF/i);
    assert.doesNotMatch(prompt, /CONTENT TO RENDER ON THE FLYER/i);
    assert.doesNotMatch(prompt, /Body copy:/i);
    assert.doesNotMatch(prompt, /template.?lock|layout is LOCKED/i);

    const directionIdx = prompt.indexOf("Volunteer direction");
    const factsIdx = prompt.indexOf("Facts to include");
    assert.ok(directionIdx >= 0 && factsIdx > directionIdx);
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

  it("uses letter format for default new-flyer direction", () => {
    const input = buildSampleDirectionInput();
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /US Letter 8\.5×11 inch portrait/i);
    assert.match(prompt, /Bright back-to-school look/);
    assert.doesNotMatch(prompt, /Optional layout guide: Semester/i);
  });

  it("keeps direction and dates for proven semester without layout-lock essay", () => {
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

    assert.match(prompt, /Month boxes for the semester/);
    assert.match(prompt, /Aug 15 — Back to School Night/);
    assert.doesNotMatch(prompt, /layout is LOCKED/i);
    assert.doesNotMatch(prompt, /Optional layout guide/i);
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
    assert.match(prompt, /not a square social crop/i);
    assert.match(prompt, /full-bleed|edge-to-edge/i);
    assert.match(prompt, /no white borders/i);
  });

  it("treats attached photo as hero/mood and asks for a full designed flyer", () => {
    const input = buildSampleDirectionInput({
      fields: {
        aiDirection:
          "Friday night lights for our elementary school — food trucks, bounce houses, dunk tanks. Bring blankets and chairs.",
      },
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /Attached image/i);
    assert.match(prompt, /hero|background|mood/i);
    assert.match(prompt, /not a bare photograph/i);
    assert.match(prompt, /activity callouts|activities/i);
    assert.match(prompt, /Friday night lights/i);
  });

  it("instructs brand/typography when no inspiration photo", () => {
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
      fields: {
        aiDirection: "",
        bodyCopy: "",
        lastYearNotes: "",
      },
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /No reference photo/i);
    assert.match(prompt, /avoid generic stock crowd/i);
    assert.doesNotMatch(prompt, /Inspiration photo: none/i);
  });

  it("includes QR overlay instructions when QR URL is set", () => {
    const input = buildSampleDirectionInput({
      fields: {
        qrUrl: "https://example.org/calendar",
        qrCaption: "Scan to add dates",
      },
    });
    const prompt = buildFlyerComposerImagePrompt(input);

    assert.match(prompt, /QR/i);
    assert.match(prompt, /white square|overlay/i);
    assert.match(prompt, /Do NOT draw QR/i);
    assert.match(prompt, /stamps a real scannable QR/i);
    assert.match(prompt, /Scan to add dates/);
    assert.match(prompt, /postage-stamp|10–12%|~11%|exactly ~11%/i);
  });

  it("bans comic emphasis rays beside typography", () => {
    const prompt = buildFlyerComposerImagePrompt(buildSampleDirectionInput());
    assert.match(prompt, /speed lines|emphasis rays|starbursts/i);
  });
});
