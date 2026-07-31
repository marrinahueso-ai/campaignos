import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolveRevisionArtworkUrls } from "@/components/approvals-revision/map-item";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";

function buildItem(
  overrides: Partial<UnifiedApprovalItem> & {
    preview?: Partial<UnifiedApprovalItem["preview"]>;
  } = {},
): UnifiedApprovalItem {
  const { preview: previewOverrides, ...rest } = overrides;
  return {
    id: "item-1",
    source: "campaign_builder",
    eventId: "evt-1",
    eventTitle: "Parent Orientation",
    campaignName: "Parent Orientation",
    milestoneName: "Reminder Only",
    thumbnailUrl: null,
    workflowStatus: "changes_requested",
    statusDetail: "Changes requested",
    assigneeName: "marrina@example.com",
    assigneeRole: "President",
    assigneeInitials: "MH",
    nextAction: "Revise and resubmit",
    nextActionTime: "Requested today",
    deliveryMethod: "auto-publish",
    platforms: ["facebook"],
    scheduleAt: null,
    scheduleLabel: "Aug 27",
    assignedToMe: false,
    submittedByMe: true,
    hasAssignedUser: true,
    approvalRequestId: "req-1",
    communicationItemId: null,
    schedulingItemId: "sched-1",
    campaignMilestoneId: "ms-1",
    metaRelativeDay: null,
    publishError: null,
    channel: "facebook",
    notes: "change the date",
    preview: {
      captionText: "Join us!",
      storyCaptionSnippet: null,
      feedArtworkUrl: null,
      storyArtworkUrl: null,
      ...previewOverrides,
    },
    requestedAt: "2026-07-27T10:00:00.000Z",
    approvalHistory: [],
    ...rest,
  };
}

describe("resolveRevisionArtworkUrls", () => {
  it("always returns both feed and story keys", () => {
    const urls = resolveRevisionArtworkUrls(buildItem());
    assert.equal("feedArtworkUrl" in urls, true);
    assert.equal("storyArtworkUrl" in urls, true);
    assert.equal(urls.feedArtworkUrl, null);
    assert.equal(urls.storyArtworkUrl, null);
  });

  it("fills feed from legacy thumbnail when feed+story are missing", () => {
    const urls = resolveRevisionArtworkUrls(
      buildItem({ thumbnailUrl: "https://cdn.example/thumb.png" }),
    );
    assert.equal(urls.feedArtworkUrl, "https://cdn.example/thumb.png");
    assert.equal(urls.storyArtworkUrl, null);
    assert.equal(urls.previewImageUrl, "https://cdn.example/thumb.png");
  });

  it("keeps distinct feed and story when both exist", () => {
    const urls = resolveRevisionArtworkUrls(
      buildItem({
        thumbnailUrl: "https://cdn.example/thumb.png",
        preview: {
          feedArtworkUrl: "https://cdn.example/feed.png",
          storyArtworkUrl: "https://cdn.example/story.png",
        },
      }),
    );
    assert.equal(urls.feedArtworkUrl, "https://cdn.example/feed.png");
    assert.equal(urls.storyArtworkUrl, "https://cdn.example/story.png");
  });

  it("does not put story-only artwork into the feed slot", () => {
    const urls = resolveRevisionArtworkUrls(
      buildItem({
        thumbnailUrl: "https://cdn.example/story.png",
        preview: {
          feedArtworkUrl: null,
          storyArtworkUrl: "https://cdn.example/story.png",
        },
      }),
    );
    assert.equal(urls.feedArtworkUrl, null);
    assert.equal(urls.storyArtworkUrl, "https://cdn.example/story.png");
  });

  it("defaults a missing runtime preview without throwing", () => {
    const item = buildItem({ thumbnailUrl: "https://cdn.example/thumb.png" });
    (item as { preview?: UnifiedApprovalItem["preview"] }).preview = undefined;

    assert.deepEqual(resolveRevisionArtworkUrls(item), {
      feedArtworkUrl: "https://cdn.example/thumb.png",
      storyArtworkUrl: null,
      previewImageUrl: "https://cdn.example/thumb.png",
    });
  });
});

describe("Revision dual-format UI wiring", () => {
  it("Creator and Approver cards mount RevisionArtworkPair with social regenerate", () => {
    const creator = readFileSync(
      new URL("../CreatorRevisionCard.tsx", import.meta.url),
      "utf8",
    );
    const approver = readFileSync(
      new URL("../ApproverRequestCard.tsx", import.meta.url),
      "utf8",
    );
    const pair = readFileSync(
      new URL("../RevisionArtworkPair.tsx", import.meta.url),
      "utf8",
    );

    assert.match(creator, /RevisionArtworkPair/);
    assert.match(creator, /Regenerate feed \(1:1\)/);
    assert.match(creator, /Regenerate story \(9:16\)/);
    assert.match(creator, /Regenerate both/);
    assert.equal(creator.includes("Regenerate artwork"), false);
    assert.match(approver, /RevisionArtworkPair/);
    assert.match(pair, /Story · 9:16/);
    assert.match(pair, /No story artwork yet/);
    assert.match(pair, /view="story"/);
    assert.match(pair, /both slots always render/i);
  });

  it("branches Flyer print preview + tags away from Social feed/story", () => {
    const creator = readFileSync(
      new URL("../CreatorRevisionCard.tsx", import.meta.url),
      "utf8",
    );
    const approver = readFileSync(
      new URL("../ApproverRequestCard.tsx", import.meta.url),
      "utf8",
    );
    const pair = readFileSync(
      new URL("../RevisionArtworkPair.tsx", import.meta.url),
      "utf8",
    );

    assert.match(approver, /contentType === "flyer"/);
    assert.match(approver, /Review the print flyer artwork/);
    assert.match(approver, /FLYER_REVISION_TAGS/);
    assert.match(approver, /Approve(?! & schedule)/);
    assert.match(approver, /variant=\{isFlyer \? "flyer" : "social"\}/);
    assert.doesNotMatch(
      approver,
      /DEFAULT_TAGS[\s\S]*Stories[\s\S]*Caption/,
    );

    assert.match(creator, /Open Flyer composer/);
    assert.match(creator, /variant=\{isFlyer \? "flyer" : "social"\}/);
    assert.match(pair, /variant === "flyer"/);
    assert.match(pair, /Flyer · print/);
    assert.match(pair, /No flyer artwork yet/);
    assert.match(pair, /enlargeable/);
    assert.match(pair, /FlyerPreviewLightbox|rev-flyer-lightbox/);
    assert.match(pair, /ZoomIn/);
  });
});
