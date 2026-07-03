import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import {
  resolveTimingPresetId,
  type TimingPresetId,
} from "@/lib/playbooks/timing-presets";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventAsset, EventAssetType } from "@/types/event-workspace";
import type { EventCommunicationStep, EventType } from "@/types/playbooks";

function shouldShowPhaseArtwork(communicationStrategy: CommunicationStrategy): boolean {
  return (
    communicationStrategy === "full_campaign" ||
    communicationStrategy === "reminder_only"
  );
}

/** Where this asset publishes on Meta — same 1:1 feed image goes to FB + IG feed; story to FB + IG story. */
export type MetaArtworkPlacement = "feed" | "story";

export interface MetaArtworkMilestone {
  relativeDay: number;
  title: string;
}

export interface MetaArtworkPhaseDefinition {
  relativeDay: number;
  title: string;
  assetType: EventAssetType;
  formatLabel: string;
  metaPlacement: MetaArtworkPlacement;
}

export interface ArtworkPhaseWorkflowItem extends ArtworkWorkflowItem {
  relativeDay: number;
  formatLabel: string;
  metaPlacement: MetaArtworkPlacement;
  communicationStepId: null;
  channelLabel: string;
}

const META_FORMATS: {
  metaPlacement: MetaArtworkPlacement;
  assetType: EventAssetType;
  formatLabel: string;
  idSuffix: string;
}[] = [
  {
    metaPlacement: "feed",
    assetType: "instagram_graphic",
    formatLabel: "Feed (1:1)",
    idSuffix: "feed",
  },
  {
    metaPlacement: "story",
    assetType: "instagram_story",
    formatLabel: "Story",
    idSuffix: "story",
  },
];

const BOOK_FAIR_MILESTONES: MetaArtworkMilestone[] = [
  { relativeDay: -30, title: "Save the Date" },
  { relativeDay: -14, title: "Two-Week Reminder" },
  { relativeDay: -7, title: "One-Week Push" },
  { relativeDay: -3, title: "Final Reminder" },
  { relativeDay: -1, title: "Day Before" },
  { relativeDay: 0, title: "Day Of" },
  { relativeDay: 1, title: "Thank You" },
];

const FULL_EVENT_MILESTONES: MetaArtworkMilestone[] = [
  { relativeDay: -30, title: "Save the Date" },
  { relativeDay: -21, title: "Volunteer Drive" },
  { relativeDay: -14, title: "Two-Week Reminder" },
  { relativeDay: -7, title: "One-Week Push" },
  { relativeDay: -3, title: "Final Details" },
  { relativeDay: -1, title: "Day Before" },
  { relativeDay: 0, title: "Day Of" },
  { relativeDay: 1, title: "Thank You" },
];

const PTO_MEETING_MILESTONES: MetaArtworkMilestone[] = [
  { relativeDay: -3, title: "3 Days Out" },
  { relativeDay: -1, title: "Day Before" },
  { relativeDay: 0, title: "Day Of" },
  { relativeDay: 1, title: "Thank You" },
];

const RECOGNITION_MILESTONES: MetaArtworkMilestone[] = [
  { relativeDay: 0, title: "Day Of" },
];

const EARLY_RELEASE_MILESTONES: MetaArtworkMilestone[] = [
  { relativeDay: -1, title: "Day Before" },
  { relativeDay: 0, title: "Day Of" },
];

const HOLIDAY_MILESTONES: MetaArtworkMilestone[] = [
  { relativeDay: -7, title: "Week Before Reminder" },
  { relativeDay: -1, title: "Day Before" },
];

const META_MILESTONES_BY_PRESET: Record<TimingPresetId, MetaArtworkMilestone[]> = {
  full_event: FULL_EVENT_MILESTONES,
  book_fair: BOOK_FAIR_MILESTONES,
  pto_meeting: PTO_MEETING_MILESTONES,
  recognition: RECOGNITION_MILESTONES,
  early_release: EARLY_RELEASE_MILESTONES,
  holiday: HOLIDAY_MILESTONES,
};

