import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapCampaignFileToSavedFlyer } from "../saved-flyers-map.ts";
import type { CampaignFile } from "@/types/campaign-files";

function baseFile(overrides: Partial<CampaignFile> = {}): CampaignFile {
  return {
    id: "file-1",
    eventId: "evt-1",
    folderId: null,
    name: "Flyer-spring-fair-2026-08-06.png",
    url: "https://example.com/flyers/spring.png",
    storagePath: "evt-1/spring.png",
    uploadedAt: "2026-08-06T12:00:00.000Z",
    fileType: "png",
    category: "flyer",
    documentCategory: "general_document",
    platforms: [],
    status: "active",
    sizeBytes: 1200,
    mimeType: "image/png",
    uploaderName: "Alex",
    updatedAt: "2026-08-06T12:00:00.000Z",
    ...overrides,
  };
}

describe("mapCampaignFileToSavedFlyer", () => {
  it("maps active flyer images", () => {
    const mapped = mapCampaignFileToSavedFlyer(baseFile());
    assert.ok(mapped);
    assert.equal(mapped?.id, "file-1");
    assert.equal(mapped?.imageUrl, "https://example.com/flyers/spring.png");
    assert.equal(mapped?.name, "Flyer-spring-fair-2026-08-06.png");
  });

  it("skips non-flyer categories", () => {
    assert.equal(
      mapCampaignFileToSavedFlyer(baseFile({ category: "contract" })),
      null,
    );
  });

  it("skips archived or missing url", () => {
    assert.equal(
      mapCampaignFileToSavedFlyer(baseFile({ status: "archived" })),
      null,
    );
    assert.equal(mapCampaignFileToSavedFlyer(baseFile({ url: null })), null);
  });

  it("accepts jpg by mime when fileType is other", () => {
    const mapped = mapCampaignFileToSavedFlyer(
      baseFile({
        fileType: "other",
        mimeType: "image/jpeg",
        name: "custom-flyer.jpg",
      }),
    );
    assert.ok(mapped);
    assert.equal(mapped?.fileType, "other");
  });
});
