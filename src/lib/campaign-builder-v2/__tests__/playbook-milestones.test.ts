import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  milestonesLostOnPlaybookSwitch,
  playbookSwitchConfirmMessage,
  reconcileMilestonesWithPlaybookSteps,
  type PlaybookMilestoneStep,
} from "../playbook-milestones.ts";
import { emptyMilestoneArtwork } from "../platform-utils.ts";
import type {
  CampaignBuilderMilestone,
  MilestonePreviewContent,
} from "../types.ts";

function step(
  overrides: Partial<PlaybookMilestoneStep> &
    Pick<PlaybookMilestoneStep, "title" | "relativeDay" | "sortOrder">,
): PlaybookMilestoneStep {
  return {
    channel: "instagram",
    ...overrides,
  };
}

function milestone(
  overrides: Partial<CampaignBuilderMilestone> &
    Pick<CampaignBuilderMilestone, "id" | "name" | "sortOrder">,
): CampaignBuilderMilestone {
  return {
    category: "reminder",
    purpose: "Old purpose",
    suggestedDate: "2026-08-01",
    platforms: ["facebook", "instagram"],
    platformFormats: ["facebook-feed", "instagram-feed"],
    artworkNotes: "",
    captionNotes: "",
    statusTag: "not-started",
    ...overrides,
  };
}

