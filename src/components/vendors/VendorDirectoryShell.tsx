"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VendorDetailDrawer } from "@/components/vendors/VendorDetailDrawer";
import { VendorAddModal } from "@/components/vendors/VendorAddModal";
import { VendorCard } from "@/components/vendors/VendorCard";
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
import type {
  VendorDirectoryPageData,
  VendorDirectoryRow,
  VendorDirectoryTab,
} from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

interface VendorDirectoryShellProps {
  data: VendorDirectoryPageData;
}

function directoryStatus(row: VendorDirectoryRow): {
  label: string;
  variant: "success" | "warning" | "default";
} {
  const assignment = row.latestAssignment;
  if (!assignment) {
    return { label: row.vendor.status, variant: "default" };
  }

  switch (assignment.assignmentStatus) {
    case "confirmed":
      return { label: "confirmed", variant: "success" };
    case "completed":
      return { label: "completed", variant: "success" };
    case "pending":
      return { label: "pending", variant: "warning" };
    case "cancelled":
      return { label: "cancelled", variant: "default" };
  }
}

export function VendorDirectoryShell({ data }: VendorDirectoryShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<VendorDirectoryRow | null>(null);

  const filters = useMemo(
    () =>
      createDefaultVendorFilters({
        search: searchParams.get("q") ?? "",
        eventId: searchParams.get("event") ?? "all",
        categoryId: searchParams.get("category") ?? "all",
        status: searchParams.get("status") ?? "all",
        tab: (searchParams.get("tab") as VendorDirectoryTab) ?? "all",
      }),
    [searchParams],
  );

  const filteredRows = useMemo(
    () => filterVendorDirectoryRows(data.vendors, filters),
    [data.vendors, filters],
  );

  const pageCount = totalVendorPages(filteredRows.length, VENDOR_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount);
  const pageRows = paginateVendorRows(filteredRows, currentPage, VENDOR_PAGE_SIZE);
  const rangeStart =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * VENDOR_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * VENDOR_PAGE_SIZE, filteredRows.length);

  function updateQuery(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setPage(1);
    const query = params.toString();
    router.replace(query ? `/vendors?${query}` : "/vendors");
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
          onChange={(value) => updateQuery("event", value)}
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
          onChange={(value) => updateQuery("category", value)}
          ariaLabel="Filter by category"
        />
        <FilterSelect
          value={filters.status}
          options={VENDOR_STATUSES.map((status) => ({
            value: status.value,
            label: status.label,
          }))}
          onChange={(value) => updateQuery("status", value)}
          ariaLabel="Filter by status"
        />
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cos-muted" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateQuery("q", event.target.value)}
            placeholder="Search vendors..."
            aria-label="Search vendors"
            className="h-9 w-full border border-cos-border bg-cos-card pl-9 pr-3 text-sm text-cos-text outline-none focus:border-cos-dark"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Vendors"
          value={String(data.summary.totalVendors)}
        />
        <SummaryCard
          label="Confirmed"
          value={String(data.summary.confirmedThisYear)}
          detail="this year"
        />
        <SummaryCard
          label="Upcoming Events"
          value={String(data.summary.upcomingEventsWithVendors)}
          detail="with vendors"
        />
        <SummaryCard
          label="Favorite Vendors"
          value={String(data.summary.favoriteVendors)}
          detail="frequently used"
        />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-cos-border">
        {VENDOR_DIRECTORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => updateQuery("tab", tab.id === "all" ? "" : tab.id)}
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
                statusLabel={status.label}
                statusVariant={status.variant}
                canWrite={data.canWrite}
                onSelect={() => setSelectedRow(row)}
                onLogoUploaded={() => router.refresh()}
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
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-cos-bg-alt px-4 py-5 text-center shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]">
      <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
        {label}
      </p>
      <p className="font-display text-3xl leading-none text-cos-text tabular-nums">
        {value}
      </p>
      {detail ? <p className="text-xs text-cos-muted">{detail}</p> : null}
    </div>
  );
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
