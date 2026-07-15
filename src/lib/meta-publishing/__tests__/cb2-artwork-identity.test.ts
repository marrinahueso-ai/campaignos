import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  indexCb2ArtworkRows,
  resolveCb2ArtworkForMilestone,
  type Cb2ArtworkRow,
  type SessionMilestoneRef,
} from "../cb2-artwork-identity.ts";
import { sameMilestoneTitleAliases } from "../../campaign-builder-v2/milestone-names.ts";

function row(
  overrides: Partial<Cb2ArtworkRow> & Pick<Cb2ArtworkRow, "campaignMilestoneId" | "milestoneName">,
): Cb2ArtworkRow {
  return {
    feedArtworkUrl: null,
    storyArtworkUrl: null,
    ...overrides,
  };
}

describe("cb2-artwork-identity", () => {
  const twoWeek = row({
    campaignMilestoneId: "ms-14",
    milestoneName: "Two-Week Push",
    feedArtworkUrl: "https://cdn.example/two-week-feed.png",
    storyArtworkUrl: "https://cdn.example/two-week-story.png",
  });
  const oneWeek = row({
    campaignMilestoneId: "ms-7",
    milestoneName: "One-Week Push",
    feedArtworkUrl: "https://cdn.example/one-week-feed.png",
    storyArtworkUrl: "https://cdn.example/one-week-story.png",
  });
  const dayBefore = row({
    campaignMilestoneId: "ms-1",
    milestoneName: "Day Before",
    feedArtworkUrl: "https://cdn.example/day-before-feed.png",
    storyArtworkUrl: "https://cdn.example/day-before-story.png",
  });

  const session: SessionMilestoneRef[] = [
    { id: "ms-14", name: "Two-Week Push", relativeDay: -14 },
    { id: "ms-7", name: "One-Week Push", relativeDay: -7 },
    { id: "ms-1", name: "Day Before", relativeDay: -1 },
  ];

  it("keeps three milestones on three distinct assets", () => {
    const index = indexCb2ArtworkRows([twoWeek, oneWeek, dayBefore]);

    const resolved14 = resolveCb2ArtworkForMilestone({
      milestoneTitle: "Two-Week Push",
      relativeDay: -14,
      sessionMilestones: session,
      index,
    });
    const resolved7 = resolveCb2ArtworkForMilestone({
      milestoneTitle: "One-Week Push",
      relativeDay: -7,
      sessionMilestones: session,
      index,
    });
    const resolved1 = resolveCb2ArtworkForMilestone({
      milestoneTitle: "Day Before",
      relativeDay: -1,
      sessionMilestones: session,
      index,
    });

    assert.equal(resolved14?.feedArtworkUrl, twoWeek.feedArtworkUrl);
    assert.equal(resolved7?.feedArtworkUrl, oneWeek.feedArtworkUrl);
    assert.equal(resolved1?.feedArtworkUrl, dayBefore.feedArtworkUrl);
    assert.notEqual(resolved14?.feedArtworkUrl, resolved7?.feedArtworkUrl);
    assert.notEqual(resolved7?.feedArtworkUrl, resolved1?.feedArtworkUrl);
  });

  it("lets exact milestone ID win over colliding names", () => {
    const campaignA = row({
      campaignMilestoneId: "camp-a-ms",
      milestoneName: "Two-Week Push",
      feedArtworkUrl: "https://cdn.example/campaign-a.png",
    });
    const campaignB = row({
      campaignMilestoneId: "camp-b-ms",
      milestoneName: "Two-Week Push",
      feedArtworkUrl: "https://cdn.example/campaign-b.png",
    });
    const index = indexCb2ArtworkRows([campaignA, campaignB]);

    assert.equal(
      resolveCb2ArtworkForMilestone({
        milestoneId: "camp-b-ms",
        milestoneTitle: "Two-Week Push",
        index,
      })?.feedArtworkUrl,
      campaignB.feedArtworkUrl,
    );
    assert.equal(
      resolveCb2ArtworkForMilestone({
        milestoneId: "camp-a-ms",
        milestoneTitle: "Two-Week Push",
        index,
      })?.feedArtworkUrl,
      campaignA.feedArtworkUrl,
    );
  });

  it("does not fall back to first event artwork when the target has none", () => {
    const index = indexCb2ArtworkRows([twoWeek, oneWeek]);

    const missing = resolveCb2ArtworkForMilestone({
      milestoneTitle: "Day Before",
      relativeDay: -1,
      sessionMilestones: session,
      index,
    });

    assert.equal(missing, null);
  });

  it("does not reuse another day's artwork via titlesAtDay-style first-available", () => {
    const index = indexCb2ArtworkRows([twoWeek]);

    const oneWeekMiss = resolveCb2ArtworkForMilestone({
      milestoneTitle: "One-Week Push",
      relativeDay: -7,
      sessionMilestones: session,
      index,
    });

    assert.equal(oneWeekMiss, null);
  });

  it("keeps story and feed URLs distinct per milestone", () => {
    const index = indexCb2ArtworkRows([twoWeek, oneWeek]);
    const resolved = resolveCb2ArtworkForMilestone({
      milestoneId: "ms-14",
      index,
    });

    assert.equal(resolved?.feedArtworkUrl, twoWeek.feedArtworkUrl);
    assert.equal(resolved?.storyArtworkUrl, twoWeek.storyArtworkUrl);
    assert.notEqual(resolved?.feedArtworkUrl, resolved?.storyArtworkUrl);
  });

  it("drops ambiguous name fallback when duplicate names span campaigns", () => {
    const index = indexCb2ArtworkRows([
      row({
        campaignMilestoneId: "camp-a-ms",
        milestoneName: "Two-Week Push",
        feedArtworkUrl: "https://cdn.example/a.png",
      }),
      row({
        campaignMilestoneId: "camp-b-ms",
        milestoneName: "Two Week Push",
        feedArtworkUrl: "https://cdn.example/b.png",
      }),
    ]);

    assert.ok(index.ambiguousNameKeys.has("two week push"));
    assert.equal(
      resolveCb2ArtworkForMilestone({
        milestoneTitle: "Two-Week Push",
        index,
      }),
      null,
    );
  });

  it("resolves via session relative day when title is missing", () => {
    const index = indexCb2ArtworkRows([twoWeek, oneWeek, dayBefore]);
    const resolved = resolveCb2ArtworkForMilestone({
      relativeDay: -7,
      sessionMilestones: session,
      index,
    });
    assert.equal(resolved?.feedArtworkUrl, oneWeek.feedArtworkUrl);
  });

  it("sameMilestoneTitleAliases only keeps rename variants", () => {
    assert.deepEqual(
      sameMilestoneTitleAliases("Two-Week Push", [
        "Two Week Push",
        "One-Week Push",
        "Two-Week Reminder",
      ]),
      // Reminder → Push is a known canonical rename; One-Week must not pool in.
      ["Two-Week Push", "Two Week Push", "Two-Week Reminder"],
    );
  });
});
