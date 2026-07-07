import { planDueDateToScheduledTime } from "@/lib/campaign-plan/plan-milestone-display";
import { metaWorkflowMilestonesFromCommunicationSteps } from "@/lib/campaign-plan/plan-milestone-client";
import { getArtworkPhaseItems } from "@/lib/artwork-v2/campaign-phases";
import { resolveMilestoneArtworkStatus } from "@/lib/artwork-v2/batch-generate";
import {
  formatScheduleTimeFromHour,
  resolveBestHourForDate,
} from "@/lib/posting-analytics/suggest-posting-times";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import {
  findMetaPublishBundleForMilestoneDay,
  isBundleArtworkComplete,
} from "@/lib/meta-publishing/bundle-display";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { formatDateTime, parseLocalDate, toLocalDateString } from "@/lib/utils/dates";
import type { CommunicationChannel, EventAsset } from "@/types/event-workspace";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type {
  EventCommunicationStep,
  MetaPublishSurfaces,
  EventType,
  PlaybookStepInput,
} from "@/types/playbooks";

export const MILESTONE_PLANNING_COLORS = {
  text: "#1A1A1A",
  success: "#006B5D",
  successBg: "#E8F3F0",
  pageBg: "#FDFBFA",
  notStartedText: "#8A5A00",
  notStartedBg: "#F5F0E0",
  suggestionBg: "#E7F1F8",
  suggestionText: "#004B87",
  border: "#E8E2DA",
} as const;

export type MilestonePlanningStatus = "scheduled" | "not_started";

export interface MilestoneContentPlatforms {
  instagramFeed: boolean;
  instagramStory: boolean;
  facebookFeed: boolean;
  facebookStory: boolean;
}

export interface MilestonePlanningItem {
  relativeDay: number;
  title: string;
  description: string;
  internalNotes: string;
  dueDate: string;
  scheduleTime: string;
  status: MilestonePlanningStatus;
  contentPlatforms: MilestoneContentPlatforms;
}

export interface MilestoneStepProgress {
  artwork: boolean;
  captions: boolean;
  email: boolean;
  newsletter: boolean;
}

const META_CHANNELS = new Set<CommunicationChannel>(["facebook", "instagram"]);

function defaultDescription(title: string, relativeDay: number): string {
  if (relativeDay === -14 || title.toLowerCase().includes("two-week")) {
    return "Share artwork 2 weeks before the event";
  }
  if (relativeDay === -7 || title.toLowerCase().includes("one-week")) {
    return "Boost with a one-week reminder post";
  }
  if (relativeDay === -1 || title.toLowerCase().includes("day before")) {
    return "Day-of reminder for tomorrow's event";
  }
  if (relativeDay === 0 || title.toLowerCase().includes("day of")) {
    return "Post a day-of celebration and reminders";
  }
  return "";
}

function surfacesIncludeFeed(surfaces: MetaPublishSurfaces): boolean {
  return surfaces === "both" || surfaces === "feed_only";
}

function surfacesIncludeStory(surfaces: MetaPublishSurfaces): boolean {
  return surfaces === "both" || surfaces === "story_only";
}

function readChannelPlatforms(
  steps: EventCommunicationStep[],
  channel: "facebook" | "instagram",
): { feed: boolean; story: boolean } {
  const step = steps.find((item) => item.channel === channel);
  if (!step || step.status === "skipped") {
    return { feed: false, story: false };
  }

  return {
    feed: surfacesIncludeFeed(step.metaPublishSurfaces),
    story: surfacesIncludeStory(step.metaPublishSurfaces),
  };
}

