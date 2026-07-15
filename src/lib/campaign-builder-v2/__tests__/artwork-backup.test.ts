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

  it("does not restore artwork by milestone name when ids differ", () => {
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
    assert.equal(restored.previewContents[0]?.artwork.feedUrl, null);
  });

  it("exact milestoneId match wins over a conflicting name-only backup entry", () => {
    const session = buildDefaultSession(
      "evt-art",
      "Back to School Fair",
      "2026-08-17",
    );
    const milestoneId = session.milestones[0].id;
    const milestoneName = session.milestones[0].name;
    const backup: ArtworkBackupMap = {
      [milestoneId]: {
        milestoneId,
        milestoneName,
        artwork: {
          feedUrl: "https://x/campaign-builder-v2/generated/id-match.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "From id" },
          { platform: "instagram", text: "From id" },
        ],
        generationStatus: "generated",
      },
      "other-id-same-name": {
        milestoneId: "other-id-same-name",
        milestoneName,
        artwork: {
          feedUrl: "https://x/campaign-builder-v2/generated/name-only.png",
          storyUrl: null,
        },
        captions: [
          { platform: "facebook", text: "From name" },
          { platform: "instagram", text: "From name" },
        ],
        generationStatus: "generated",
      },
    };

    const restored = applyArtworkBackup(session, backup);
    assert.equal(
      restored.previewContents[0]?.artwork.feedUrl,
      "https://x/campaign-builder-v2/generated/id-match.png",
    );
    assert.equal(restored.previewContents[0]?.captions[0]?.text, "From id");
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

  it("does not apply name fallback when duplicate milestone names collide", () => {
    const session = buildDefaultSession(
      "evt-dup",
      "Back to School Fair",
      "2026-08-17",
    );
    const emptyPreview = session.previewContents[0];
    assert.ok(emptyPreview);
    assert.equal(emptyPreview.artwork.feedUrl, null);

    const targetId = session.milestones[0].id;
    const backup = {
      "other-a": {
        milestoneId: "other-a",
        milestoneName: session.milestones[0].name,
        artwork: {
          feedUrl: "https://x/campaign-builder-v2/generated/a.png",
          storyUrl: null,
        },
        captions: emptyPreview.captions,
        generationStatus: "generated" as const,
      },
      "other-b": {
        milestoneId: "other-b",
        milestoneName: session.milestones[0].name,
        artwork: {
          feedUrl: "https://x/campaign-builder-v2/generated/b.png",
          storyUrl: null,
        },
        captions: emptyPreview.captions,
        generationStatus: "generated" as const,
      },
    };

    const restored = applyArtworkBackup(session, backup);
    const preview = restored.previewContents.find((entry) => entry.milestoneId === targetId);
    assert.equal(preview?.artwork.feedUrl, null);
  });
});
