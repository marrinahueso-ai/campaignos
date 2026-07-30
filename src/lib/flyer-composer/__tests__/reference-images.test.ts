import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSampleDirectionInput } from "@/lib/flyer-composer/direction-payload";
import {
  isFlyerComposerReferenceImageUrl,
  resolveFlyerComposerReferenceImageUrls,
} from "@/lib/flyer-composer/reference-images";

describe("flyer composer reference images", () => {
  it("accepts data and https URLs only", () => {
    assert.equal(isFlyerComposerReferenceImageUrl("data:image/png;base64,abc"), true);
    assert.equal(isFlyerComposerReferenceImageUrl("https://cdn.example/hero.jpg"), true);
    assert.equal(isFlyerComposerReferenceImageUrl("blob:http://localhost/x"), false);
    assert.equal(isFlyerComposerReferenceImageUrl(""), false);
  });

  it("collects inspiration and custom template image URLs in order", () => {
    const input = buildSampleDirectionInput({
      assets: {
        inspirationPhotoPresent: true,
        inspirationPhotoSource: "sample",
        inspirationPhotoLabel: "Festival lawn",
        inspirationPhotoNote: null,
        inspirationPhotoUrl: "https://images.example/hero.jpg",
        customTemplatePresent: true,
        customTemplateFileName: "last-year.png",
        customTemplateFileType: "image",
        customTemplateNote: null,
        customTemplateImageUrl: "data:image/png;base64,abc",
      },
    });

    assert.deepEqual(resolveFlyerComposerReferenceImageUrls(input.assets), [
      "https://images.example/hero.jpg",
      "data:image/png;base64,abc",
    ]);
  });

  it("skips inspiration URL when photo was not explicitly chosen", () => {
    const input = buildSampleDirectionInput({
      assets: {
        inspirationPhotoPresent: false,
        inspirationPhotoSource: null,
        inspirationPhotoLabel: null,
        inspirationPhotoNote: null,
        inspirationPhotoUrl: "https://images.unsplash.com/photo-1517457373958",
        customTemplatePresent: false,
        customTemplateFileName: null,
        customTemplateFileType: null,
        customTemplateNote: null,
        customTemplateImageUrl: null,
      },
    });

    assert.deepEqual(resolveFlyerComposerReferenceImageUrls(input.assets), []);
  });
});
