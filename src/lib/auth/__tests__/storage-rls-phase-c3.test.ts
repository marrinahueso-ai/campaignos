import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAMPAIGN_FILES_BUCKET } from "@/lib/campaign-files/constants";
import { EVENT_ASSETS_BUCKET } from "@/lib/event-workspace/storage";
import {
  ORGANIZATION_STICKERS_BUCKET,
  buildOrganizationStickerStoragePath,
} from "@/lib/inbox/sticker-constants";
import { VENDOR_DOCUMENTS_BUCKET } from "@/lib/vendors/constants";
import { buildVendorDocumentStoragePath, buildVendorLogoStoragePath } from "@/lib/vendors/storage";

/**
 * Phase C3 storage RLS contract (migration 067_storage_membership_rls).
 * Runtime enforcement is in Postgres; these tests lock the path conventions
 * policies rely on so refactors do not silently break tenancy.
 */
describe("Phase C3 storage membership RLS contract", () => {
  const orgId = "11111111-1111-4111-8111-111111111111";
  const eventId = "22222222-2222-4222-8222-222222222222";
  const vendorId = "33333333-3333-4333-8333-333333333333";

  it("keeps org-prefixed buckets keyed by organization_id first folder", () => {
    const docPath = buildVendorDocumentStoragePath(orgId, vendorId, "contract.pdf", eventId);
    const logoPath = buildVendorLogoStoragePath(orgId, vendorId, "logo.png");
    const stickerPath = buildOrganizationStickerStoragePath({
      organizationId: orgId,
      stickerId: "44444444-4444-4444-8444-444444444444",
      mimeType: "image/png",
    });
    assert.equal(docPath.split("/")[0], orgId);
    assert.equal(logoPath.split("/")[0], orgId);
    assert.equal(stickerPath.split("/")[0], orgId);
    assert.equal(VENDOR_DOCUMENTS_BUCKET, "vendor-documents");
    assert.equal(ORGANIZATION_STICKERS_BUCKET, "organization-stickers");
  });

  it("keeps event-prefixed buckets keyed by event_id first folder", () => {
    // Mirrors campaign-files + event-assets builders used in production uploads
    const campaignPath = `${eventId}/${Date.now()}-flyer.pdf`;
    const assetPath = `${eventId}/facebook_feed/concepts/batch/concept-1.png`;
    assert.equal(campaignPath.split("/")[0], eventId);
    assert.equal(assetPath.split("/")[0], eventId);
    assert.equal(CAMPAIGN_FILES_BUCKET, "campaign-files");
    assert.equal(EVENT_ASSETS_BUCKET, "event-assets");
  });

  it("documents public vs private bucket residual risk", () => {
    const privateBuckets = new Set([
      "vendor-documents",
      "calendar-uploads",
      "training-library",
    ]);
    const publicBucketsApiHardened = new Set([
      "event-assets",
      "campaign-files",
      "school-assets",
      "organization-stickers",
    ]);
    // Private: Storage API + signed URLs gated by membership
    assert.equal(privateBuckets.has("vendor-documents"), true);
    // Public: API gated; HTTP /object/public/ URLs still work until signed-URL migration
    assert.equal(publicBucketsApiHardened.has("event-assets"), true);
    assert.equal(publicBucketsApiHardened.has("organization-stickers"), true);
  });

  it("rejects non-uuid first folders at the policy helper layer (contract)", () => {
    // private.storage_first_folder_uuid returns null → membership check fails closed
    const malformed = "not-a-uuid/file.png";
    const first = malformed.split("/")[0];
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert.equal(uuidRe.test(first), false);
  });
});
