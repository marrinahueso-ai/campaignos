import type { PlanningCalendarItem } from "@/types/communications-calendar";
import {
  CALM_STATUS_LABELS,
  CALM_STATUS_STYLES,
} from "@/lib/design-system/status-colors";

export type CalendarLayerId =
  | "events"
  | "facebook_feed"
  | "facebook_story"
  | "instagram_feed"
  | "instagram_story"
  | "instagram_reel"
  | "website"
  | "newsletter"
  | "email"
  | "flyers"
  | "approvals"
  | "published"
  | "drafts";

export type CalendarDaySection = "events" | "communications" | "tasks";

export type CalendarDisplayStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "scheduled"
  | "published"
  | "overdue";

export interface CalendarLayerDefinition {
  id: CalendarLayerId;
  label: string;
  shortLabel: string;
  accent: string;
}

export const CALENDAR_LAYERS: CalendarLayerDefinition[] = [
  { id: "events", label: "Events", shortLabel: "Events", accent: "bg-cos-primary" },
  {
    id: "facebook_feed",
    label: "Facebook Feed",
    shortLabel: "FB Feed",
    accent: "bg-cos-primary",
  },
  {
    id: "facebook_story",
    label: "Facebook Story",
    shortLabel: "FB Story",
    accent: "bg-cos-accent",
  },
  {
    id: "instagram_feed",
    label: "Instagram Feed",
    shortLabel: "IG Feed",
    accent: "bg-cos-accent",
  },
  {
    id: "instagram_story",
    label: "Instagram Story",
    shortLabel: "IG Story",
    accent: "bg-cos-accent",
  },
  {
    id: "instagram_reel",
    label: "Instagram Reel",
    shortLabel: "IG Reel",
    accent: "bg-cos-warning-text",
  },
  { id: "website", label: "Website", shortLabel: "Web", accent: "bg-cos-muted" },
  {
    id: "newsletter",
    label: "Newsletter",
    shortLabel: "News",
    accent: "bg-cos-warning-text",
  },
  { id: "email", label: "Email", shortLabel: "Email", accent: "bg-cos-accent" },
  { id: "flyers", label: "Flyers", shortLabel: "Flyer", accent: "bg-cos-warning-text" },
  {
    id: "approvals",
    label: "Approvals",
    shortLabel: "Approve",
    accent: "bg-cos-error",
  },
  {
    id: "published",
    label: "Published",
    shortLabel: "Live",
    accent: "bg-cos-success",
  },
  { id: "drafts", label: "Drafts", shortLabel: "Draft", accent: "bg-cos-bg0" },
];

export const CALENDAR_LAYER_IDS = CALENDAR_LAYERS.map((layer) => layer.id);

export const DISPLAY_STATUS_LABELS = CALM_STATUS_LABELS;

export const DISPLAY_STATUS_STYLES = CALM_STATUS_STYLES;

const LAYER_BY_ID = Object.fromEntries(
  CALENDAR_LAYERS.map((layer) => [layer.id, layer]),
) as Record<CalendarLayerId, CalendarLayerDefinition>;

export function getDefaultActiveLayers(): Set<CalendarLayerId> {
  return new Set(CALENDAR_LAYER_IDS);
}

function titleHints(title: string) {
  const lower = title.toLowerCase();
  return {
    isStory: lower.includes("story"),
    isReel: lower.includes("reel"),
    isFlyer: lower.includes("flyer"),
  };
}

function channelLayersForItem(item: PlanningCalendarItem): CalendarLayerId[] {
  const hints = titleHints(item.title);

  if (item.communicationType === "artwork") {
    if (item.title.includes("Instagram Story") || hints.isStory) {
      return ["instagram_story"];
    }
    if (item.title.includes("Flyer") || hints.isFlyer) {
      return ["flyers"];
    }
    if (item.title.includes("Square") || item.title.includes("Graphic")) {
      return ["instagram_feed"];
    }
    if (item.title.includes("Hero")) {
      return ["website"];
    }
    return ["flyers"];
  }

  switch (item.channel) {
    case "facebook":
      return hints.isStory ? ["facebook_story"] : ["facebook_feed"];
    case "instagram":
      if (hints.isReel) return ["instagram_reel"];
      if (hints.isStory) return ["instagram_story"];
      return ["instagram_feed"];
    case "website_announcement":
      return ["website"];
    case "newsletter":
      return ["newsletter"];
    case "email":
      return ["email"];
    case "flyer":
      return ["flyers"];
    case "volunteer_signup":
      return ["email"];
    case "principal_notes":
    case "morning_announcements":
      return ["email"];
    default:
      return [];
  }
}