function filterMilestonesForReminderOnly(
  milestones: MetaArtworkMilestone[],
): MetaArtworkMilestone[] {
  return milestones.filter(
    (milestone) => milestone.relativeDay >= -3 && milestone.relativeDay <= 0,
  );
}

function expandMilestone(milestone: MetaArtworkMilestone): MetaArtworkPhaseDefinition[] {
  return META_FORMATS.map((format) => ({
    relativeDay: milestone.relativeDay,
    title: milestone.title,
    assetType: format.assetType,
    formatLabel: format.formatLabel,
    metaPlacement: format.metaPlacement,
  }));
}

export function resolveMetaArtworkMilestonesForEvent(input: {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
}): MetaArtworkMilestone[] {
  if (!shouldShowPhaseArtwork(input.communicationStrategy)) {
    return [];
  }

  const presetId = resolveTimingPresetId(input.eventType);
  const baseMilestones = META_MILESTONES_BY_PRESET[presetId];

  if (input.communicationStrategy === "reminder_only") {
    return filterMilestonesForReminderOnly(baseMilestones);
  }

  return baseMilestones;
}

export function resolveMetaArtworkPhasesForEvent(input: {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
}): MetaArtworkPhaseDefinition[] {
  return resolveMetaArtworkMilestonesForEvent(input).flatMap(expandMilestone);
}

export function buildPhasePlanLabel(title: string, formatLabel: string): string {
  return `${title} — ${formatLabel}`;
}

function buildPhaseItem(definition: MetaArtworkPhaseDefinition): ArtworkPhaseWorkflowItem {
  const format = META_FORMATS.find(
    (entry) => entry.metaPlacement === definition.metaPlacement,
  );

  return {
    id: `phase-rd-${definition.relativeDay}-${format?.idSuffix ?? definition.metaPlacement}`,
    label: definition.title,
    assetType: definition.assetType,
    planLabel: buildPhasePlanLabel(definition.title, definition.formatLabel),
    relativeDay: definition.relativeDay,
    formatLabel: definition.formatLabel,
    metaPlacement: definition.metaPlacement,
    communicationStepId: null,
    channelLabel: definition.formatLabel,
  };
}

export function milestonesFromCommunicationSteps(
  steps: EventCommunicationStep[],
  options?: { socialOnly?: boolean },
): MetaArtworkMilestone[] {
  let filtered = steps.filter((step) => step.status !== "skipped");

  if (options?.socialOnly) {
    filtered = filtered.filter((step) =>
      (["facebook", "instagram"] as const).includes(
        step.channel as "facebook" | "instagram",
      ),
    );
  }

  const byDay = new Map<number, string>();

  for (const step of filtered.sort(
    (left, right) =>
      left.relativeDay - right.relativeDay || left.sortOrder - right.sortOrder,
  )) {
    if (!byDay.has(step.relativeDay)) {
      byDay.set(step.relativeDay, step.title);
    }
  }

  return Array.from(byDay.entries())
    .sort(([leftDay], [rightDay]) => leftDay - rightDay)
    .map(([relativeDay, title]) => ({ relativeDay, title }));
}

export function getArtworkPhaseItems(input: {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  communicationSteps?: EventCommunicationStep[];
}): ArtworkPhaseWorkflowItem[] {
  if (input.communicationSteps?.length) {
    const milestones = milestonesFromCommunicationSteps(input.communicationSteps);
    if (milestones.length > 0) {
      return buildArtworkPhaseItemsFromMilestones(milestones);
    }
  }

  return resolveMetaArtworkPhasesForEvent(input).map(buildPhaseItem);
}

export function buildArtworkPhaseItemsFromMilestones(
  milestones: MetaArtworkMilestone[],
): ArtworkPhaseWorkflowItem[] {
  return milestones.flatMap(expandMilestone).map(buildPhaseItem);
}

