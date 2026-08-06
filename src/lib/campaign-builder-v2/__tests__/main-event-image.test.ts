import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDefaultSession } from "../seed-data.ts";
import {
  applyArtworkWithMainEventReuse,
  applyImageToAllPosts,
  detachMainEventImage,
  usesMainEventImage,
} from "../main-event-image.ts";
import type { CampaignBuilderMilestone } from "../types.ts";

function withRelativeDay(
  session: ReturnType<typeof buildDefaultSession>,
  relativeDays: number[],
) {
  const eventDate = session.inspiration.eventDate;
  const milestones = relativeDays.map((day, index) => {
    const base = session.milestones[index] ?? session.milestones[0]!;
    const date = shiftDate(eventDate, day);
    return {
      ...base,
      id: `ms-${day}`,
      name: `Day ${day}`,
      suggestedDate: date,
      sortOrder: index,
    } satisfies CampaignBuilderMilestone;
  });
  return {
    ...session,
    milestones,
    previewContents: milestones.map((milestone) => ({
      ...session.previewContents[0]!,
      milestoneId: milestone.id,
      scheduleDate: milestone.suggestedDate,
      artwork: { feedUrl: null, storyUrl: null },
      artworkMode: undefined,
      captions: [
        { platform: "facebook" as const, text: `Caption ${milestone.id}` },
        { platform: "instagram" as const, text: `Caption ${milestone.id}` },
      ],
    })),
    selectedMilestoneId: milestones[0]?.id ?? null,
  };
}

function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + days);
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("main event image reuse", () => {
  it("auto-fills -14/-7/-1/0 and leaves captions alone", () => {
    const base = withRelativeDay(buildDefaultSession("e1", "Fair", "2026-09-01"), [
      -14, -7, -1, 0, 2,
    ]);
    const art = {
      feedUrl: "https://cdn.example/main.png",
      storyUrl: "https://cdn.example/main-story.png",
    };
    const { session } = applyArtworkWithMainEventReuse(base, "ms--14", art);

    assert.equal(session.mainEventImage?.feedUrl, art.feedUrl);
    for (const id of ["ms--14", "ms--7", "ms--1", "ms-0"]) {
      const row = session.previewContents.find((p) => p.milestoneId === id);
      assert.equal(row?.artwork.feedUrl, art.feedUrl);
      assert.equal(row?.artworkMode, "shared");
      assert.equal(usesMainEventImage(row, session.mainEventImage), true);
      assert.match(row?.captions[0]?.text ?? "", /Caption/);
    }
    const recap = session.previewContents.find((p) => p.milestoneId === "ms-2");
    assert.equal(recap?.artwork.feedUrl, null);
    assert.notEqual(recap?.artworkMode, "shared");
  });

  it("keeps custom posts independent when main updates", () => {
    const base = withRelativeDay(buildDefaultSession("e1", "Fair", "2026-09-01"), [
      -14, -7, -1,
    ]);
    const first = {
      feedUrl: "https://cdn.example/a.png",
      storyUrl: null,
    };
    let { session } = applyArtworkWithMainEventReuse(base, "ms--14", first);
    session = detachMainEventImage(session, "ms--7");
    const customArt = {
      feedUrl: "https://cdn.example/custom.png",
      storyUrl: null,
    };
    ({ session } = applyArtworkWithMainEventReuse(session, "ms--7", customArt, {
      asCustom: true,
    }));

    const nextMain = {
      feedUrl: "https://cdn.example/b.png",
      storyUrl: null,
    };
    ({ session } = applyArtworkWithMainEventReuse(session, "ms--14", nextMain));

    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--7")?.artwork
        .feedUrl,
      customArt.feedUrl,
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--1")?.artwork
        .feedUrl,
      nextMain.feedUrl,
    );
  });

  it("apply to all overwrites every post as shared", () => {
    const base = withRelativeDay(buildDefaultSession("e1", "Fair", "2026-09-01"), [
      -14, -7, 2,
    ]);
    let { session } = applyArtworkWithMainEventReuse(base, "ms--14", {
      feedUrl: "https://cdn.example/a.png",
      storyUrl: null,
    });
    session = detachMainEventImage(session, "ms-2");
    ({ session } = applyArtworkWithMainEventReuse(
      session,
      "ms-2",
      { feedUrl: "https://cdn.example/custom.png", storyUrl: null },
      { asCustom: true },
    ));

    const art = {
      feedUrl: "https://cdn.example/all.png",
      storyUrl: null,
    };
    ({ session } = applyImageToAllPosts(session, art, "ms--14"));

    for (const row of session.previewContents) {
      assert.equal(row.artwork.feedUrl, art.feedUrl);
      assert.equal(row.artworkMode, "shared");
    }
  });
});