export function getItemLayers(item: PlanningCalendarItem): CalendarLayerId[] {
  const layers = new Set<CalendarLayerId>();

  if (item.communicationType === "event") {
    layers.add("events");
    return [...layers];
  }

  if (item.communicationType === "approval") {
    layers.add("approvals");
  }

  if (
    item.communicationType === "draft" ||
    item.draftStatus === "draft" ||
    item.status === "draft"
  ) {
    layers.add("drafts");
  }

  const isPublished =
    item.publishStatus === "published" ||
    item.status === "published" ||
    item.draftStatus === "published";

  if (isPublished) {
    layers.add("published");
  }

  for (const layer of channelLayersForItem(item)) {
    layers.add(layer);
  }

  if (item.communicationType === "timeline_task" && layers.size === 0) {
    layers.add("drafts");
  }

  if (item.communicationType === "scheduled_post") {
    if (layers.size === 0) layers.add("drafts");
  }

  return [...layers];
}

export function itemMatchesLayers(
  item: PlanningCalendarItem,
  activeLayers: Set<CalendarLayerId>,
): boolean {
  if (activeLayers.size === CALENDAR_LAYER_IDS.length) return true;
  const itemLayers = getItemLayers(item);
  return itemLayers.some((layer) => activeLayers.has(layer));
}

export function filterItemsByLayers<T extends PlanningCalendarItem>(
  items: T[],
  activeLayers: Set<CalendarLayerId>,
): T[] {
  return items.filter((item) => itemMatchesLayers(item, activeLayers));
}

export function getDaySection(item: PlanningCalendarItem): CalendarDaySection {
  if (item.communicationType === "event") return "events";
  if (item.communicationType === "approval" || item.communicationType === "artwork") {
    return "tasks";
  }
  return "communications";
}

export function getDisplayStatus(
  item: PlanningCalendarItem & { isOverdue?: boolean },
): CalendarDisplayStatus {
  if (item.isOverdue) return "overdue";
  if (
    item.publishStatus === "published" ||
    item.status === "published" ||
    item.draftStatus === "published"
  ) {
    return "published";
  }
  if (item.sourceType === "scheduled_post" || item.publishStatus === "scheduled") {
    return "scheduled";
  }
  if (
    item.sourceType === "approval" ||
    item.approvalStatus === "pending" ||
    item.status === "pending"
  ) {
    return "needs_review";
  }
  if (item.status === "approved" || item.approvalStatus === "approved") {
    return "approved";
  }
  if (
    item.sourceType === "draft" ||
    item.draftStatus === "draft" ||
    item.status === "draft" ||
    item.status === "generated"
  ) {
    return "draft";
  }
  return "draft";
}

export function getPrimaryChannelLabel(item: PlanningCalendarItem): string | null {
  const layers = channelLayersForItem(item);
  if (layers.length > 0) {
    return LAYER_BY_ID[layers[0]!].shortLabel;
  }
  if (item.communicationType === "event") return "Event";
  if (item.communicationType === "approval") return "Approve";
  if (item.communicationType === "artwork") return "Artwork";
  return null;
}

export function groupItemsByDaySection<T extends PlanningCalendarItem>(
  items: T[],
): Record<CalendarDaySection, T[]> {
  const groups: Record<CalendarDaySection, T[]> = {
    events: [],
    communications: [],
    tasks: [],
  };

  for (const item of items) {
    groups[getDaySection(item)].push(item);
  }

  return groups;
}

export function getLayerDefinition(id: CalendarLayerId): CalendarLayerDefinition {
  return LAYER_BY_ID[id];
}
