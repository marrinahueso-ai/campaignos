import {
  DEFAULT_EVENT_TYPE,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
} from "@/lib/playbooks/constants";
import type {
  CampaignPageFilterState,
  CampaignSortField,
} from "@/lib/events/campaign-display";
import {
  getCampaignDisplayStatus,
  getCampaignTypeLabel,
  getEventOwnerName,
  getMonthKeyFromDate,
  isCampaignCompleted,
  isCampaignScheduled,
  isCampaignUpcoming,
} from "@/lib/events/campaign-display";
import { normalizeDateOnly } from "@/lib/utils/dates";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { EventType } from "@/types/playbooks";
import type { Event } from "@/types";

export type {
  CampaignApprovalFilter,
  CampaignDisplayStatus,
  CampaignFileFilter,
  CampaignMoreFilters,
  CampaignPageFilterState,
  CampaignPlatformFilter,
  CampaignPublishFilter,
  CampaignSortField,
  CampaignSummaryFilter,
  CampaignTabFilter,
  CampaignViewMode,
} from "@/lib/events/campaign-display";

export {
  CAMPAIGN_SUMMARY_CARDS,
  CAMPAIGNS_PAGE_SIZE,
  buildMonthFilterOptions,
  buildOwnerFilterOptions,
  buildSchoolYearFilterOptions,
  countBySummaryFilter,
  createDefaultCampaignFilters,
  formatCampaignUpdatedDate,
  getCampaignDisplayStatus,
  getCampaignTypeLabel,
  getEventOwnerName,
} from "@/lib/events/campaign-display";

export type CampaignStatusFilter = CampaignPageFilterState["status"];
export type CampaignTypeFilter = CampaignPageFilterState["type"];

export const CAMPAIGN_STATUS_FILTER_OPTIONS: {
  value: CampaignStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

export const CAMPAIGN_TYPE_FILTER_OPTIONS: {
  value: CampaignTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All types" },
  ...EVENT_TYPES.map(({ value, label }) => ({ value, label })),
];

export const CAMPAIGN_SORT_OPTIONS: {
  value: CampaignSortField;
  label: string;
}[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "title", label: "Campaign name" },
  { value: "date", label: "Date" },
  { value: "updated", label: "Last updated" },
  { value: "owner", label: "Owner" },
  { value: "status", label: "Status" },
  { value: "type", label: "Type" },
];

export interface CampaignFilterContext {
  today: string;
  metaScheduledEventIds?: Set<string>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  eventIdsWithFiles?: Set<string>;
}

function matchesTab(event: Event, tab: CampaignPageFilterState["tab"]): boolean {
  if (tab === "all") return true;
  if (tab === "full_campaign") {
    return (
      event.communicationStrategy === "full_campaign" ||
      event.communicationStrategy === "custom"
    );
  }
  return event.communicationStrategy === "reminder_only";
}

function matchesSummary(
  event: Event,
  summary: CampaignPageFilterState["summary"],
  context: CampaignFilterContext,
): boolean {
  if (summary === "all") return true;

  const metaScheduled = context.metaScheduledEventIds?.has(event.id) ?? false;

  switch (summary) {
    case "upcoming":
      return isCampaignUpcoming(event, context.today);
    case "scheduled":
      return isCampaignScheduled(event, metaScheduled, context.today);
    case "drafts":
      return event.status === "draft";
    case "reminders_only":
      return event.communicationStrategy === "reminder_only";
    case "completed":
      return isCampaignCompleted(event, context.today);
    default:
      return true;
  }
}

function matchesMoreFilters(
  event: Event,
  filters: CampaignPageFilterState,
  context: CampaignFilterContext,
): boolean {
  const { more } = filters;
  const ownership = context.ownershipByEventId?.get(event.id);
  const ownerName = getEventOwnerName(event, ownership);
  const metaScheduled = context.metaScheduledEventIds?.has(event.id) ?? false;

  if (more.owner !== "all" && ownerName !== more.owner) {
    return false;
  }

  if (more.platform === "meta" && !metaScheduled) {
    return false;
  }
  if (more.platform === "none" && metaScheduled) {
    return false;
  }

  const eventDate = normalizeDateOnly(event.date);
  if (more.dateStart && eventDate < more.dateStart) {
    return false;
  }
  if (more.dateEnd && eventDate > more.dateEnd) {
    return false;
  }

  if (more.approvalStatus !== "all" && event.status !== more.approvalStatus) {
    return false;
  }

  if (more.publishStatus === "not_scheduled") {
    if (metaScheduled || event.status === "published") return false;
  } else if (more.publishStatus === "queued") {
    if (!metaScheduled) return false;
  } else if (more.publishStatus === "published") {
    if (event.status !== "published") return false;
  }

  if (more.fileStatus === "has_files") {
    if (!context.eventIdsWithFiles?.has(event.id)) return false;
  } else if (more.fileStatus === "no_files") {
    if (context.eventIdsWithFiles?.has(event.id)) return false;
  }

  if (
    more.campaignType !== "all" &&
    event.communicationStrategy !== more.campaignType
  ) {
    return false;
  }

  return true;
}

