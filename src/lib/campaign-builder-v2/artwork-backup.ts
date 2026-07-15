/**
 * Durable per-event backup of generated Preview artwork.
 *
 * Campaign Builder sessions live primarily in localStorage (the
 * `campaign_builder_sessions` table is often unreachable). A one-off
 * storage purge also shipped an always-on hydrate strip that deleted any
 * `/campaign-builder-v2/generated/` URL — including brand-new generations —
 * every time the page remounted.
 *
 * This backup is intentionally separate from the full session blob so
 * artwork survives:
 * - full-session merge mistakes
 * - localStorage quota failures on the large session write
 * - leftover cleanup / normalize logic
 */

import type {
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  MilestoneArtwork,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
  PlatformCaption,
} from "./types.ts";
import { milestoneHasArtwork } from "./milestone-status.ts";

export interface ArtworkBackupEntry {
  milestoneId: string;
  milestoneName: string;
  artwork: MilestoneArtwork;
  captions: PlatformCaption[];
  generationStatus: MilestoneGenerationStatus;
}

export type ArtworkBackupMap = Record<string, ArtworkBackupEntry>;

export function artworkBackupKey(eventId: string): string {
  return `campaign-builder-v2-artwork:${eventId}`;
}

export function buildArtworkBackup(
  session: CampaignBuilderSession,
): ArtworkBackupMap {
  const milestoneNameById = new Map(
    session.milestones.map((milestone) => [milestone.id, milestone.name]),
  );
  const backup: ArtworkBackupMap = {};

  for (const preview of session.previewContents) {
    if (!milestoneHasArtwork(preview)) {
      continue;
    }
    backup[preview.milestoneId] = {
      milestoneId: preview.milestoneId,
      milestoneName: milestoneNameById.get(preview.milestoneId) ?? "",
      artwork: {
        feedUrl: preview.artwork.feedUrl,
        storyUrl: preview.artwork.storyUrl,
      },
      captions: preview.captions,
      generationStatus:
        preview.generationStatus === "generated" ||
        preview.generationStatus === "needs_review"
          ? preview.generationStatus
          : "generated",
    };
  }

  return backup;
}

export function persistArtworkBackup(session: CampaignBuilderSession): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const backup = buildArtworkBackup(session);
    const key = artworkBackupKey(session.eventId);
    if (Object.keys(backup).length === 0) {
      // Do not delete an existing backup when the in-memory session is briefly
      // empty (e.g. mid-hydrate). Only overwrite when we have artwork to keep.
      return true;
    }
    window.localStorage.setItem(key, JSON.stringify(backup));
    return true;
  } catch {
    console.error(
      "Campaign builder: could not persist artwork backup to localStorage.",
    );
    return false;
  }
}

export function loadArtworkBackup(eventId: string): ArtworkBackupMap | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(artworkBackupKey(eventId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ArtworkBackupMap;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function backupEntryForMilestone(
  backup: ArtworkBackupMap,
  milestone: CampaignBuilderMilestone,
): ArtworkBackupEntry | null {
  // Exact milestoneId only — never match by name. Shared playbook titles
  // across campaigns must not pull another milestone's artwork/captions.
  const byId = backup[milestone.id];
  if (byId && (byId.artwork.feedUrl || byId.artwork.storyUrl)) {
    return byId;
  }

  return null;
}

/** Re-apply backed-up artwork onto a hydrated session when previews are empty. */
export function applyArtworkBackup(
  session: CampaignBuilderSession,
  backup: ArtworkBackupMap | null,
): CampaignBuilderSession {
  if (!backup || Object.keys(backup).length === 0) {
    return session;
  }

  let changed = false;
  const previewContents = session.previewContents.map((preview) => {
    if (milestoneHasArtwork(preview)) {
      return preview;
    }

    const milestone = session.milestones.find(
      (entry) => entry.id === preview.milestoneId,
    );
    if (!milestone) {
      return preview;
    }

    const entry = backupEntryForMilestone(backup, milestone);
    if (!entry) {
      return preview;
    }

    changed = true;
    return {
      ...preview,
      artwork: {
        feedUrl: entry.artwork.feedUrl,
        storyUrl: entry.artwork.storyUrl,
      },
      captions:
        entry.captions?.some((caption) => caption.text.trim())
          ? entry.captions
          : preview.captions,
      generationStatus: entry.generationStatus,
      status: "ready" as const,
      generationStartedAt: null,
    } satisfies MilestonePreviewContent;
  });

  if (!changed) {
    return session;
  }

  return { ...session, previewContents };
}
