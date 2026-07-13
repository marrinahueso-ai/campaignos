import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyArtworkBackup,
  buildArtworkBackup,
  type ArtworkBackupMap,
} from "../artwork-backup.ts";
import { buildDefaultSession } from "../seed-data.ts";

describe("artwork-backup", () => {
  it("builds a backup only for previews that have real artwork urls", () => {
    const session = buildDefaultSession(
      "evt-art",
      "Back to School Fair",
      "2026-08-17",
    );
    const withArt = {
      ...session,
      previewContents: session.previewContents.map((content, index) =>
        index === 0
          ? {
              ...content,
              generationStatus: "generated" as const,
              artwork: {
                feedUrl: "https://x/campaign-builder-v2/generated/a.png",
                storyUrl: null,
              },
            }
          : content,
      ),
    };

    const backup = buildArtworkBackup(withArt);
    assert.equal(Object.keys(backup).length, 1);
    assert.equal(
      backup[session.previewContents[0].milestoneId]?.artwork.feedUrl,
      "https://x/campaign-builder-v2/generated/a.png",
    );
  });

  it("restores backed-up artwork onto empty hydrated previews by milestone id", () => {
    const session = buildDefaultSession(
      "evt-art",
      "Back to School Fair",
      "2026-08-17",
    );
    const milestoneId = session.milestones[0].id;
    const backup: ArtworkBackupMap = {
      [milestoneId]: {
        milestoneId,
        milestoneName: session.milestones[0].name,
        artwork: {
          feedUrl: "https://x/campaign-builder-v2/generated/restored.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "Restored caption" },
          { platform: "instagram", text: "Restored caption" },
        ],
        generationStatus: "generated",
      },
    };

    const restored = applyArtworkBackup(session, backup);
    assert.equal(
      restored.previewContents[0]?.artwork.feedUrl,
      "https://x/campaign-builder-v2/generated/restored.png",
    );
    assert.equal(restored.previewContents[0]?.generationStatus, "generated");
    assert.equal(restored.previewContents[0]?.captions[0]?.text, "Restored caption");
  });

  it("restores artwork by milestone name when ids churn after a playbook rebuild", () => {
    const session = buildDefaultSession(
      "evt-art",
      "Back to School Fair",
      "2026-08-17",
    );
    const renamed = {
      ...session,
      milestones: session.milestones.map((milestone, index) =>
        index === 0
          ? { ...milestone, id: "new-playbook-id", name: "14 Days Out" }
          : milestone,
      ),
      previewContents: session.previewContents.map((content, index) =>
        index === 0
          ? { ...content, milestoneId: "new-playbook-id" }
          : content,
      ),
    };

    const backup: ArtworkBackupMap = {
      "old-playbook-id": {
        milestoneId: "old-playbook-id",
        milestoneName: "14 Days Out",
        artwork: {
          feedUrl: "https://x/campaign-builder-v2/generated/14.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "" },
          { platform: "instagram", text: "" },
        ],
        generationStatus: "generated",
      },
    };

    const restored = applyArtworkBackup(renamed, backup);
    assert.equal(
      restored.previewContents[0]?.artwork.feedUrl,
      "https://x/campaign-builder-v2/generated/14.png",
    );
  });

  it("never overwrites previews that already have artwork", () => {
    const session = buildDefaultSession(
      "evt-art",
      "Back to School Fair",
      "2026-08-17",
    );
    const milestoneId = session.milestones[0].id;
    const existing = {
      ...session,
      previewContents: session.previewContents.map((content, index) =>
        index === 0
          ? {
              ...content,
              artwork: {
                feedUrl: "https://x/campaign-builder-v2/generated/keep.png",
                storyUrl: null,
              },
            }
          : content,
      ),
    };
    const backup: ArtworkBackupMap = {
      [milestoneId]: {
        milestoneId,
        milestoneName: session.milestones[0].name,
        artwork: {
          feedUrl: "https://x/campaign-builder-v2/generated/older.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "" },
          { platform: "instagram", text: "" },
        ],
        generationStatus: "generated",
      },
    };

    const restored = applyArtworkBackup(existing, backup);
    assert.equal(
      restored.previewContents[0]?.artwork.feedUrl,
      "https://x/campaign-builder-v2/generated/keep.png",
    );
  });
});