export function groupArtworkPhasesByMilestone(
  items: ArtworkPhaseWorkflowItem[],
): Array<{
  relativeDay: number;
  title: string;
  formats: ArtworkPhaseWorkflowItem[];
}> {
  const groups = new Map<number, ArtworkPhaseWorkflowItem[]>();

  for (const item of items) {
    const list = groups.get(item.relativeDay) ?? [];
    list.push(item);
    groups.set(item.relativeDay, list);
  }

  return Array.from(groups.entries())
    .sort(([leftDay], [rightDay]) => leftDay - rightDay)
    .map(([relativeDay, formats]) => ({
      relativeDay,
      title: formats[0]?.label ?? `Day ${relativeDay}`,
      formats: formats.sort((left, right) => {
        if (left.metaPlacement === "feed") return -1;
        if (right.metaPlacement === "feed") return 1;
        return 0;
      }),
    }));
}

export function isApprovedArtworkAsset(asset: EventAsset | null): boolean {
  if (!asset?.storagePath) {
    return false;
  }

  if (asset.planStatus === "in_progress" || asset.planStatus === "generated") {
    return false;
  }

  if (asset.planStatus === "approved" || asset.planStatus === "published") {
    return true;
  }

  // Legacy rows before plan_status was tracked
  return asset.status === "uploaded";
}

export function getApprovedArtworkAssets(assets: EventAsset[]): EventAsset[] {
  return assets.filter((asset) => isApprovedArtworkAsset(asset));
}

export function pickDefaultInspirationAsset(
  phaseItems: ArtworkPhaseWorkflowItem[],
  currentItem: ArtworkPhaseWorkflowItem,
  assets: EventAsset[],
): EventAsset | null {
  if (currentItem.metaPlacement === "story") {
    const sameMilestoneFeed = phaseItems.find(
      (phase) =>
        phase.relativeDay === currentItem.relativeDay && phase.metaPlacement === "feed",
    );
    if (sameMilestoneFeed) {
      const feedAsset = resolveWorkflowAsset(sameMilestoneFeed, null, assets);
      if (isApprovedArtworkAsset(feedAsset)) {
        return feedAsset;
      }
    }
  }

  const earlierPhases = phaseItems
    .filter((phase) => phase.relativeDay < currentItem.relativeDay)
    .sort((left, right) => right.relativeDay - left.relativeDay);

  for (const phase of earlierPhases) {
    const asset = resolveWorkflowAsset(phase, null, assets);
    if (isApprovedArtworkAsset(asset)) {
      return asset;
    }
  }

  return getApprovedArtworkAssets(assets)[0] ?? null;
}

/** Publish slots per milestone — feed asset posts to both FB+IG feed; story asset to both FB+IG story. */
export const META_PUBLISH_TARGETS = [
  { platform: "facebook", placement: "feed" as const, usesArtwork: "feed" as const },
  { platform: "instagram", placement: "feed" as const, usesArtwork: "feed" as const },
  { platform: "facebook", placement: "story" as const, usesArtwork: "story" as const },
  { platform: "instagram", placement: "story" as const, usesArtwork: "story" as const },
] as const;

export type MetaPublishSurfaces = import("@/types/playbooks").MetaPublishSurfaces;

export function isFeedSurfaceEnabled(surfaces: MetaPublishSurfaces): boolean {
  return surfaces === "both" || surfaces === "feed_only";
}

export function isStorySurfaceEnabled(surfaces: MetaPublishSurfaces): boolean {
  return surfaces === "both" || surfaces === "story_only";
}

/** Story artwork/captions for Post Kit — false when user posts story manually. */
export function isStoryAutoPublishEnabled(
  surfaces: MetaPublishSurfaces,
  storyManualPublish = false,
): boolean {
  return isStorySurfaceEnabled(surfaces) && !storyManualPublish;
}

export function filterMetaPublishTargetsBySurfaces(
  surfaces: MetaPublishSurfaces,
  storyManualPublish = false,
): (typeof META_PUBLISH_TARGETS)[number][] {
  return META_PUBLISH_TARGETS.filter((target) => {
    if (target.placement === "feed") {
      return isFeedSurfaceEnabled(surfaces);
    }
    return isStoryAutoPublishEnabled(surfaces, storyManualPublish);
  });
}

export function isMetaPublishTargetEnabled(
  surfaces: MetaPublishSurfaces,
  placement: MetaArtworkPlacement,
): boolean {
  return placement === "feed"
    ? isFeedSurfaceEnabled(surfaces)
    : isStorySurfaceEnabled(surfaces);
}
