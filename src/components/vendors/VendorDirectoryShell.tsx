"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VendorDetailDrawer } from "@/components/vendors/VendorDetailDrawer";
import { VendorAddModal } from "@/components/vendors/VendorAddModal";
import { VendorCard } from "@/components/vendors/VendorCard";
import { VendorDirectorySummaryCards } from "@/components/vendors/VendorDirectorySummaryCards";
import {
  VENDORS_MIGRATION,
  VENDOR_DIRECTORY_TABS,
  VENDOR_PAGE_SIZE,
  VENDOR_STATUSES,
} from "@/lib/vendors/constants";
import {
  createDefaultVendorFilters,
  filterVendorDirectoryRows,
  paginateVendorRows,
  totalVendorPages,
} from "@/lib/vendors/filters";
import type { VendorsDirectoryLayout } from "@/lib/vendors/vendors-directory-layout";
import type {
  VendorDirectoryFilters,
  VendorDirectoryPageData,
  VendorDirectoryRow,
  VendorDirectoryTab,
} from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

interface VendorDirectoryShellProps {
  data: VendorDirectoryPageData;
  summaryLayout: VendorsDirectoryLayout;
}

function directoryStatus(row: VendorDirectoryRow): {
  label: string;
  variant: "success" | "warning" | "default";
} | null {
  if (row.vendor.status === "blocked") {
    return { label: "blocked", variant: "warning" };
  }
  if (row.vendor.status === "archived") {
    return { label: "archived", variant: "default" };
  }

  const assignment = row.latestAssignment;
  if (!assignment) {
    return null;
  }

  switch (assignment.assignmentStatus) {
    case "confirmed":
      return { label: "confirmed", variant: "success" };
    case "completed":
      return { label: "completed", variant: "success" };
    case "pending":
    case "cancelled":
      // Pending is not a directory concept — omit the badge.
      return null;
  }
}

function filtersFromSearchParams(
  searchParams: URLSearchParams,
): VendorDirectoryFilters {
  return createDefaultVendorFilters({
    search: searchParams.get("q") ?? "",
    eventId: searchParams.get("event") ?? "all",
    categoryId: searchParams.get("category") ?? "all",
    status: searchParams.get("status") ?? "all",
    tab: normalizeDirectoryTab(searchParams.get("tab")),
  });
}

function writeFiltersToUrl(filters: VendorDirectoryFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) {
    params.set("q", filters.search.trim());
  }
  if (filters.eventId !== "all") {
    params.set("event", filters.eventId);
  }
  if (filters.categoryId !== "all") {
    params.set("category", filters.categoryId);
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.tab !== "all") {
    params.set("tab", filters.tab);
  }
  const query = params.toString();
  const href = query ? `/vendors?${query}` : "/vendors";
  // replaceState keeps the URL shareable without a Next soft-nav / Suspense flash.
  window.history.replaceState(window.history.state, "", href);
}

