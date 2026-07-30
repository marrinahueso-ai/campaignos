import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFlyerComposerSlotsSystemPrompt,
  buildFlyerComposerSlotsUserPrompt,
  parseFlyerComposerSlotsJson,
  summarizeFlyerComposerDirection,
} from "@/lib/flyer-composer/generate-slots-prompt";

const baseInput = {
  start: {
    path: "proven" as const,
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
  assets: {
    inspirationPhotoPresent: true,
    inspirationPhotoSource: "sample" as const,
    inspirationPhotoLabel: "Festival lawn",
    inspirationPhotoNote: "Sample stock photo selected for hero slot — image bytes not sent in v1.",
    customTemplatePresent: false,
    customTemplateFileName: null,
    customTemplateFileType: null,
    customTemplateNote: null,
  },
  brandEnabled: true,
  brandKit: {
    organizationShortName: "Sample PTA",
    primaryColor: "#2F4A3C",
    accentColor: "#C4922E",
    fontStyle: "Modern",
    mascotLabel: "Eagles",
    ptoLogoUploaded: true,
    schoolLogoUploaded: false,
    logoDisplay: "lettermark" as const,
  },
  fields: {
    headline: "Fall 2026 calendar",
    lastYearNotes: "Update dates for new school year",
    datesEvents: "Aug 15 — Back to School Night",
    ctaUrl: "https://example.org/calendar",
  },
};

describe("flyer composer slot prompts", () => {
  it("system prompt enforces template lock", () => {
    const prompt = buildFlyerComposerSlotsSystemPrompt();
    assert.match(prompt, /template-locked/);
    assert.match(prompt, /ONLY valid JSON/);
  });

  it("user prompt includes start path, assets, brand, and all slot sections", () => {
    const prompt = buildFlyerComposerSlotsUserPrompt(
      baseInput,
      "Sample Elementary PTA",
      "Warm, welcoming",
    );

    assert.match(prompt, /START/);
    assert.match(prompt, /Use a proven layout/);
    assert.match(prompt, /Semester at a Glance/);
    assert.match(prompt, /INSPIRATION ASSETS/);
    assert.match(prompt, /Festival lawn/);
    assert.match(prompt, /BRAND KIT/);
    assert.match(prompt, /Eagles/);
    assert.match(prompt, /Core identity/);
    assert.match(prompt, /When & where/);
    assert.match(prompt, /CTA & QR/);
    assert.match(prompt, /Update dates for new school year/);
    assert.match(prompt, /LOCKED/);
  });

  it("includes semester calendar rules for Semester at a Glance", () => {
    const prompt = buildFlyerComposerSlotsUserPrompt(
      baseInput,
      "Sample Elementary PTA",
      "Warm, welcoming",
    );

    assert.match(prompt, /datesEvents as newline-separated rows/);
    assert.match(prompt, /Never drop or summarize away multi-line date lists/);
  });

  it("includes custom template metadata when present", () => {
    const prompt = buildFlyerComposerSlotsUserPrompt(
      {
        ...baseInput,
        start: {
          path: "update",
          pathLabel: "Update last year's flyer",
          printSize: null,
          printSizeLabel: null,
        },
        template: {
          ...baseInput.template,
          templateId: "custom",
          templateName: "Last year's flyer",
          isCustom: true,
        },
        assets: {
          ...baseInput.assets,
          customTemplatePresent: true,
          customTemplateFileName: "2025-fall-festival.pdf",
          customTemplateFileType: "pdf",
          customTemplateNote: "Layout locked from upload",
        },
      },
      "Sample Elementary PTA",
      "Warm, welcoming",
    );

    assert.match(prompt, /2025-fall-festival.pdf/);
    assert.match(prompt, /Layout locked from upload/);
  });

  it("parses JSON slot object", () => {
    const parsed = parseFlyerComposerSlotsJson(
      '{"headline":"Hello","bodyCopy":"Details here","ctaLabel":"Sign up"}',
    );
    assert.deepEqual(parsed, {
      headline: "Hello",
      bodyCopy: "Details here",
      ctaLabel: "Sign up",
    });
  });

  it("summarizes direction for preview UI", () => {
    const lines = summarizeFlyerComposerDirection(baseInput);
    assert.ok(lines.some((line) => line.includes("Semester at a Glance")));
    assert.ok(lines.some((line) => line.includes("Brand kit: on")));
  });
});
