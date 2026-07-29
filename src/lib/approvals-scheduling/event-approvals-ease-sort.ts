import { sortApprovalItems } from "./status.ts";
import type { UnifiedApprovalItem } from "./types.ts";

export type EventApprovalsEaseSortId =
  | "status"
  | "newest"
  | "oldest"
  | "name";

export const DEFAULT_EVENT_APPROVALS_EASE_SORT: EventApprovalsEaseSortId =
  "status";

export const EVENT_APPROVALS_EASE_SORT_OPTIONS: {
  id: EventApprovalsEaseSortId;
  label: string;
}[] = [
  { id: "status", label: "By status" },
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name", label: "By post name" },
];

function itemSortDate(item: UnifiedApprovalItem): string {
  return item.scheduleAt ?? item.requestedAt;
}

export function sortEventApprovalsEaseItems(
  items: UnifiedApprovalItem[],
  sortId: EventApprovalsEaseSortId,
): UnifiedApprovalItem[] {
  switch (sortId) {
    case "status":
      return sortApprovalItems(items, "status", "asc");
    case "newest":
      return [...items].sort((left, right) =>
        itemSortDate(right).localeCompare(itemSortDate(left)),
      );
    case "oldest":
      return [...items].sort((left, right) =>
        itemSortDate(left).localeCompare(itemSortDate(right)),
      );
    case "name":
      return sortApprovalItems(items, "campaign", "asc");
    default:
      return items;
  }
}
