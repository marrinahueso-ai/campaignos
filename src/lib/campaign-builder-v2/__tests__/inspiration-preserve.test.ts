import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mergeInspirationAfterGeneration,
  slimInspirationImagesForStorage,
} from "../inspiration-preserve.ts";
import type { CampaignBuilderInspiration } from "../types.ts";

const baseInspiration: CampaignBuilderInspiration = {
  campaignId: "evt-1",
  campaignName: "Back to School Fair",
  eventDate: "2026-08-17",
  playbookId: "school-6-week",
  inspirationImages: [],
  inspirationOverallComment: "",
  brandKitId: "ees-pto",
  voiceTone: "",
  voiceToneValues: [],
  globalAiGuidance: "",
  selectedLogoId: null,
  includeLogoInArtwork: false,
  includeLogoInArtworkUserSet: true,
  uploadedLogoUrl: null,
  uploadedLogoLabel: null,
  colorMode: "none",
  useSchoolColors: false,
  primarySchoolColor: null,
  secondarySchoolColor: null,
  customPaletteColors: [],
};

describe("inspiration-preserve", () => {
  it("does not let an empty updatedInspiration wipe existing images", () => {
    const current = {
      ...baseInspiration,
      inspirationImages: [
        {
          id: "img-1",
          label: "poster",
          url: "https://cdn.example/inspiration.png",
          previewUrl: "https://cdn.example/inspiration.png",
          comment: "Keep this style",
        },
      ],
    };
    const updated = {
      ...baseInspiration,
      inspirationImages: [],
    };

    const merged = mergeInspirationAfterGeneration(current, updated);
    assert.equal(merged.inspirationImages.length, 1);
    assert.equal(
      merged.inspirationImages[0]?.url,
      "https://cdn.example/inspiration.png",
    );
    assert.equal(merged.inspirationImages[0]?.comment, "Keep this style");
  });

  it("keeps http urls when merging a weaker server payload", () => {
    const current = {
      ...baseInspiration,
      inspirationImages: [
        {
          id: "img-1",
          label: "poster",
          url: "https://cdn.example/a.png",
          previewUrl: "https://cdn.example/a.png",
        },
        {
          id: "img-2",
          label: "flyer",
          url: "https://cdn.example/b.png",
          previewUrl: "https://cdn.example/b.png",
        },
      ],
    };
    const updated = {
      ...baseInspiration,
      inspirationImages: [
        {
          id: "img-1",
          label: "poster",
          url: null,
          previewUrl: null,
        },
      ],
    };

    const merged = mergeInspirationAfterGeneration(current, updated);
    assert.equal(merged.inspirationImages.length, 2);
  });

  it("slim storage keeps http inspiration and drops empty shells", () => {
    const slimmed = slimInspirationImagesForStorage([
      {
        id: "ok",
        label: "poster",
        url: "https://cdn.example/a.png",
        previewUrl: "blob:http://localhost/x",
      },
      {
        id: "empty",
        label: "gone",
        url: "",
        previewUrl: undefined,
      },
    ]);

    assert.equal(slimmed.length, 1);
    assert.equal(slimmed[0]?.url, "https://cdn.example/a.png");
    assert.equal(slimmed[0]?.previewUrl, "https://cdn.example/a.png");
  });
});
