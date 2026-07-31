import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapApprovalItemToRevision } from "@/components/approvals-revision/map-item";
import { approvalEmailFormatVariables } from "@/lib/email/approval-content-preview";
import { mapSchedulingItemRow } from "@/lib/approvals-scheduling/map-items";
import type { ApprovalSchedulingItemRow } from "@/lib/approvals-scheduling/types";
import { FLYER_COMPOSER_MILESTONE_PREFIX } from "@/lib/flyer-composer/approval";

describe("flyer approval scheduling mapping", () => {
  const row: ApprovalSchedulingItemRow = {
    id: "sched-flyer-1",
    event_id: "evt-1",
    approval_request_id: null,
    communication_item_id: null,
    source: "campaign_builder",
    campaign_milestone_id: `${FLYER_COMPOSER_MILESTONE_PREFIX}draft-1`,
    campaign_name: "Flyer",
    milestone_name: "Spring Fair",
    workflow_status: "assigned_to_me",
    assigned_user_id: "user-1",
    assigned_organization_role_id: null,
    requested_by_user_id: "creator-1",
    delivery_method: "draft-only",
    platforms: [],
    schedule_at: null,
    caption_text: "Riverside PTA · Spring Fair",
    story_caption: null,
    feed_artwork_url: "https://cdn.example/flyer.png",
    story_artwork_url: null,
    manual_upload_link: null,
    manual_email_to: null,
    manual_email_send_at: null,
    manual_upload_email_sent_at: null,
    notes: null,
    requested_at: "2026-07-30T10:00:00.000Z",
    resolved_at: null,
    created_at: "2026-07-30T10:00:00.000Z",
    updated_at: "2026-07-30T10:00:00.000Z",
  };

  it("maps flyer composer rows without inventing social platforms", () => {
    const item = mapSchedulingItemRow(
      row,
      "Spring Fair",
      "Approver",
      "President",
      true,
      true,
    );
    assert.equal(item.channel, "flyer");
    assert.deepEqual(item.platforms, []);
    assert.equal(item.deliveryMethod, "draft-only");
    assert.equal(item.preview.feedArtworkUrl, "https://cdn.example/flyer.png");
    assert.equal(item.preview.storyArtworkUrl, null);
    assert.equal(item.thumbnailUrl, "https://cdn.example/flyer.png");
  });

  it("maps revision workspace to flyer content type + composer deep link", () => {
    const item = mapSchedulingItemRow(
      row,
      "Spring Fair",
      "Approver",
      "President",
      true,
      true,
    );
    const model = mapApprovalItemToRevision(item, "creator");
    assert.equal(model.contentType, "flyer");
    assert.equal(model.typeChip, "Flyer");
    assert.equal(model.storyArtworkUrl, null);
    assert.equal(
      model.editArtworkHref,
      "/create-with-ai/flyer?view=result",
    );
  });

  it("approver revision model starts with empty note (not creator resubmit copy)", () => {
    const item = mapSchedulingItemRow(
      row,
      "Spring Fair",
      "Approver",
      "President",
      true,
      true,
    );
    const model = mapApprovalItemToRevision(item, "approver");
    assert.equal(model.contentType, "flyer");
    assert.equal(model.noteBody, "");
    assert.equal(model.storyArtworkUrl, null);
  });

  it("email format variables use print flyer language for flyer items", () => {
    const flyer = approvalEmailFormatVariables(true);
    assert.equal(flyer.ARTWORK_SUMMARY, "Print flyer");
    assert.equal(flyer.CTA_LABEL, "Open Flyer composer");
    const social = approvalEmailFormatVariables(false);
    assert.match(social.ARTWORK_SUMMARY, /1:1 feed/);
    assert.equal(social.CTA_LABEL, "Edit artwork");
  });
});