function readScheduleTime(dueDate: string): string {
  const scheduled = planDueDateToScheduledTime(dueDate);
  if (!scheduled) {
    return "10:00";
  }

  const date = new Date(scheduled);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function relativeDayFromDate(eventDate: string, selectedDate: string): number {
  const event = parseLocalDate(eventDate);
  const selected = parseLocalDate(selectedDate);
  const diffMs = selected.getTime() - event.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function resolveSelectedPlatforms(
  milestone: MilestonePlanningItem,
): Array<"facebook" | "instagram"> {
  const { contentPlatforms } = milestone;
  const platforms: Array<"facebook" | "instagram"> = [];

  if (contentPlatforms.facebookFeed || contentPlatforms.facebookStory) {
    platforms.push("facebook");
  }
  if (contentPlatforms.instagramFeed || contentPlatforms.instagramStory) {
    platforms.push("instagram");
  }

  return platforms;
}

export function resolvePrimaryPlatform(
  milestone: MilestonePlanningItem,
): "facebook" | "instagram" | null {
  return resolveSelectedPlatforms(milestone)[0] ?? null;
}

function isChannelStepComplete(
  steps: EventCommunicationStep[],
  relativeDay: number,
  channel: CommunicationChannel,
): boolean {
  const step = steps.find(
    (candidate) =>
      candidate.relativeDay === relativeDay &&
      candidate.channel === channel &&
      candidate.status !== "skipped",
  );

  return step?.status === "completed";
}

export interface MilestoneStepProgressContext {
  assets?: EventAsset[];
  eventType?: EventType | null;
  communicationStrategy?: CommunicationStrategy;
}

function resolveArtworkCompleteFromAssets(
  relativeDay: number,
  assignedSteps: EventCommunicationStep[],
  context?: MilestoneStepProgressContext,
): boolean {
  if (!context?.assets?.length) {
    return false;
  }

  const phaseItems = getArtworkPhaseItems({
    eventType: context.eventType ?? null,
    communicationStrategy: context.communicationStrategy ?? "full_campaign",
    communicationSteps: assignedSteps,
  });

  return (
    resolveMilestoneArtworkStatus(relativeDay, phaseItems, context.assets) === "complete"
  );
}

export function resolveMilestoneStepProgress(
  relativeDay: number,
  bundles: MetaPublishBundle[],
  assignedSteps: EventCommunicationStep[],
  context?: MilestoneStepProgressContext,
): MilestoneStepProgress {
  const bundle = findMetaPublishBundleForMilestoneDay(bundles, relativeDay);
  let artworkComplete = isBundleArtworkComplete(bundle);

  if (!artworkComplete) {
    artworkComplete = resolveArtworkCompleteFromAssets(relativeDay, assignedSteps, context);
  }

  const captionsComplete = Boolean(
    bundle?.isMetaPost &&
      artworkComplete &&
      bundle.status !== "needs_caption" &&
      bundle.status !== "skipped",
  );

  return {
    artwork: artworkComplete,
    captions: captionsComplete,
    email: isChannelStepComplete(assignedSteps, relativeDay, "email"),
    newsletter: isChannelStepComplete(assignedSteps, relativeDay, "newsletter"),
  };
}

export function buildMilestoneStepProgressMap(
  items: MilestonePlanningItem[],
  bundles: MetaPublishBundle[],
  assignedSteps: EventCommunicationStep[],
  context?: MilestoneStepProgressContext,
): Map<number, MilestoneStepProgress> {
  return new Map(
    items.map((item) => [
      item.relativeDay,
      resolveMilestoneStepProgress(item.relativeDay, bundles, assignedSteps, context),
    ]),
  );
}

export function enrichMilestoneItemsWithBundles(
  items: MilestonePlanningItem[],
  bundles: MetaPublishBundle[],
): MilestonePlanningItem[] {
  return items.map((item) => {
    const bundle = bundles.find(
      (candidate) =>
        candidate.isMetaPost &&
        candidate.relativeDay === item.relativeDay &&
        candidate.status !== "skipped",
    );

    if (!bundle) {
      return item;
    }

    const isScheduled =
      bundle.status === "scheduled" ||
      bundle.status === "approved" ||
      bundle.status === "published";

    return {
      ...item,
      status: isScheduled ? "scheduled" : item.dueDate ? item.status : "not_started",
    };
  });
}

export function milestoneItemsFromSteps(steps: EventCommunicationStep[]): MilestonePlanningItem[] {
  const milestoneDays = metaWorkflowMilestonesFromCommunicationSteps(steps);

  return milestoneDays.map(({ relativeDay, title }) => {
    const daySteps = steps.filter(
      (step) => step.relativeDay === relativeDay && step.status !== "skipped",
    );
    const representative = daySteps[0];
    const dueDate = representative?.dueDate ?? "";
    const instagram = readChannelPlatforms(daySteps, "instagram");
    const facebook = readChannelPlatforms(daySteps, "facebook");

    return {
      relativeDay,
      title,
      description: defaultDescription(title, relativeDay),
      internalNotes: "",
      dueDate,
      scheduleTime: readScheduleTime(dueDate),
      status: dueDate ? "scheduled" : "not_started",
      contentPlatforms: {
        instagramFeed: instagram.feed,
        instagramStory: instagram.story,
        facebookFeed: facebook.feed,
        facebookStory: facebook.story,
      },
    };
  });
}

export function formatMilestoneTiming(dueDate: string, scheduleTime: string): string {
  if (!dueDate) {
    return "Not scheduled";
  }

  const [hoursText, minutesText] = scheduleTime.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const scheduledIso = `${dueDate.slice(0, 10)}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  return formatDateTime(scheduledIso).replace(/,([^,]*)$/, " at$1");
}

function surfacesForChannel(
  feed: boolean,
  story: boolean,
): MetaPublishSurfaces | null {
  if (feed && story) {
    return "both";
  }
  if (feed) {
    return "feed_only";
  }
  if (story) {
    return "story_only";
  }
  return null;
}

function upsertChannelStep(
  steps: PlaybookStepInput[],
  relativeDay: number,
  title: string,
  channel: "facebook" | "instagram",
  surfaces: MetaPublishSurfaces | null,
): PlaybookStepInput[] {
  const withoutChannel = steps.filter(
    (step) => !(step.relativeDay === relativeDay && step.channel === channel),
  );

  if (!surfaces) {
    return withoutChannel;
  }

  return [
    ...withoutChannel,
    {
      relativeDay,
      title,
      channel,
      isRequired: true,
      defaultStatus: "upcoming",
      metaPublishSurfaces: surfaces,
    },
  ];
}

export function milestoneItemsToPlaybookSteps(
  items: MilestonePlanningItem[],
  allSteps: EventCommunicationStep[],
): PlaybookStepInput[] {
  const nonMetaSteps: PlaybookStepInput[] = allSteps
    .filter((step) => !META_CHANNELS.has(step.channel))
    .map((step) => ({
      relativeDay: step.relativeDay,
      title: step.title,
      channel: step.channel,
      isRequired: step.isRequired,
      defaultStatus:
        step.status === "skipped"
          ? "skipped"
          : step.status === "completed"
            ? "completed"
            : "upcoming",
      metaPublishSurfaces: step.metaPublishSurfaces,
    }));

  let metaSteps: PlaybookStepInput[] = [];

  for (const item of items) {
    const { contentPlatforms } = item;
    const instagramSurfaces = surfacesForChannel(
      contentPlatforms.instagramFeed,
      contentPlatforms.instagramStory,
    );
    const facebookSurfaces = surfacesForChannel(
      contentPlatforms.facebookFeed,
      contentPlatforms.facebookStory,
    );

    metaSteps = upsertChannelStep(
      metaSteps,
      item.relativeDay,
      item.title,
      "instagram",
      instagramSurfaces,
    );
    metaSteps = upsertChannelStep(
      metaSteps,
      item.relativeDay,
      item.title,
      "facebook",
      facebookSurfaces,
    );
  }

  const merged: PlaybookStepInput[] = [...nonMetaSteps];

  for (const metaStep of metaSteps) {
    const existingIndex = merged.findIndex(
      (step) =>
        step.relativeDay === metaStep.relativeDay && step.channel === metaStep.channel,
    );

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...metaStep,
        title: metaStep.title,
      };
    } else {
      merged.push(metaStep);
    }
  }

  return merged.sort(
    (left, right) => left.relativeDay - right.relativeDay || left.channel.localeCompare(right.channel),
  );
}

export function createDefaultMilestone(
  items: MilestonePlanningItem[],
  eventDate: string,
): MilestonePlanningItem {
  const nextRelativeDay =
    items.length === 0
      ? -14
      : Math.min(...items.map((item) => item.relativeDay)) - 7;
  const shifted = parseLocalDate(eventDate);
  shifted.setDate(shifted.getDate() + nextRelativeDay);

  return {
    relativeDay: nextRelativeDay,
    title: "Custom milestone",
    description: "",
    internalNotes: "",
    dueDate: toLocalDateString(shifted),
    scheduleTime: "10:00",
    status: "not_started",
    contentPlatforms: {
      instagramFeed: true,
      instagramStory: true,
      facebookFeed: false,
      facebookStory: false,
    },
  };
}

function dueDateForRelativeDay(eventDate: string, relativeDay: number): string {
  const shifted = parseLocalDate(eventDate);
  shifted.setDate(shifted.getDate() + relativeDay);
  return toLocalDateString(shifted);
}

export function reorderMilestonesPreservingDays(
  items: MilestonePlanningItem[],
  fromIndex: number,
  toIndex: number,
  eventDate: string,
): MilestonePlanningItem[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const relativeDaySlots = items.map((item) => item.relativeDay);
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next.map((item, index) => {
    const relativeDay = relativeDaySlots[index] ?? item.relativeDay;
    return {
      ...item,
      relativeDay,
      dueDate: dueDateForRelativeDay(eventDate, relativeDay),
    };
  });
}

export function applySuggestedTimes(
  items: MilestonePlanningItem[],
  heatmap?: PostingHeatmapData | null,
): MilestonePlanningItem[] {
  return items.map((item) => {
    const hour = resolveBestHourForDate(heatmap, item.dueDate);
    return {
      ...item,
      scheduleTime: formatScheduleTimeFromHour(hour),
      status: item.dueDate ? "scheduled" : item.status,
    };
  });
}

export function suggestTimeline(
  items: MilestonePlanningItem[],
  eventDate: string,
  heatmap?: PostingHeatmapData | null,
): MilestonePlanningItem[] {
  if (items.length === 0) {
    return [
      {
        relativeDay: -14,
        title: "Two-Week Reminder",
        description: defaultDescription("Two-Week Reminder", -14),
        internalNotes: "",
        dueDate: toLocalDateString(
          (() => {
            const date = parseLocalDate(eventDate);
            date.setDate(date.getDate() - 14);
            return date;
          })(),
        ),
        scheduleTime: formatScheduleTimeFromHour(
          resolveBestHourForDate(heatmap, dueDateForRelativeDay(eventDate, -14)),
        ),
        status: "scheduled",
        contentPlatforms: {
          instagramFeed: true,
          instagramStory: true,
          facebookFeed: false,
          facebookStory: false,
        },
      },
      {
        relativeDay: -7,
        title: "One-Week Push",
        description: defaultDescription("One-Week Push", -7),
        internalNotes: "",
        dueDate: toLocalDateString(
          (() => {
            const date = parseLocalDate(eventDate);
            date.setDate(date.getDate() - 7);
            return date;
          })(),
        ),
        scheduleTime: formatScheduleTimeFromHour(
          resolveBestHourForDate(heatmap, dueDateForRelativeDay(eventDate, -7)),
        ),
        status: "scheduled",
        contentPlatforms: {
          instagramFeed: true,
          instagramStory: true,
          facebookFeed: false,
          facebookStory: false,
        },
      },
      {
        relativeDay: -1,
        title: "Day Before",
        description: defaultDescription("Day Before", -1),
        internalNotes: "",
        dueDate: toLocalDateString(
          (() => {
            const date = parseLocalDate(eventDate);
            date.setDate(date.getDate() - 1);
            return date;
          })(),
        ),
        scheduleTime: formatScheduleTimeFromHour(
          resolveBestHourForDate(heatmap, dueDateForRelativeDay(eventDate, -1)),
        ),
        status: "scheduled",
        contentPlatforms: {
          instagramFeed: true,
          instagramStory: true,
          facebookFeed: false,
          facebookStory: false,
        },
      },
      {
        relativeDay: 0,
        title: "Day Of",
        description: defaultDescription("Day Of", 0),
        internalNotes: "",
        dueDate: eventDate.slice(0, 10),
        scheduleTime: formatScheduleTimeFromHour(
          resolveBestHourForDate(heatmap, eventDate.slice(0, 10)),
        ),
        status: "scheduled",
        contentPlatforms: {
          instagramFeed: true,
          instagramStory: true,
          facebookFeed: false,
          facebookStory: false,
        },
      },
    ];
  }

  return applySuggestedTimes(items, heatmap);
}
