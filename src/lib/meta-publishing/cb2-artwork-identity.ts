/**
 * Resolve Create with AI / approval artwork for Meta bundles and calendar
 * previews using stable milestone IDs. Display names are legacy fallback only
 * and must never return another milestone's artwork.
 */

import { milestoneNameMatchKey } from "../campaign-builder-v2/milestone-names.ts";

export type Cb2ArtworkRow = {
  campaignMilestoneId: string | null;
  milestoneName: string;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
};

export type Cb2ArtworkSnapshot = {
  campaignMilestoneId: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
};

export type SessionMilestoneRef = {
  id: string;
  name: string;
  /** Playbook relative day when known (negative = before event). */
  relativeDay?: number | null;
};

export type Cb2ArtworkIndex = {
  byMilestoneId: Map<string, Cb2ArtworkSnapshot>;
  /** Unambiguous name-key → snapshot. Colliding names are omitted. */
  byNameKey: Map<string, Cb2ArtworkSnapshot>;
  ambiguousNameKeys: Set<string>;
};

function toSnapshot(row: Cb2ArtworkRow): Cb2ArtworkSnapshot {
  return {
    campaignMilestoneId: row.campaignMilestoneId,
    feedArtworkUrl: row.feedArtworkUrl,
    storyArtworkUrl: row.storyArtworkUrl,
  };
}

export function indexCb2ArtworkRows(rows: Cb2ArtworkRow[]): Cb2ArtworkIndex {
  const byMilestoneId = new Map<string, Cb2ArtworkSnapshot>();
  const byNameKey = new Map<string, Cb2ArtworkSnapshot>();
  const ambiguousNameKeys = new Set<string>();
  const nameOwners = new Map<string, string | null>();

  for (const row of rows) {
    const snapshot = toSnapshot(row);
    const milestoneId = row.campaignMilestoneId?.trim() || null;

    if (milestoneId) {
      byMilestoneId.set(milestoneId, snapshot);
    }

    const nameKey = milestoneNameMatchKey(row.milestoneName);
    if (!nameKey) {
      continue;
    }

    const owner = nameOwners.get(nameKey);
    if (owner === undefined) {
      nameOwners.set(nameKey, milestoneId);
      byNameKey.set(nameKey, snapshot);
      continue;
    }

    // Same name key claimed by a different milestone ID → ambiguous; drop name fallback.
    if (owner !== milestoneId) {
      ambiguousNameKeys.add(nameKey);
      byNameKey.delete(nameKey);
    }
  }

  return { byMilestoneId, byNameKey, ambiguousNameKeys };
}

function snapshotHasArtwork(snapshot: Cb2ArtworkSnapshot | null | undefined): boolean {
  if (!snapshot) {
    return false;
  }
  return Boolean(
    snapshot.feedArtworkUrl?.trim() || snapshot.storyArtworkUrl?.trim(),
  );
}

/**
 * Preferred match order:
 * 1. exact campaign milestone ID
 * 2. session milestone resolved by relative day (+ title when needed)
 * 3. session milestone resolved by unique name → ID
 * 4. unambiguous legacy name key (never first-available / never cross-milestone)
 */
export function resolveCb2ArtworkForMilestone(input: {
  milestoneId?: string | null;
  milestoneTitle?: string | null;
  relativeDay?: number | null;
  sessionMilestones?: SessionMilestoneRef[];
  index: Cb2ArtworkIndex;
}): Cb2ArtworkSnapshot | null {
  const { index } = input;

  const byId = input.milestoneId?.trim()
    ? index.byMilestoneId.get(input.milestoneId.trim())
    : undefined;
  if (snapshotHasArtwork(byId)) {
    return byId ?? null;
  }

  const session = input.sessionMilestones ?? [];
  const titleKey = milestoneNameMatchKey(input.milestoneTitle ?? "");

  if (session.length > 0 && input.relativeDay != null && Number.isFinite(input.relativeDay)) {
    const atDay = session.filter(
      (milestone) => milestone.relativeDay === input.relativeDay,
    );

    if (atDay.length === 1) {
      const only = index.byMilestoneId.get(atDay[0]!.id);
      if (snapshotHasArtwork(only)) {
        return only ?? null;
      }
    }

    if (titleKey && atDay.length > 1) {
      const named = atDay.filter(
        (milestone) => milestoneNameMatchKey(milestone.name) === titleKey,
      );
      if (named.length === 1) {
        const match = index.byMilestoneId.get(named[0]!.id);
        if (snapshotHasArtwork(match)) {
          return match ?? null;
        }
      }
    }
  }

  if (session.length > 0 && titleKey) {
    const named = session.filter(
      (milestone) => milestoneNameMatchKey(milestone.name) === titleKey,
    );
    if (named.length === 1) {
      const match = index.byMilestoneId.get(named[0]!.id);
      if (snapshotHasArtwork(match)) {
        return match ?? null;
      }
    }
  }

  if (titleKey && !index.ambiguousNameKeys.has(titleKey)) {
    const byName = index.byNameKey.get(titleKey);
    if (snapshotHasArtwork(byName)) {
      return byName ?? null;
    }
  }

  return null;
}