export function VendorDirectoryShell({
  data,
  summaryLayout,
}: VendorDirectoryShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<VendorDirectoryRow | null>(null);
  const [filters, setFilters] = useState(() =>
    filtersFromSearchParams(searchParams),
  );
  const [searchInput, setSearchInput] = useState(
    () => filtersFromSearchParams(searchParams).search,
  );
  const [favoriteOverrides, setFavoriteOverrides] = useState<
    Record<string, boolean>
  >({});

  // Browser back/forward — rehydrate from the address bar.
  useEffect(() => {
    const onPopState = () => {
      const next = filtersFromSearchParams(
        new URLSearchParams(window.location.search),
      );
      setFilters(next);
      setSearchInput(next.search);
      setPage(1);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Debounce URL sync for search only — list filtering stays instant.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) {
          return prev;
        }
        const next = { ...prev, search: searchInput };
        writeFiltersToUrl(next);
        return next;
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setFavoriteOverrides({});
  }, [data.vendors]);

  const rows = useMemo(
    () =>
      data.vendors.map((row) => {
        const override = favoriteOverrides[row.vendor.id];
        if (override === undefined) {
          return row;
        }
        return {
          ...row,
          vendor: { ...row.vendor, isFavorite: override },
        };
      }),
    [data.vendors, favoriteOverrides],
  );

  const activeFilters = useMemo(
    () => ({ ...filters, search: searchInput }),
    [filters, searchInput],
  );

  const filteredRows = useMemo(
    () => filterVendorDirectoryRows(rows, activeFilters),
    [rows, activeFilters],
  );

  const favoriteCount = useMemo(
    () => rows.filter((row) => row.vendor.isFavorite).length,
    [rows],
  );

  const pageCount = totalVendorPages(filteredRows.length, VENDOR_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount);
  const pageRows = paginateVendorRows(filteredRows, currentPage, VENDOR_PAGE_SIZE);
  const rangeStart =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * VENDOR_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * VENDOR_PAGE_SIZE, filteredRows.length);

  function updateFilter<K extends keyof VendorDirectoryFilters>(
    key: K,
    value: VendorDirectoryFilters[K],
  ) {
    setPage(1);
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      writeFiltersToUrl(next);
      return next;
    });
  }

  const migrationNeeded = data.vendors.length === 0 && data.categories.length === 0;

  return (
    <div className="studio-page space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-cos-text">Vendor Directory</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
            All your event vendors in one place. Save, organize, and manage vendor details
            for past, current, and upcoming events.
          </p>
        </div>
        {data.canWrite && (
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        )}
      </div>

      {migrationNeeded && (
        <Card className="border-cos-warning/40 bg-cos-warning/10 p-4 text-sm text-cos-text">
          Apply migration <code className="text-xs">{VENDORS_MIGRATION}</code> to enable
          the vendor directory database tables.
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={filters.eventId}
          options={[
            { value: "all", label: "All Events" },
            ...data.events.map((event) => ({
              value: event.id,
              label: event.title,
            })),
          ]}
          onChange={(value) => updateFilter("eventId", value)}
          ariaLabel="Filter by event"
        />
        <FilterSelect
          value={filters.categoryId}
          options={[
            { value: "all", label: "All Categories" },
            ...data.categories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
          onChange={(value) => updateFilter("categoryId", value)}
          ariaLabel="Filter by category"
        />
        <FilterSelect
          value={filters.status}
          options={VENDOR_STATUSES.map((status) => ({
            value: status.value,
            label: status.label,
          }))}
          onChange={(value) => updateFilter("status", value)}
          ariaLabel="Filter by status"
        />
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cos-muted" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="Search vendors..."
            aria-label="Search vendors"
            className="h-9 w-full border border-cos-border bg-cos-card pl-9 pr-3 text-sm text-cos-text outline-none focus:border-cos-dark"
          />
        </div>
      </div>

      <VendorDirectorySummaryCards
        initialLayout={summaryLayout}
        cards={[
          {
            key: "total_vendors",
            label: "Total Vendors",
            value: String(data.summary.totalVendors),
            active: filters.tab === "all",
            onSelect: () => updateFilter("tab", "all"),
          },
          {
            key: "confirmed",
            label: "Confirmed",
            value: String(data.summary.confirmedThisYear),
            detail: "this year",
          },
          {
            key: "upcoming_events",
            label: "Upcoming Events",
            value: String(data.summary.upcomingEventsWithVendors),
            detail: "with vendors",
          },
          {
            key: "favorite_vendors",
            label: "Favorite Vendors",
            value: String(favoriteCount),
            detail: "frequently used",
            active: filters.tab === "favorites",
            onSelect: () => updateFilter("tab", "favorites"),
          },
        ]}
      />

      <div className="flex flex-wrap gap-1 border-b border-cos-border">
        {VENDOR_DIRECTORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => updateFilter("tab", tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm transition-colors",
              filters.tab === tab.id
                ? "border-b-2 border-cos-dark font-medium text-cos-dark"
                : "text-cos-muted hover:text-cos-text",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pageRows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-cos-muted">
          No vendors match your filters yet.
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,16rem))] gap-3">
          {pageRows.map((row) => {
            const status = directoryStatus(row);
            return (
              <VendorCard
                key={row.vendor.id}
                vendor={row.vendor}
                category={row.category}
                primaryContact={row.primaryContact}
                logoUrl={row.logoUrl}
                statusLabel={status?.label ?? ""}
                statusVariant={status?.variant ?? "default"}
                canWrite={data.canWrite}
                onSelect={() => setSelectedRow(row)}
                onLogoUploaded={() => router.refresh()}
                onFavoriteChange={(isFavorite) => {
                  setFavoriteOverrides((prev) => ({
                    ...prev,
                    [row.vendor.id]: isFavorite,
                  }));
                }}
              />
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-cos-muted">
        <p>
          Showing {rangeStart}-{rangeEnd} of {filteredRows.length} vendors
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Prev
          </Button>
          {Array.from({ length: pageCount }, (_, index) => index + 1)
            .slice(0, 8)
            .map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={cn(
                  "h-8 min-w-8 px-2 text-sm",
                  pageNumber === currentPage
                    ? "bg-cos-dark text-white"
                    : "text-cos-muted hover:bg-cos-bg",
                )}
              >
                {pageNumber}
              </button>
            ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <VendorDetailDrawer
        row={selectedRow}
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        canWrite={data.canWrite}
      />

      <VendorAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={data.categories}
        events={data.events}
        defaultEventId={
          filters.eventId !== "all" ? filters.eventId : undefined
        }
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

function normalizeDirectoryTab(raw: string | null): VendorDirectoryTab {
  if (raw === "favorites" || raw === "past" || raw === "blocked") {
    return raw;
  }
  // Legacy ?tab=pending → All Vendors
  return "all";
}

function FilterSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="h-9 min-w-[10rem] border border-cos-border bg-cos-card px-2.5 text-xs text-cos-text outline-none focus:border-cos-dark"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
