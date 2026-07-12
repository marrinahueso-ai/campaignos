import { COMMUNICATION_STRATEGY_LABELS } from "@/lib/events/communication-strategy";
import { addDaysToDateOnly, normalizeDateOnly } from "@/lib/utils/dates";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { Event } from "@/types";

export type CampaignDisplayStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "filled"
  | "completed";

export type CampaignSummaryFilter =
  | "all"
  | "upcoming"
  | "scheduled"
  | "drafts"
  | "reminders_only"
  | "completed";

export type CampaignTabFilter = "all" | "full_campaign" | "reminder_only";

export type CampaignSortField =
  | "upcoming"
  | "title"
  | "type"
  | "status"
  | "date"
  | "owner"
  | "updated";

export type CampaignViewMode = "grid" | "list";

export type CampaignApprovalFilter = "all" | "draft" | "scheduled" | "published";
export type CampaignPublishFilter = "all" | "not_scheduled" | "queued" | "published";
export type CampaignFileFilter = "all" | "has_files" | "no_files";
export type CampaignPlatformFilter = "all" | "meta" | "none";

export interface CampaignMoreFilters {
  owner: string;
  platform: CampaignPlatformFilter;
  dateStart: string;
  dateEnd: string;
  approvalStatus: CampaignApprovalFilter;
  publishStatus: CampaignPublishFilter;
  fileStatus: CampaignFileFilter;
  campaignType: "all" | CommunicationStrategy;
}

export interface CampaignPageFilterState {
  search: string;
  tab: CampaignTabFilter;
  summary: CampaignSummaryFilter;
  status: "all" | Event["status"];
  schoolYear: string;
  month: string;
  type: "all" | NonNullable<Event["eventType"]>;
  sortField: CampaignSortField;
  sortDirection: "asc" | "desc";
  more: CampaignMoreFilters;
}

export const CAMPAIGNS_PAGE_SIZE = 5;

export const CAMPAIGN_SUMMARY_CARDS: {
  key: CampaignSummaryFilter;
  label: string;
  subtitle: string;
  iconColor: string;
}[] = [
  {
    key: "all",
    label: "All campaigns",
    subtitle: "All time",
    iconColor: "text-amber-600 bg-amber-50",
  },
  {
    key: "upcoming",
    label: "Upcoming",
    subtitle: "Next 60 days",
    iconColor: "text-emerald-600 bg-emerald-50",
  },
  {
    key: "scheduled",
    label: "Scheduled",
    subtitle: "On calendar",
    iconColor: "text-sky-600 bg-sky-50",
  },
  {
    key: "drafts",
    label: "Drafts",
    subtitle: "In planning",
    iconColor: "text-orange-600 bg-orange-50",
  },
  {
    key: "reminders_only",
    label: "Reminders only",
    subtitle: "Light-touch plans",
    iconColor: "text-violet-600 bg-violet-50",
  },
  {
    key: "completed",
    label: "Completed",
    subtitle: "Past campaigns",
    iconColor: "text-teal-600 bg-teal-50",
  },
];

export function createDefaultCampaignFilters(
  activeSchoolYearId?: string | null,
): CampaignPageFilterState {
  return {
    search: "",
    tab: "all",
    summary: "all",
    status: "all",
    schoolYear: activeSchoolYearId ?? "all",
    month: "all",
    type: "all",
    sortField: "upcoming",
    sortDirection: "asc",
    more: {
      owner: "all",
      platform: "all",
      dateStart: "",
      dateEnd: "",
      approvalStatus: "all",
      publishStatus: "all",
      fileStatus: "all",
      campaignType: "all",
    },
  };
}

export function buildSchoolYearFilterOptions(
  schoolYears: Array<{ id: string; label: string }>,
): { value: string; label: string }[] {
  return [
    { value: "all", label: "All school years" },
    ...schoolYears.map((year) => ({ value: year.id, label: year.label })),
  ];
}

export function getCampaignTypeLabel(strategy: CommunicationStrategy): string {
  if (strategy === "reminder_only") {
    return "Reminders only";
  }
  return COMMUNICATION_STRATEGY_LABELS.full_campaign;
}

export function getEventOwnerName(
  event: Event,
  ownership?: EventRosterOwnership | null,
): string {
  if (ownership?.chairNames.length) {
    return ownership.chairNames.join(", ");
  }
  if (event.eventOwner) {
    return event.eventOwner;
  }
  return "—";
}

export function isCampaignCompleted(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  return date < today || event.status === "published";
}

export function isCampaignUpcoming(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  const windowEnd = addDaysToDateOnly(today, 60);
  return date >= today && date <= windowEnd;
}

export function isCampaignScheduled(
  event: Event,
  metaScheduled: boolean,
  today: string,
): boolean {
  return (
    event.status === "scheduled" &&
    !metaScheduled &&
    !isCampaignCompleted(event, today)
  );
}

export function getCampaignDisplayStatus(
  event: Event,
  options: {
    metaScheduled: boolean;
    ownership?: EventRosterOwnership | null;
    today: string;
  },
): CampaignDisplayStatus {
  if (isCampaignCompleted(event, options.today)) {
    return "completed";
  }
  if (event.status === "draft") {
    return "draft";
  }
  if (options.metaScheduled) {
    return "queued";
  }
  if (options.ownership?.committeeFilled && event.status === "scheduled") {
    return "filled";
  }
  return "scheduled";
}

export function formatCampaignUpdatedDate(event: Event): string {
  const iso = event.updatedAt ?? event.createdAt;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getMonthKeyFromDate(date: string): string {
  return normalizeDateOnly(date).slice(0, 7);
}

export function formatMonthFilterLabel(monthKey: string): string {
  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function buildMonthFilterOptions(events: Event[]): { value: string; label: string }[] {
  const keys = new Set<string>();
  for (const event of events) {
    keys.add(getMonthKeyFromDate(event.date));
  }

  return [
    { value: "all", label: "All months" },
    ...[...keys]
      .sort((left, right) => left.localeCompare(right))
      .map((key) => ({ value: key, label: formatMonthFilterLabel(key) })),
  ];
}

export function buildOwnerFilterOptions(
  events: Event[],
  ownershipByEventId?: Map<string, EventRosterOwnership>,
): { value: string; label: string }[] {
  const names = new Set<string>();
  for (const event of events) {
    const owner = getEventOwnerName(event, ownershipByEventId?.get(event.id));
    if (owner !== "—") {
      names.add(owner);
    }
  }

  return [
    { value: "all", label: "All chairs / owners" },
    ...[...names]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({ value: name, label: name })),
  ];
}

export function countBySummaryFilter(
  events: Event[],
  today: string,
  metaScheduledEventIds: Set<string>,
): Record<CampaignSummaryFilter, number> {
  const counts: Record<CampaignSummaryFilter, number> = {
    all: events.length,
    upcoming: 0,
    scheduled: 0,
    drafts: 0,
    reminders_only: 0,
    completed: 0,
  };

  for (const event of events) {
    const metaScheduled = metaScheduledEventIds.has(event.id);

    if (isCampaignUpcoming(event, today)) {
      counts.upcoming += 1;
    }
    if (isCampaignScheduled(event, metaScheduled, today)) {
      counts.scheduled += 1;
    }
    if (event.status === "draft") {
      counts.drafts += 1;
    }
    if (event.communicationStrategy === "reminder_only") {
      counts.reminders_only += 1;
    }
    if (isCampaignCompleted(event, today)) {
      counts.completed += 1;
    }
  }

  return counts;
}
