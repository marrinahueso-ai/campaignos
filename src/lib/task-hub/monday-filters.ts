import type { MondayBoardGroupData, MondayBoardItem } from "@/lib/monday/types";

export type MondayBoardSortMode =
  | "default"
  | "name"
  | "status"
  | "priority"
  | "timeline";

export type MondayBoardStatusFilter = "all" | string;

export interface MondayBoardFilterOptions {
  searchQuery: string;
  statusFilter: MondayBoardStatusFilter;
  sortMode: MondayBoardSortMode;
  personFilter: string | null;
}

function itemSearchHaystack(item: MondayBoardItem): string {
  const parts = [
    item.name,
    item.columnValues.status,
    item.columnValues.priority,
    item.columnValues.phase,
    item.columnValues.urgency,
    item.columnValues.committee,
    ...item.columnValues.vp.map((p) => p.name),
    ...item.columnValues.president.map((p) => p.name),
    ...item.subitems.map((sub) => sub.name),
    ...item.subitems.map((sub) => sub.columnValues.status),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function itemMatchesPersonFilter(item: MondayBoardItem, personFilter: string | null): boolean {
  if (!personFilter?.trim()) {
    return true;
  }
  const needle = personFilter.trim().toLowerCase();
  const people = [
    ...item.columnValues.vp,
    ...item.columnValues.president,
    ...item.columnValues.committeePeople,
    ...item.subitems.flatMap((sub) => sub.columnValues.owner),
  ];
  return people.some((person) => person.name.toLowerCase().includes(needle));
}

function itemMatchesStatusFilter(
  item: MondayBoardItem,
  statusFilter: MondayBoardStatusFilter,
): boolean {
  if (statusFilter === "all") {
    return true;
  }
  const status = item.columnValues.status?.toLowerCase() ?? "";
  return status === statusFilter.toLowerCase();
}

function compareTimeline(a: MondayBoardItem, b: MondayBoardItem): number {
  const dateA = a.columnValues.timeline?.from ?? a.columnValues.dueDate ?? "";
  const dateB = b.columnValues.timeline?.from ?? b.columnValues.dueDate ?? "";
  return dateA.localeCompare(dateB);
}

export function filterMondayBoardGroups(
  groups: MondayBoardGroupData[],
  options: MondayBoardFilterOptions,
): MondayBoardGroupData[] {
  const query = options.searchQuery.trim().toLowerCase();

  return groups
    .map((group) => {
      let items = [...group.items];

      if (query) {
        items = items.filter((item) => itemSearchHaystack(item).includes(query));
      }

      if (options.personFilter) {
        items = items.filter((item) => itemMatchesPersonFilter(item, options.personFilter));
      }

      if (options.statusFilter !== "all") {
        items = items.filter((item) => itemMatchesStatusFilter(item, options.statusFilter));
      }

      switch (options.sortMode) {
        case "name":
          items.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "status":
          items.sort((a, b) =>
            (a.columnValues.status ?? "").localeCompare(b.columnValues.status ?? ""),
          );
          break;
        case "priority":
          items.sort((a, b) =>
            (a.columnValues.priority ?? "").localeCompare(b.columnValues.priority ?? ""),
          );
          break;
        case "timeline":
          items.sort(compareTimeline);
          break;
        default:
          break;
      }

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}

export function countMondayBoardItems(groups: MondayBoardGroupData[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}

export function collectStatusLabels(groups: MondayBoardGroupData[]): string[] {
  const labels = new Set<string>();
  for (const group of groups) {
    for (const item of group.items) {
      if (item.columnValues.status) {
        labels.add(item.columnValues.status);
      }
      for (const sub of item.subitems) {
        if (sub.columnValues.status) {
          labels.add(sub.columnValues.status);
        }
      }
    }
  }
  return Array.from(labels).sort((a, b) => a.localeCompare(b));
}

export function countGroupPriorityDistribution(
  items: MondayBoardItem[],
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = item.columnValues.priority ?? "Unset";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function countGroupStatusDistribution(
  items: MondayBoardItem[],
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = item.columnValues.status ?? "Not Started";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
