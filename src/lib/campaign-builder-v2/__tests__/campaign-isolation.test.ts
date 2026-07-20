import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyArtworkBackup } from "../artwork-backup.ts";
import {
  hydrateCampaignBuilderSession,
  normalizeCampaignBuilderSession,
} from "../normalize-session.ts";
import { buildDefaultSession, localSessionKey } from "../seed-data.ts";
import {
  shouldRetainInMemorySessionOnHydrate,
} from "../session-identity.ts";
import type { MilestonePreviewContent } from "../types.ts";

function withArtwork(
  session: ReturnType<typeof buildDefaultSession>,
  feedUrl: string,
  caption: string,
) {
  const milestoneId = session.milestones[0]?.id;
  assert.ok(milestoneId);
  return {
    ...session,
    previewContents: session.previewContents.map((content) =>
      content.milestoneId === milestoneId
        ? ({
            ...content,
            generationStatus: "generated" as const,
            artwork: { feedUrl, storyUrl: null },
            captions: [
              { platform: "facebook", text: caption },
              { platform: "instagram", text: caption },
            ],
          } satisfies MilestonePreviewContent)
        : content,
    ),
  };
}

describe("campaign artwork isolation", () => {
  it("keeps distinct artwork for two campaigns that share milestone names", () => {
    const sharedMilestoneId = "playbook-14-days";
    const sharedName = "14 Days Out";

    const campaignA = withArtwork(
      {
        ...buildDefaultSession("evt-bts", "Back to School Fair", "2026-08-17"),
        milestones: [
          {
            ...buildDefaultSession("evt-bts", "Back to School Fair", "2026-08-17")
              .milestones[0]!,
            id: sharedMilestoneId,
            name: sharedName,
          },
        ],
        previewContents: [
          {
            ...buildDefaultSession("evt-bts", "Back to School Fair", "2026-08-17")
              .previewContents[0]!,
            milestoneId: sharedMilestoneId,
          },
        ],
      },
      "https://x/bts-feed.png",
      "Back to School caption",
    );

    const campaignBBase = buildDefaultSession(
      "evt-donuts",
      "Donuts with GrownUps & Shop the Book Fair (A–L)",
      "2026-09-10",
    );
    const campaignB = withArtwork(
      {
        ...campaignBBase,
        milestones: [
          {
            ...campaignBBase.milestones[0]!,
            id: sharedMilestoneId,
            name: sharedName,
          },
        ],
        previewContents: [
          {
            ...campaignBBase.previewContents[0]!,
            milestoneId: sharedMilestoneId,
          },
        ],
      },
      "https://x/donuts-feed.png",
      "Donuts caption",
    );

    assert.notEqual(localSessionKey(campaignA.eventId), localSessionKey(campaignB.eventId));

    const hydratedA = hydrateCampaignBuilderSession(
      campaignA,
      null,
      campaignA.eventId,
      campaignA.inspiration.campaignName,
      campaignA.inspiration.eventDate,
      true,
    );
    const hydratedB = hydrateCampaignBuilderSession(
      campaignB,
      null,
      campaignB.eventId,
      campaignB.inspiration.campaignName,
      campaignB.inspiration.eventDate,
      true,
    );

    assert.equal(hydratedA.previewContents[0]?.artwork.feedUrl, "https://x/bts-feed.png");
    assert.equal(hydratedB.previewContents[0]?.artwork.feedUrl, "https://x/donuts-feed.png");
    assert.equal(hydratedA.previewContents[0]?.captions[0]?.text, "Back to School caption");
    assert.equal(hydratedB.previewContents[0]?.captions[0]?.text, "Donuts caption");
  });

  it("does not retain Campaign A artwork when switching to Campaign B", () => {
    const campaignA = withArtwork(
      buildDefaultSession("evt-a", "Campaign A", "2026-08-01"),
      "https://x/a-feed.png",
      "A caption",
    );
    const campaignB = buildDefaultSession("evt-b", "Campaign B", "2026-09-01");

    assert.equal(
      shouldRetainInMemorySessionOnHydrate({
        previousEventId: campaignA.eventId,
        routeEventId: campaignB.eventId,
        previousRichness: 10,
        hydratedRichness: 0,
      }),
      false,
    );

    const hydratedB = hydrateCampaignBuilderSession(
      campaignB,
      null,
      campaignB.eventId,
      "Campaign B",
      "2026-09-01",
      true,
    );

    assert.equal(hydratedB.eventId, "evt-b");
    assert.equal(hydratedB.inspiration.campaignName, "Campaign B");
    assert.equal(hydratedB.previewContents[0]?.artwork.feedUrl, null);
    assert.notEqual(
      hydratedB.previewContents[0]?.artwork.feedUrl,
      campaignA.previewContents[0]?.artwork.feedUrl,
    );
  });

  it("refreshing Campaign B keeps only Campaign B artwork and captions", () => {
    const savedB = withArtwork(
      buildDefaultSession("evt-b", "Campaign B", "2026-09-01"),
      "https://x/b-only.png",
      "Only B",
    );

    const reloaded = hydrateCampaignBuilderSession(
      {},
      savedB,
      "evt-b",
      "Campaign B",
      "2026-09-01",
      false,
    );

    assert.equal(reloaded.eventId, "evt-b");
    assert.equal(reloaded.inspiration.campaignId, "evt-b");
    assert.equal(reloaded.inspiration.campaignName, "Campaign B");
    assert.equal(reloaded.previewContents[0]?.artwork.feedUrl, "https://x/b-only.png");
    assert.equal(reloaded.previewContents[0]?.captions[0]?.text, "Only B");
  });

  it("normalizes a corrupted Campaign A rename back onto the route event identity", () => {
    const corrupted = {
      ...buildDefaultSession("evt-bts", "Back to School Fair", "2026-08-17"),
      inspiration: {
        ...buildDefaultSession("evt-bts", "Back to School Fair", "2026-08-17")
          .inspiration,
        campaignId: "evt-donuts",
        campaignName: "Donuts with GrownUps & Shop the Book Fair (A–L)",
      },
    };

    const normalized = normalizeCampaignBuilderSession(
      corrupted,
      "evt-bts",
      "Back to School Fair",
      "2026-08-17",
    );

    assert.equal(normalized.eventId, "evt-bts");
    assert.equal(normalized.inspiration.campaignId, "evt-bts");
    assert.equal(normalized.inspiration.campaignName, "Back to School Fair");
  });

  it("exact milestoneId match wins over name-only backup entries", () => {
    const session = buildDefaultSession("evt-id", "Campaign", "2026-08-17");
    const milestoneId = session.milestones[0]!.id;
    const milestoneName = session.milestones[0]!.name;

    const restored = applyArtworkBackup(session, {
      [milestoneId]: {
        milestoneId,
        milestoneName,
        artwork: {
          feedUrl: "https://x/id-wins.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "id" },
          { platform: "instagram", text: "id" },
        ],
        generationStatus: "generated",
      },
      "foreign-same-name": {
        milestoneId: "foreign-same-name",
        milestoneName,
        artwork: {
          feedUrl: "https://x/name-fallback.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "name" },
          { platform: "instagram", text: "name" },
        ],
        generationStatus: "generated",
      },
    });

    assert.equal(restored.previewContents[0]?.artwork.feedUrl, "https://x/id-wins.png");
    assert.equal(restored.previewContents[0]?.captions[0]?.text, "id");
  });

  it("retains richer in-memory session only for the same eventId", () => {
    assert.equal(
      shouldRetainInMemorySessionOnHydrate({
        previousEventId: "evt-a",
        routeEventId: "evt-a",
        previousRichness: 5,
        hydratedRichness: 1,
      }),
      true,
    );
    assert.equal(
      shouldRetainInMemorySessionOnHydrate({
        previousEventId: "evt-a",
        routeEventId: "evt-b",
        previousRichness: 5,
        hydratedRichness: 1,
      }),
      false,
    );
  });
});
