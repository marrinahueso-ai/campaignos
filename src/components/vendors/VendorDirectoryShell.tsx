"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { VendorAddModal } from "@/components/vendors/VendorAddModal";
import { VendorCard } from "@/components/vendors/VendorCard";
import {
  VENDORS_MIGRATION,
  VENDOR_DIRECTORY_TABS,
  VENDOR_PAGE_SIZE,
} from "@/lib/vendors/constants";
import {
  createDefaultVendorFilters,
  filterVendorDirectoryRows,
  paginateVendorRows,
  totalVendorPages,
} from "@/lib/vendors/filters";
import type {
  VendorDirectoryFilters,
  VendorDirectoryPageData,
  VendorDirectoryTab,
} from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

interface VendorDirectoryShellProps {
  data: VendorDirectoryPageData;
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

export function VendorDirectoryShell({ data }: VendorDirectoryShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
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

  const pageCount = totalVendorPages(filteredRows.length, VENDOR_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount);
  const pageRows = paginateVendorRows(filteredRows, currentPage, VENDOR_PAGE_SIZE);

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
  const eventScoped = filters.eventId !== "all";
  const scopedEventTitle =
    data.events.find((event) => event.id === filters.eventId)?.title ?? null;

  return (
    <div className="relative overflow-hidden rounded-[22px] pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
      <div className="relative space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3.5">
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] text-cos-text">
              Vendors
            </h1>
            <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-cos-muted">
              Your school’s vendor directory — tap a card for the profile, or
              call / email right from the card.
            </p>
            {eventScoped && scopedEventTitle ? (
              <p className="mt-1.5 text-sm font-semibold text-cos-muted">
                Showing vendors linked to {scopedEventTitle}.{" "}
                <button
                  type="button"
                  onClick={() => updateFilter("eventId", "all")}
                  className="font-bold text-cos-text underline-offset-2 hover:underline"
                >
                  Clear event filter
                </button>
              </p>
            ) : null}
          </div>
          {data.canWrite && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition hover:-translate-y-px hover:bg-[#1a1714]"
            >
              <Plus className="h-4 w-4" />
              Add vendor
            </button>
          )}
        </header>

        {migrationNeeded && (
          <div className="rounded-[18px] border border-[rgba(196,146,46,0.35)] bg-[rgba(196,146,46,0.12)] px-4 py-3 text-sm text-cos-text">
            Apply migration <code className="text-xs">{VENDORS_MIGRATION}</code>{" "}
            to enable the vendor directory database tables.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
          <label className="flex min-w-[12.5rem] max-w-[26rem] flex-1 items-center gap-2.5 rounded-full border border-cos-border bg-[#fffcf7] px-4 py-2.5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <Search className="h-[18px] w-[18px] shrink-0 text-cos-muted" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone, email…"
              aria-label="Search vendors"
              className="w-full border-none bg-transparent text-sm font-semibold text-cos-text outline-none placeholder:text-cos-muted"
            />
          </label>
          <div
            className="inline-flex shrink-0 flex-wrap gap-0.5"
            role="tablist"
            aria-label="Vendor directory tabs"
          >
            {VENDOR_DIRECTORY_TABS.map((tab) => {
              const active = filters.tab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => updateFilter("tab", tab.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[13px] font-semibold transition",
                    active
                      ? "bg-[#fffcf7] text-[#2a2622] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                      : "bg-transparent text-[#7a7166] hover:text-[#2a2622]",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {pageRows.length === 0 ? (
          <div className="rounded-[22px] border border-cos-border bg-cos-card px-6 py-10 text-center text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            No vendors match your filters yet.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3.5">
            {pageRows.map((row) => (
              <VendorCard
                key={row.vendor.id}
                vendor={row.vendor}
                category={row.category}
                primaryContact={row.primaryContact}
                logoUrl={row.logoUrl}
                canWrite={data.canWrite}
                onSelect={() => router.push(`/vendors/${row.vendor.id}`)}
                onLogoUploaded={() => {
                  router.refresh();
                }}
                onFavoriteChange={(isFavorite) => {
                  setFavoriteOverrides((prev) => ({
                    ...prev,
                    [row.vendor.id]: isFavorite,
                  }));
                }}
              />
            ))}
          </div>
        )}

        {filteredRows.length > VENDOR_PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-cos-muted">
            <p>
              Showing {(currentPage - 1) * VENDOR_PAGE_SIZE + 1}–
              {Math.min(currentPage * VENDOR_PAGE_SIZE, filteredRows.length)} of{" "}
              {filteredRows.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-full px-3 py-1.5 text-sm font-bold disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1)
                .slice(0, 8)
                .map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      "h-8 min-w-8 rounded-full px-2 text-sm font-bold",
                      pageNumber === currentPage
                        ? "bg-cos-text text-cos-card"
                        : "text-cos-muted hover:bg-[rgba(255,252,247,0.85)]",
                    )}
                  >
                    {pageNumber}
                  </button>
                ))}
              <button
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
                className="rounded-full px-3 py-1.5 text-sm font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

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
