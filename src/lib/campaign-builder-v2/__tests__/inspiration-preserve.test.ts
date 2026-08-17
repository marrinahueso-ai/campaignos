import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  isPendingInspirationBlob,
  isPersistedInspirationUrl,
  mergeInspirationAfterGeneration,
  resolveInspirationImagesForContinue,
  resolveInspirationImagesForStorage,
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

  it("persist resolve keeps prior http inspiration while a blob upload is pending", () => {
    const previous = [
      {
        id: "img-1",
        label: "poster",
        url: "https://cdn.example/a.png",
        previewUrl: "https://cdn.example/a.png",
      },
    ];
    const livePending = [
      {
        id: "img-2",
        label: "new",
        url: null,
        previewUrl: "blob:http://localhost/pending",
      },
    ];

    const resolved = resolveInspirationImagesForStorage(livePending, previous);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0]?.url, "https://cdn.example/a.png");
  });

  it("persist resolve allows intentional clear when there is no pending blob", () => {
    const previous = [
      {
        id: "img-1",
        label: "poster",
        url: "https://cdn.example/a.png",
        previewUrl: "https://cdn.example/a.png",
      },
    ];

    const resolved = resolveInspirationImagesForStorage([], previous);
    assert.deepEqual(resolved, []);
  });

  it("persist resolve prefers live http urls over previous storage", () => {
    const previous = [
      {
        id: "img-1",
        label: "old",
        url: "https://cdn.example/old.png",
        previewUrl: "https://cdn.example/old.png",
      },
    ];
    const live = [
      {
        id: "img-2",
        label: "new",
        url: "https://cdn.example/new.png",
        previewUrl: "https://cdn.example/new.png",
      },
    ];

    const resolved = resolveInspirationImagesForStorage(live, previous);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0]?.url, "https://cdn.example/new.png");
  });

  it("treats blob previews without an http url as pending, not saved", () => {
    assert.equal(
      isPendingInspirationBlob({
        id: "pending",
        label: "new",
        url: null,
        previewUrl: "blob:http://localhost/pending",
      }),
      true,
    );
    assert.equal(
      isPendingInspirationBlob({
        id: "saved",
        label: "poster",
        url: "https://cdn.example/a.png",
        previewUrl: "blob:http://localhost/stale",
      }),
      false,
    );
    assert.equal(isPersistedInspirationUrl("https://cdn.example/a.png"), true);
    assert.equal(isPersistedInspirationUrl("blob:http://localhost/x"), false);
  });

  it("Save Preview keeps saved http inspiration and drops leftover blobs", () => {
    const live = [
      {
        id: "img-1",
        label: "poster",
        url: null,
        previewUrl: "blob:http://localhost/stale",
      },
    ];
    const previouslyStored = [
      {
        id: "img-1",
        label: "poster",
        url: "https://cdn.example/saved.png",
        previewUrl: "https://cdn.example/saved.png",
      },
    ];

    const recovered = resolveInspirationImagesForContinue(
      live,
      [],
      previouslyStored,
    );
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0]?.url, "https://cdn.example/saved.png");

    const fromServer = resolveInspirationImagesForContinue(
      live,
      [
        {
          id: "img-1",
          label: "poster",
          url: "https://cdn.example/uploaded.png",
          previewUrl: "https://cdn.example/uploaded.png",
        },
      ],
      previouslyStored,
    );
    assert.equal(fromServer[0]?.url, "https://cdn.example/uploaded.png");
  });
});

describe("Creative Setup Save → Preview", () => {
  it("does not wait on leftover inspiration blob thumbnails", () => {
    const source = readFileSync(
      new URL(
        "../../../components/campaign-builder-v2/CampaignBuilderProvider.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /Wait for inspiration image uploads to finish before continuing/,
    );
    assert.match(source, /persistCreativeSetupInspirationAction/);
    assert.match(source, /resolveInspirationImagesForContinue/);
  });
});
