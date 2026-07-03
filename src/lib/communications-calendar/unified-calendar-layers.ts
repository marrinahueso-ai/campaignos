import type { PlanningCalendarItem } from "@/types/communications-calendar";
import {
  CALM_STATUS_LABELS,
  CALM_STATUS_STYLES,
} from "@/lib/design-system/status-colors";

export type CalendarLayerId = "events" | "scheduled" | "published";

export type CalendarDaySection = "events" | "communications";

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

export const UNIFIED_CALENDAR_LAYERS: CalendarLayerDefinition[] = [
  { id: "events", label: "Events", shortLabel: "Events", accent: "bg-cos-primary" },
  {
    id: "scheduled",
    label: "Scheduled posts",
    shortLabel: "Scheduled",
    accent: "bg-cos-accent",
  },
  {
    id: "published",
    label: "Published",
    shortLabel: "Published",
    accent: "bg-cos-success",
  },
];

export const UNIFIED_CALENDAR_LAYER_IDS = UNIFIED_CALENDAR_LAYERS.map(
  (layer) => layer.id,
);

export const DISPLAY_STATUS_LABELS = CALM_STATUS_LABELS;
export const DISPLAY_STATUS_STYLES = CALM_STATUS_STYLES;

const LAYER_BY_ID = Object.fromEntries(
  UNIFIED_CALENDAR_LAYERS.map((layer) => [layer.id, layer]),
) as Record<CalendarLayerId, CalendarLayerDefinition>;

export function getDefaultActiveLayers(): Set<CalendarLayerId> {
  return new Set(UNIFIED_CALENDAR_LAYER_IDS);
}

/** School-year campaigns from the Events page — not Meta posts or drafts. */
export function isCampaignEventItem(item: PlanningCalendarItem): boolean {
  return item.communicationType === "event";
}

export function getItemLayers(item: PlanningCalendarItem): CalendarLayerId[] {
  if (item.communicationType === "event") {
    return ["events"];
  }

  if (item.communicationType === "meta_milestone") {
    if (
      item.publishStatus === "published" ||
      item.status === "published"
    ) {
      return ["published"];
    }

    return ["scheduled"];
  }

  return [];
}

export function itemMatchesLayers(
  item: PlanningCalendarItem,
  activeLayers: Set<CalendarLayerId>,
): boolean {
  if (activeLayers.size === UNIFIED_CALENDAR_LAYER_IDS.length) {
    return true;
  }

  return getItemLayers(item).some((layer) => activeLayers.has(layer));
}

export function filterItemsByLayers<T extends PlanningCalendarItem>(
  items: T[],
  activeLayers: Set<CalendarLayerId>,
): T[] {
  return items.filter((item) => itemMatchesLayers(item, activeLayers));
}

export function getDaySection(item: PlanningCalendarItem): CalendarDaySection {
  if (item.communicationType === "event") {
    return "events";
  }

  return "communications";
}

export function getDisplayStatus(
  item: PlanningCalendarItem & { isOverdue?: boolean },
): CalendarDisplayStatus {
  if (item.isOverdue) {
    return "overdue";
  }

  if (
    item.publishStatus === "published" ||
    item.status === "published"
  ) {
    return "published";
  }

  if (
    item.communicationType === "meta_milestone" ||
    item.publishStatus === "scheduled" ||
    item.status === "scheduled"
  ) {
    return "scheduled";
  }

  if (item.status === "draft") {
    return "draft";
  }

  return "draft";
}

export function isMetaMilestoneItem(item: PlanningCalendarItem): boolean {
  return item.communicationType === "meta_milestone";
}

/** Calendar chip title: event name first, then milestone (not "Day Of — Meta"). */
export function getCalendarItemDisplayTitle(item: PlanningCalendarItem): string {
  if (isMetaMilestoneItem(item)) {
    const milestone =
      item.timelineStepTitle ??
      item.title.replace(/\s*[—-]\s*Meta\s*$/i, "").trim();
    return `${item.eventTitle} - ${milestone}`;
  }

  return item.title;
}

export function getPrimaryChannelLabel(item: PlanningCalendarItem): string | null {
  if (item.communicationType === "event") {
    return "Event";
  }

  if (isMetaMilestoneItem(item)) {
    return null;
  }

  return null;
}

export function groupItemsByDaySection<T extends PlanningCalendarItem>(
  items: T[],
): Record<CalendarDaySection, T[]> {
  const groups: Record<CalendarDaySection, T[]> = {
    events: [],
    communications: [],
  };

  for (const item of items) {
    groups[getDaySection(item)].push(item);
  }

  return groups;
}

export function getLayerDefinition(id: CalendarLayerId): CalendarLayerDefinition {
  return LAYER_BY_ID[id];
}
