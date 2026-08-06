import "server-only";

import { getCampaignFilesForEvent } from "@/lib/campaign-files/queries";
import { getEventById } from "@/lib/events/queries";
import {
  FLYER_COMPOSER_SAVED_LIST_CAP,
  mapCampaignFileToSavedFlyer,
  type SavedFlyerComposerFile,
} from "@/lib/flyer-composer/saved-flyers-map";

export {
  FLYER_COMPOSER_SAVED_LIST_CAP,
  mapCampaignFileToSavedFlyer,
  type SavedFlyerComposerFile,
} from "@/lib/flyer-composer/saved-flyers-map";

/**
 * Event-scoped flyer PNGs/JPGs from Files (`event_playbook_files`, category flyer).
 * Access gated by getEventById (org + assigned-only).
 */
export async function listSavedFlyersForEvent(
  eventId: string,
  options?: { limit?: number },
): Promise<
  | { ok: true; eventId: string; eventTitle: string; flyers: SavedFlyerComposerFile[] }
  | { ok: false; error: string }
> {
  const trimmed = eventId.trim();
  if (!trimmed) {
    return { ok: false, error: "eventId is required." };
  }

  const event = await getEventById(trimmed);
  if (!event) {
    return { ok: false, error: "Selected event was not found." };
  }

  const limit = Math.min(
    Math.max(options?.limit ?? FLYER_COMPOSER_SAVED_LIST_CAP, 1),
    50,
  );
  const { files } = await getCampaignFilesForEvent(trimmed, {
    limit: Math.max(limit * 3, 48),
  });

  const flyers: SavedFlyerComposerFile[] = [];
  for (const file of files) {
    const mapped = mapCampaignFileToSavedFlyer(file);
    if (!mapped) continue;
    flyers.push(mapped);
    if (flyers.length >= limit) break;
  }

  return {
    ok: true,
    eventId: event.id,
    eventTitle: event.title,
    flyers,
  };
}