function matchesSearch(
  event: Event,
  query: string,
  context: CampaignFilterContext,
): boolean {
  if (!query) return true;

  const ownership = context.ownershipByEventId?.get(event.id);
  const ownerName = getEventOwnerName(event, ownership);
  const eventTypeLabel =
    EVENT_TYPE_LABELS[event.eventType ?? DEFAULT_EVENT_TYPE];
  const displayStatus = getCampaignDisplayStatus(event, {
    metaScheduled: context.metaScheduledEventIds?.has(event.id) ?? false,
    ownership,
    today: context.today,
  });

  const haystack = [
    event.title,
    event.description,
    event.location,
    event.category,
    event.theme,
    eventTypeLabel,
    ownerName,
    getCampaignTypeLabel(event.communicationStrategy),
    displayStatus,
    event.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function filterCampaignEvents(
  events: Event[],
  filters: CampaignPageFilterState,
  context: CampaignFilterContext,
): Event[] {
  const query = filters.search.trim().toLowerCase();

  return events.filter((event) => {
    if (!matchesTab(event, filters.tab)) return false;
    if (!matchesSummary(event, filters.summary, context)) return false;

    if (filters.status !== "all" && event.status !== filters.status) {
      return false;
    }

    if (filters.type !== "all") {
      const eventType = event.eventType ?? "general_event";
      if (eventType !== filters.type) {
        return false;
      }
    }

    if (filters.month !== "all") {
      if (getMonthKeyFromDate(event.date) !== filters.month) {
        return false;
      }
    }

    if (filters.schoolYear !== "all") {
      if (event.schoolYearId !== filters.schoolYear) {
        return false;
      }
    }

    if (!matchesMoreFilters(event, filters, context)) {
      return false;
    }

    return matchesSearch(event, query, context);
  });
}

function compareStrings(
  left: string,
  right: string,
  direction: "asc" | "desc",
): number {
  const result = left.localeCompare(right, undefined, { sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

export function sortCampaignEvents(
  events: Event[],
  sortField: CampaignSortField,
  direction: "asc" | "desc",
  context: CampaignFilterContext,
): Event[] {
  const sorted = [...events];

  sorted.sort((left, right) => {
    const ownershipLeft = context.ownershipByEventId?.get(left.id);
    const ownershipRight = context.ownershipByEventId?.get(right.id);
    const metaLeft = context.metaScheduledEventIds?.has(left.id) ?? false;
    const metaRight = context.metaScheduledEventIds?.has(right.id) ?? false;

    switch (sortField) {
      case "title":
        return compareStrings(left.title, right.title, direction);
      case "type":
        return compareStrings(
          getCampaignTypeLabel(left.communicationStrategy),
          getCampaignTypeLabel(right.communicationStrategy),
          direction,
        );
      case "status": {
        const statusLeft = getCampaignDisplayStatus(left, {
          metaScheduled: metaLeft,
          ownership: ownershipLeft,
          today: context.today,
        });
        const statusRight = getCampaignDisplayStatus(right, {
          metaScheduled: metaRight,
          ownership: ownershipRight,
          today: context.today,
        });
        return compareStrings(statusLeft, statusRight, direction);
      }
      case "date":
      case "upcoming":
        return compareStrings(left.date, right.date, direction);
      case "owner":
        return compareStrings(
          getEventOwnerName(left, ownershipLeft),
          getEventOwnerName(right, ownershipRight),
          direction,
        );
      case "updated": {
        const leftUpdated = left.updatedAt ?? left.createdAt;
        const rightUpdated = right.updatedAt ?? right.createdAt;
        return compareStrings(leftUpdated, rightUpdated, direction);
      }
      default:
        return 0;
    }
  });

  return sorted;
}

export function paginateCampaignEvents<T>(
  items: T[],
  page: number,
  pageSize: number,
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalCampaignPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function getUpcomingCampaignEvents(
  events: Event[],
  today: string,
): Event[] {
  return events
    .filter((event) => isCampaignUpcoming(event, today))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function getDraftCampaignEvents(events: Event[]): Event[] {
  return events
    .filter((event) => event.status === "draft")
    .sort((left, right) => {
      const leftUpdated = left.updatedAt ?? left.createdAt;
      const rightUpdated = right.updatedAt ?? right.createdAt;
      return rightUpdated.localeCompare(leftUpdated);
    });
}

export type { EventType };
