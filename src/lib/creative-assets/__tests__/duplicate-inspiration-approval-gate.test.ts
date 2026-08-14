import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import { selectHeroArtwork } from "@/lib/event-workspace/select-hero-artwork";
import type { EventAsset } from "@/types/event-workspace";

/**
 * Product rule: duplicated/legacy artwork must require the same explicit
 * approval as the applicable approval workflow before it counts as
 * publish-ready — reusing artwork from another campaign is not itself an
 * approval decision for THIS campaign.
 *
 * `duplicateInspirationToCampaign` used to insert the copied row with
 * plan_status left unset (null). Both `isApprovedArtworkAsset` and the
 * hero-artwork selector treat plan_status === null + status === "uploaded"
 * as approved — a fallback meant only for genuinely pre-plan_status legacy
 * rows — so a freshly duplicated asset would silently count as approved
 * without ever being reviewed in the new campaign's context. The fix marks
 * duplicated rows plan_status: "generated" (pending review) at creation.
 */
function readMutationsSrc(): string {
  const path = fileURLToPath(
    new URL("../mutations.ts", import.meta.url),
  );
  return readFileSync(path, "utf8");
}

function baseAsset(overrides: Partial<EventAsset>): EventAsset {
  return {
    id: "asset-1",
    eventId: "event-1",
    assetType: "instagram_graphic",
    filename: "reused.png",
    storagePath: "event-1/reused.png",
    status: "uploaded",
    aiGenerated: false,
    uploadedBy: null,
    currentVersion: 1,
    tags: [],
    isFavorite: false,
    canvaUrl: null,
    isCustom: true,
    planStatus: null,
    planLabel: null,
    generationPrompt: null,
    aiReview: null,
    inspirationMatch: null,
    generationSettings: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("duplicateInspirationToCampaign — approval gate wiring", () => {
  it("inserts the duplicated row with plan_status: 'generated', not left null", () => {
    const src = readMutationsSrc();
    const fnStart = src.indexOf(
      "export async function duplicateInspirationToCampaign(",
    );
    assert.ok(fnStart >= 0, "duplicateInspirationToCampaign not found");
    const fnEnd = src.indexOf("\nexport ", fnStart + 10);
    const fnBody = src.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);

    const primaryInsertEnd = fnBody.indexOf(".select(\"id\")");
    const primaryInsert = fnBody.slice(0, primaryInsertEnd);

    assert.match(
      primaryInsert,
      /status:\s*"uploaded"/,
      "expected duplicated row to still be marked uploaded",
    );
    assert.match(
      primaryInsert,
      /plan_status:\s*"generated"/,
      "duplicated row must explicitly set plan_status to a non-approved state",
    );
  });

  it("does not silently rely on plan_status being approved by default", () => {
    const src = readMutationsSrc();
    const fnStart = src.indexOf(
      "export async function duplicateInspirationToCampaign(",
    );
    const fnEnd = src.indexOf("\nexport ", fnStart + 10);
    const fnBody = src.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);
    assert.doesNotMatch(fnBody, /plan_status:\s*"approved"/);
  });
});

describe("isApprovedArtworkAsset — legacy fallback stays scoped to true legacy rows", () => {
  it("treats a fresh duplicate (plan_status: generated) as NOT approved", () => {
    const duplicated = baseAsset({ planStatus: "generated" });
    assert.equal(isApprovedArtworkAsset(duplicated), false);
  });

  it("still treats a genuinely pre-plan_status legacy row (plan_status: null) as approved", () => {
    const legacy = baseAsset({ planStatus: null });
    assert.equal(isApprovedArtworkAsset(legacy), true);
  });

  it("treats an explicitly approved asset as approved", () => {
    const approved = baseAsset({ planStatus: "approved" });
    assert.equal(isApprovedArtworkAsset(approved), true);
  });
});

describe("selectHeroArtwork — duplicated artwork can't self-approve onto the event card", () => {
  it("does not surface a pending-review duplicate as 'Artwork ready'", () => {
    const pendingDuplicate = baseAsset({
      assetType: "hero_image",
      planStatus: "generated",
    });

    const selection = selectHeroArtwork({
      assets: [pendingDuplicate],
      communications: [],
      approvalRequests: [],
    });

    // Must not be labeled as reviewed/approved artwork. It may still fall
    // through to the honest "just uploaded, not reviewed yet" affordance.
    assert.notEqual(selection?.source, "approved_asset");
    assert.notEqual(selection?.caption, "Artwork ready");
  });

  it("still surfaces a truly legacy row (plan_status: null) — unchanged pre-fix behavior", () => {
    const legacy = baseAsset({
      assetType: "hero_image",
      planStatus: null,
    });

    const selection = selectHeroArtwork({
      assets: [legacy],
      communications: [],
      approvalRequests: [],
    });

    assert.equal(selection?.source, "approved_asset");
  });

  it("surfaces an explicitly approved asset as ready", () => {
    const approved = baseAsset({
      assetType: "hero_image",
      planStatus: "approved",
    });

    const selection = selectHeroArtwork({
      assets: [approved],
      communications: [],
      approvalRequests: [],
    });

    assert.equal(selection?.source, "approved_asset");
  });
});
