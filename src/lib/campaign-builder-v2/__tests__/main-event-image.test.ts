import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDefaultSession } from "../seed-data.ts";
import {
  applyArtworkWithMainEventReuse,
  detachMainEventImage,
  reapplyMainEventImageAfterPlanChange,
  resolveDisplayMainEventImage,
  seedMainEventImageAcrossPlan,
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
  it("auto-fills every empty plan post and leaves captions alone", () => {
    const base = withRelativeDay(buildDefaultSession("e1", "Fair", "2026-09-01"), [
      -14, -7, -1, 0, 2,
    ]);
    const art = {
      feedUrl: "https://cdn.example/main.png",
      storyUrl: "https://cdn.example/main-story.png",
    };
    const { session } = applyArtworkWithMainEventReuse(base, "ms--14", art);

    assert.equal(session.mainEventImage?.feedUrl, art.feedUrl);
    for (const id of ["ms--14", "ms--7", "ms--1", "ms-0", "ms-2"]) {
      const row = session.previewContents.find((p) => p.milestoneId === id);
      assert.equal(row?.artwork.feedUrl, art.feedUrl);
      assert.equal(row?.artworkMode, "shared");
      assert.equal(usesMainEventImage(row, session.mainEventImage), true);
      assert.match(row?.captions[0]?.text ?? "", /Caption/);
    }
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
    // Regenerating the first post after others already have art must not
    // overwrite the rest of the timeline (including still-shared posts).
    ({ session } = applyArtworkWithMainEventReuse(session, "ms--14", nextMain));

    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--7")?.artwork
        .feedUrl,
      customArt.feedUrl,
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--14")?.artwork
        .feedUrl,
      nextMain.feedUrl,
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--14")
        ?.artworkMode,
      "custom",
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--1")?.artwork
        .feedUrl,
      first.feedUrl,
    );
  });

  it("does not re-waterfall when regenerating one post after a shared fill", () => {
    const base = withRelativeDay(buildDefaultSession("e1", "Fair", "2026-09-01"), [
      -14, -7, -1,
    ]);
    const first = {
      feedUrl: "https://cdn.example/waterfall.png",
      storyUrl: null,
    };
    let { session } = applyArtworkWithMainEventReuse(base, "ms--14", first);
    const regen = {
      feedUrl: "https://cdn.example/two-weeks-only.png",
      storyUrl: null,
    };
    ({ session } = applyArtworkWithMainEventReuse(session, "ms--14", regen));

    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--14")?.artwork
        .feedUrl,
      regen.feedUrl,
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--7")?.artwork
        .feedUrl,
      first.feedUrl,
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--1")?.artwork
        .feedUrl,
      first.feedUrl,
    );
  });

  it("fills a newly added empty post with the shared event image", () => {
    const base = withRelativeDay(buildDefaultSession("e1", "Fair", "2026-09-01"), [
      -14, -7,
    ]);
    const art = {
      feedUrl: "https://cdn.example/main.png",
      storyUrl: null,
    };
    let { session } = applyArtworkWithMainEventReuse(base, "ms--14", art);

    const emptyRow = {
      ...session.previewContents[0]!,
      milestoneId: "ms-new",
      artwork: { feedUrl: null, storyUrl: null },
      artworkMode: undefined,
      captions: [
        { platform: "facebook" as const, text: "Caption ms-new" },
        { platform: "instagram" as const, text: "Caption ms-new" },
      ],
    };
    session = {
      ...session,
      milestones: [
        ...session.milestones,
        {
          ...session.milestones[0]!,
          id: "ms-new",
          name: "New post",
          sortOrder: session.milestones.length,
        },
      ],
      previewContents: [...session.previewContents, emptyRow],
    };

    ({ session } = seedMainEventImageAcrossPlan(
      session,
      resolveDisplayMainEventImage(session)!,
    ));

    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms-new")?.artwork
        .feedUrl,
      art.feedUrl,
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms-new")
        ?.artworkMode,
      "shared",
    );
  });

  it("waterfalls on first fill even when source mode was custom but art was cleared", () => {
    const base = withRelativeDay(buildDefaultSession("e1", "Fair", "2026-09-01"), [
      -14, -7, -1,
    ]);
    const art = {
      feedUrl: "https://cdn.example/after-clear.png",
      storyUrl: null,
    };
    const stuckCustomEmpty = {
      ...base,
      previewContents: base.previewContents.map((row) =>
        row.milestoneId === "ms--14"
          ? {
              ...row,
              artwork: { feedUrl: null, storyUrl: null },
              artworkMode: "custom" as const,
            }
          : row,
      ),
    };
    const { session } = applyArtworkWithMainEventReuse(
      stuckCustomEmpty,
      "ms--14",
      art,
    );
    for (const id of ["ms--14", "ms--7", "ms--1"]) {
      assert.equal(
        session.previewContents.find((p) => p.milestoneId === id)?.artwork
          .feedUrl,
        art.feedUrl,
      );
      assert.equal(
        session.previewContents.find((p) => p.milestoneId === id)?.artworkMode,
        "shared",
      );
    }
  });

  it("keeps Apply-without-asCustom local after other posts already have art", () => {
    const base = withRelativeDay(buildDefaultSession("e1", "Fair", "2026-09-01"), [
      -14, -7, -1,
    ]);
    const first = {
      feedUrl: "https://cdn.example/shared.png",
      storyUrl: null,
    };
    let { session } = applyArtworkWithMainEventReuse(base, "ms--14", first);
    const regen = {
      feedUrl: "https://cdn.example/only-one.png",
      storyUrl: null,
    };
    // Same call path as Edit Apply (no asCustom) after a shared fill.
    ({ session } = applyArtworkWithMainEventReuse(session, "ms--7", regen));
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--7")?.artwork
        .feedUrl,
      regen.feedUrl,
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--7")
        ?.artworkMode,
      "custom",
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--14")?.artwork
        .feedUrl,
      first.feedUrl,
    );
    assert.equal(
      session.previewContents.find((p) => p.milestoneId === "ms--1")?.artwork
        .feedUrl,
      first.feedUrl,
    );
  });

  it("reapplies event image onto empty posts after a plan change", () => {
    const previous = withRelativeDay(
      buildDefaultSession("e1", "Fair", "2026-09-01"),
      [-14, -7],
    );
    const art = {
      feedUrl: "https://cdn.example/kept.png",
      storyUrl: null,
    };
    const seeded = applyArtworkWithMainEventReuse(previous, "ms--14", art).session;

    const nextPlan = withRelativeDay(
      buildDefaultSession("e1", "Fair", "2026-09-01"),
      [-3, -1, 0],
    );
    // Simulate rebuild: new empty posts, no artwork carried by name match.
    const rebuilt = {
      ...nextPlan,
      mainEventImage: null,
      previewContents: nextPlan.previewContents.map((row) => ({
        ...row,
        artwork: { feedUrl: null, storyUrl: null },
        artworkMode: undefined,
      })),
    };

    const { session } = reapplyMainEventImageAfterPlanChange(rebuilt, seeded);
    assert.equal(session.mainEventImage?.feedUrl, art.feedUrl);
    for (const row of session.previewContents) {
      assert.equal(row.artwork.feedUrl, art.feedUrl);
      assert.equal(row.artworkMode, "shared");
    }
  });
});
