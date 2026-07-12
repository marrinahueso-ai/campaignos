import type {
  VendorDirectoryFilters,
  VendorDirectoryRow,
  VendorDirectorySummary,
  VendorDirectoryTab,
  VendorEventSummary,
} from "@/types/vendors";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultVendorFilters(
  overrides?: Partial<VendorDirectoryFilters>,
): VendorDirectoryFilters {
  return {
    search: "",
    eventId: "all",
    categoryId: "all",
    status: "all",
    tab: "all",
    ...overrides,
  };
}

function matchesSearch(row: VendorDirectoryRow, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const haystack = [
    row.vendor.name,
    row.vendor.website,
    row.vendor.email,
    row.vendor.phone,
    row.category?.name,
    row.primaryContact?.name,
    row.primaryContact?.email,
    row.primaryContact?.phone,
    row.latestAssignment?.eventTitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesTab(row: VendorDirectoryRow, tab: VendorDirectoryTab): boolean {
  const today = todayDateString();

  switch (tab) {
    case "all":
      return row.vendor.status !== "archived";
    case "favorites":
      return row.vendor.isFavorite && row.vendor.status !== "archived";
    case "blocked":
      return row.vendor.status === "blocked";
    case "pending":
      return (
        row.vendor.status === "pending" ||
        row.latestAssignment?.assignmentStatus === "pending"
      );
    case "past": {
      if (row.vendor.status === "archived") {
        return true;
      }
      if (!row.latestAssignment) {
        return false;
      }
      return (
        row.latestAssignment.eventDate < today ||
        row.latestAssignment.assignmentStatus === "completed"
      );
    }
    default:
      return true;
  }
}

export function filterVendorDirectoryRows(
  rows: VendorDirectoryRow[],
  filters: VendorDirectoryFilters,
): VendorDirectoryRow[] {
  return rows.filter((row) => {
    if (!matchesSearch(row, filters.search)) {
      return false;
    }

    if (filters.eventId !== "all" && !row.eventIds.includes(filters.eventId)) {
      return false;
    }

    if (filters.categoryId !== "all" && row.vendor.categoryId !== filters.categoryId) {
      return false;
    }

    if (filters.status !== "all" && row.vendor.status !== filters.status) {
      return false;
    }

    if (!matchesTab(row, filters.tab)) {
      return false;
    }

    return true;
  });
}

export function buildVendorDirectorySummary(
  rows: VendorDirectoryRow[],
  eventAssignmentEventIds: Set<string>,
): VendorDirectorySummary {
  const today = todayDateString();
  const yearStart = `${today.slice(0, 4)}-01-01`;

  const activeRows = rows.filter((row) => row.vendor.status !== "archived");

  return {
    totalVendors: activeRows.length,
    confirmedThisYear: activeRows.filter((row) => {
      const assignment = row.latestAssignment;
      return (
        assignment &&
        assignment.assignmentStatus === "confirmed" &&
        assignment.eventDate >= yearStart
      );
    }).length,
    upcomingEventsWithVendors: eventAssignmentEventIds.size,
    favoriteVendors: activeRows.filter((row) => row.vendor.isFavorite).length,
  };
}

export function paginateVendorRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function totalVendorPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function pickLatestAssignment(
  assignments: VendorEventSummary[],
): VendorEventSummary | null {
  if (!assignments.length) {
    return null;
  }

  const today = todayDateString();
  const upcoming = assignments
    .filter((assignment) => assignment.eventDate >= today)
    .sort((left, right) => left.eventDate.localeCompare(right.eventDate));

  if (upcoming.length) {
    return upcoming[0] ?? null;
  }

  return [...assignments].sort((left, right) =>
    right.eventDate.localeCompare(left.eventDate),
  )[0] ?? null;
}

export function vendorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function formatVendorWebsite(website: string | null): string | null {
  if (!website?.trim()) {
    return null;
  }
  return website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
