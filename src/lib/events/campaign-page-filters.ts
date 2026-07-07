import { EVENT_TYPES } from "@/lib/playbooks/constants";
import type { EventType } from "@/types/playbooks";
import type { Event, EventStatus } from "@/types";

export type CampaignViewMode = "month" | "list";

export type CampaignStatusFilter = "all" | EventStatus;

export type CampaignTypeFilter = "all" | EventType;

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

export interface CampaignPageFilters {
  search: string;
  statusFilter: CampaignStatusFilter;
  typeFilter: CampaignTypeFilter;
}

export function filterCampaignEvents(
  events: Event[],
  filters: CampaignPageFilters,
): Event[] {
  const query = filters.search.trim().toLowerCase();

  return events.filter((event) => {
    if (filters.statusFilter !== "all" && event.status !== filters.statusFilter) {
      return false;
    }

    if (filters.typeFilter !== "all") {
      const eventType = event.eventType ?? "general_event";
      if (eventType !== filters.typeFilter) {
        return false;
      }
    }

    if (!query) {
      return true;
    }

    const haystack = [
      event.title,
      event.description,
      event.location,
      event.category,
      event.theme,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
