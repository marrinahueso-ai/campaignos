/**
 * Client-side localStorage clear for Create with AI generated content.
 * Exact eventId + milestoneId only — never by name.
 */

import {
  artworkBackupKey,
  loadArtworkBackup,
  type ArtworkBackupMap,
} from "@/lib/campaign-builder-v2/artwork-backup";
import { localSessionKey } from "@/lib/campaign-builder-v2/seed-data";
import { clearSessionGeneratedContent } from "@/lib/dev-tools/clear-generated-content";
import type { CampaignBuilderSession } from "@/lib/campaign-builder-v2/types";

function readLocalSession(eventId: string): CampaignBuilderSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(localSessionKey(eventId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CampaignBuilderSession;
  } catch {
    return null;
  }
}

function writeLocalSession(session: CampaignBuilderSession): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      localSessionKey(session.eventId),
      JSON.stringify(session),
    );
  } catch {
    console.error("Could not write cleared campaign builder session.");
  }
}

function writeArtworkBackup(eventId: string, backup: ArtworkBackupMap): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const key = artworkBackupKey(eventId);
    if (Object.keys(backup).length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(backup));
  } catch {
    console.error("Could not write cleared artwork backup.");
  }
}

/** Clear local session + artwork backup for exact milestone IDs (or all). */
export function clearLocalGeneratedContent(
  eventId: string,
  milestoneIds: string[] | "all",
): CampaignBuilderSession | null {
  const session = readLocalSession(eventId);
  if (!session || session.eventId !== eventId) {
    // Still wipe backup entries for this event/milestones.
    const backup = loadArtworkBackup(eventId);
    if (backup) {
      if (milestoneIds === "all") {
        writeArtworkBackup(eventId, {});
      } else {
        const next = { ...backup };
        for (const id of milestoneIds) {
          delete next[id];
        }
        writeArtworkBackup(eventId, next);
      }
    }
    return null;
  }

  const cleared = clearSessionGeneratedContent(session, milestoneIds);
  writeLocalSession(cleared.next);

  const backup = loadArtworkBackup(eventId);
  if (backup) {
    if (milestoneIds === "all") {
      writeArtworkBackup(eventId, {});
    } else {
      const next = { ...backup };
      for (const id of milestoneIds) {
        delete next[id];
      }
      writeArtworkBackup(eventId, next);
    }
  }

  return cleared.next;
}