function preview(
  milestoneId: string,
  overrides: Partial<MilestonePreviewContent> = {},
): MilestonePreviewContent {
  return {
    milestoneId,
    status: "draft",
    artwork: emptyMilestoneArtwork(),
    captions: [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    enabledFormats: ["facebook-feed", "instagram-feed"],
    deliveryMethod: "auto-publish",
    scheduleDate: "2026-08-01",
    scheduleTime: "09:00",
    emailSendDate: "2026-08-01",
    emailSendTime: "09:00",
    manualEmailTo: "",
    manualUploadLink: "",
    approvalStatuses: [],
    ...overrides,
  };
}

const playbookA: PlaybookMilestoneStep[] = [
  step({ title: "Save the Date", relativeDay: -30, sortOrder: 0 }),
  step({ title: "Two-Week Push", relativeDay: -14, sortOrder: 1 }),
  step({ title: "Day Before", relativeDay: -1, sortOrder: 2 }),
];

const playbookB: PlaybookMilestoneStep[] = [
  step({ title: "Volunteer Drive", relativeDay: -21, sortOrder: 0 }),
  step({ title: "One-Week Push", relativeDay: -7, sortOrder: 1 }),
  step({ title: "Thank You", relativeDay: 1, sortOrder: 2 }),
];

describe("playbook milestone reconcile", () => {
  it("replaces timeline when switching from playbook A to playbook B", () => {
    const seeded = reconcileMilestonesWithPlaybookSteps(
      playbookA,
      "2026-08-17",
      [],
      [],
    );
    assert.equal(seeded.milestones.length, 3);
    assert.deepEqual(
      seeded.milestones.map((entry) => entry.name),
      ["Save the Date", "Two-Week Push", "Day Before"],
    );

    const switched = reconcileMilestonesWithPlaybookSteps(
      playbookB,
      "2026-08-17",
      seeded.milestones,
      seeded.previewContents,
    );

    assert.equal(switched.milestones.length, 3);
    assert.deepEqual(
      switched.milestones.map((entry) => entry.name),
      ["Volunteer Drive", "One-Week Push", "Thank You"],
    );
    assert.equal(
      switched.milestones.some((entry) => entry.name === "Save the Date"),
      false,
    );
  });

  it("does not create duplicates after multiple playbook switches", () => {
    let milestones: CampaignBuilderMilestone[] = [];
    let previewContents: MilestonePreviewContent[] = [];

    for (const steps of [playbookA, playbookB, playbookA, playbookB]) {
      const next = reconcileMilestonesWithPlaybookSteps(
        steps,
        "2026-08-17",
        milestones,
        previewContents,
      );
      milestones = next.milestones;
      previewContents = next.previewContents;
    }

    assert.equal(milestones.length, playbookB.length);
    assert.equal(previewContents.length, playbookB.length);
    assert.equal(new Set(milestones.map((entry) => entry.id)).size, playbookB.length);
    assert.deepEqual(
      milestones.map((entry) => entry.name),
      ["Volunteer Drive", "One-Week Push", "Thank You"],
    );
  });

  it("preserves artwork only on name-matched milestones", () => {
    const existing = [
      milestone({ id: "keep-me", name: "One-Week Push", sortOrder: 0 }),
      milestone({ id: "drop-me", name: "Save the Date", sortOrder: 1 }),
    ];
    const existingPreview = [
      preview("keep-me", {
        artwork: {
          feedUrl: "https://cdn.example/one-week.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "Keep this caption" },
          { platform: "instagram", text: "Keep this caption" },
        ],
      }),
      preview("drop-me", {
        artwork: {
          feedUrl: "https://cdn.example/save-the-date.png",
          storyUrl: null,
        },
      }),
    ];

    const rebuilt = reconcileMilestonesWithPlaybookSteps(
      playbookB,
      "2026-08-17",
      existing,
      existingPreview,
    );

    const oneWeek = rebuilt.milestones.find((entry) => entry.name === "One-Week Push");
    assert.ok(oneWeek);
    assert.equal(oneWeek.id, "keep-me");
    assert.equal(
      rebuilt.previewContents.find((entry) => entry.milestoneId === "keep-me")
        ?.artwork.feedUrl,
      "https://cdn.example/one-week.png",
    );
    assert.equal(
      rebuilt.previewContents.some((entry) => entry.milestoneId === "drop-me"),
      false,
    );
  });

  it("refreshes purpose and dates from the selected playbook", () => {
    const existing = [
      milestone({
        id: "ms-1",
        name: "One-Week Push",
        sortOrder: 0,
        purpose: "Stale purpose from prior playbook",
        suggestedDate: "2020-01-01",
      }),
    ];

    const rebuilt = reconcileMilestonesWithPlaybookSteps(
      playbookB,
      "2026-08-17",
      existing,
      [preview("ms-1")],
    );

    const oneWeek = rebuilt.milestones.find((entry) => entry.name === "One-Week Push");
    assert.ok(oneWeek);
    assert.equal(
      oneWeek.purpose,
      "Drive attendance with schedule highlights",
    );
    assert.equal(oneWeek.suggestedDate, "2026-08-10");
  });

  it("flags milestones with work that would be lost on switch", () => {
    const existing = [
      milestone({
        id: "ms-art",
        name: "Save the Date",
        sortOrder: 0,
        artworkNotes: "custom note",
      }),
      milestone({ id: "ms-empty", name: "Day Before", sortOrder: 1 }),
    ];
    const existingPreview = [
      preview("ms-art", {
        artwork: { feedUrl: "https://cdn.example/a.png", storyUrl: null },
      }),
      preview("ms-empty"),
    ];

    const atRisk = milestonesLostOnPlaybookSwitch(
      playbookB,
      existing,
      existingPreview,
    );
    assert.equal(atRisk.length, 1);
    assert.equal(atRisk[0]?.id, "ms-art");
    assert.match(playbookSwitchConfirmMessage(atRisk), /milestone timeline/i);
  });

  it("does not attach prior artwork to a different milestone name", () => {
    const existing = [
      milestone({ id: "ms-old", name: "Save the Date", sortOrder: 0 }),
    ];
    const existingPreview = [
      preview("ms-old", {
        artwork: {
          feedUrl: "https://cdn.example/save-the-date.png",
          storyUrl: null,
        },
      }),
    ];

    const rebuilt = reconcileMilestonesWithPlaybookSteps(
      playbookB,
      "2026-08-17",
      existing,
      existingPreview,
    );

    for (const content of rebuilt.previewContents) {
      assert.notEqual(
        content.artwork.feedUrl,
        "https://cdn.example/save-the-date.png",
      );
    }
  });
});
