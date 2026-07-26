"use client";

import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  FilesEaseList,
  type FilesEaseEventGroup,
} from "@/components/campaign-files/FilesEaseList";
import { FileUploadDialog } from "@/components/campaign-files/FileUploadDialog";
import {
  defaultFilesLayout,
  normalizeFilesLayout,
  type FilesLayout,
} from "@/lib/campaign-files/files-layout";
import {
  createDefaultFilesFilterState,
  filterCampaignFiles,
  sortCampaignFiles,
} from "@/lib/campaign-files/filters";
import { eventFilesHref } from "@/lib/events/event-responsibility";
import { eventGroupAccentColor } from "@/lib/tasks-v2/event-colors";
import { getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type {
  CampaignFile,
  CampaignFileEventSummary,
  FilesPageData,
  FilesSortField,
} from "@/types/campaign-files";

const COMING_UP_EVENT_LIMIT = 5;

function splitComingUpEvents(
  events: CampaignFileEventSummary[],
  today = getTodayDateString(),
): { comingUp: CampaignFileEventSummary[]; earlier: CampaignFileEventSummary[] } {
  const sorted = [...events].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
  const upcoming = sorted.filter((event) => event.date >= today);
  const past = sorted.filter((event) => event.date < today).reverse();
  const comingUp = upcoming.slice(0, COMING_UP_EVENT_LIMIT);
  const earlier = [
    ...upcoming.slice(COMING_UP_EVENT_LIMIT),
    ...past,
  ];
  return { comingUp, earlier };
}

const SORT_OPTIONS: { id: FilesSortField; label: string }[] = [
  { id: "uploaded", label: "Newest" },
  { id: "name", label: "Name" },
  { id: "size", label: "Size" },
  { id: "type", label: "Type" },
];

function parseSort(value: string | null): FilesSortField {
  if (value === "name" || value === "size" || value === "type") return value;
  return "uploaded";
}

interface FilesEaseShellProps {
  data: FilesPageData;
  initialEventId?: string | null;
  initialEventLayout?: FilesLayout;
}

export function FilesEaseShell({
  data,
  initialEventId = null,
  initialEventLayout,
}: FilesEaseShellProps) {
  const searchParams = useSearchParams();
  const dragDepthRef = useRef(0);

  // Local chrome state for instant clicks — URL synced via history.replaceState
  // (router.replace would refetch the whole RSC Files page and feel laggy),
  // same pattern as TasksEaseShell.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [sortMode, setSortMode] = useState<FilesSortField>(() =>
    parseSort(searchParams.get("sort")),
  );
  const [eventFilter, setEventFilter] = useState<string | null>(
    () => searchParams.get("event") ?? initialEventId ?? null,
  );
  // Read-only in Ease v1 — reuses whatever custom colors were set in the
  // legacy "Files organized by event" carousel, falling back to the same
  // rotating accent palette Tasks Ease uses.
  const layout = useMemo<FilesLayout>(
    () =>
      normalizeFilesLayout(
        initialEventLayout ?? defaultFilesLayout(),
        data.events.map((event) => event.eventId),
      ),
    [initialEventLayout, data.events],
  );
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const syncUrl = useCallback(
    (next: { event: string | null; sort: FilesSortField; q: string }) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (!next.event) params.delete("event");
      else params.set("event", next.event);
      if (next.sort === "uploaded") params.delete("sort");
      else params.set("sort", next.sort);
      if (!next.q) params.delete("q");
      else params.set("q", next.q);
      const query = params.toString();
      const href = query ? `/files?${query}` : "/files";
      window.history.replaceState(window.history.state, "", href);
    },
    [],
  );

  function handleEventFilterChange(next: string | null) {
    setEventFilter(next);
    syncUrl({ event: next, sort: sortMode, q: query });
  }

  function handleSortChange(next: FilesSortField) {
    setSortMode(next);
    syncUrl({ event: eventFilter, sort: next, q: query });
  }

  function handleSearchChange(next: string) {
    setQuery(next);
    syncUrl({ event: eventFilter, sort: sortMode, q: next });
  }

  function handleRenamed(fileId: string, name: string) {
    setNameOverrides((current) => ({ ...current, [fileId]: name }));
  }

  function handleDeleted(fileId: string) {
    setDeletedIds((current) => new Set(current).add(fileId));
  }

  function openUploadWithFiles(files: File[]) {
    if (files.length === 0) return;
    setPendingUploadFiles(files);
    setUploadOpen(true);
  }

  function isFileDrag(event: DragEvent) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleDropzoneDragEnter(event: DragEvent) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  }

  function handleDropzoneDragLeave(event: DragEvent) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDraggingFiles(false);
    }
  }

  function handleDropzoneDragOver(event: DragEvent) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDropzoneDrop(event: DragEvent) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) openUploadWithFiles(files);
  }

  const eventTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of data.events) map.set(event.eventId, event.title);
    return map;
  }, [data.events]);

  const filesWithOverrides = useMemo(() => {
    let files = data.files;
    if (deletedIds.size > 0) {
      files = files.filter((file) => !deletedIds.has(file.id));
    }
    if (Object.keys(nameOverrides).length === 0) return files;
    return files.map((file) =>
      nameOverrides[file.id] !== undefined
        ? { ...file, name: nameOverrides[file.id]! }
        : file,
    );
  }, [data.files, deletedIds, nameOverrides]);

  const filteredSortedFiles = useMemo<CampaignFile[]>(() => {
    const filters = {
      ...createDefaultFilesFilterState(eventFilter ?? undefined),
      search: query,
    };
    const filtered = filterCampaignFiles(filesWithOverrides, filters, eventTitles);
    const direction = sortMode === "uploaded" || sortMode === "size" ? "desc" : "asc";
    return sortCampaignFiles(filtered, sortMode, direction, eventTitles);
  }, [filesWithOverrides, eventFilter, query, sortMode, eventTitles]);

  // Stable index (not the filtered position) so an event's fallback accent
  // color never shifts as the user searches or filters.
  const eventIndexById = useMemo(() => {
    const map = new Map<string, number>();
    data.events.forEach((event, index) => map.set(event.eventId, index));
    return map;
  }, [data.events]);

  function accentColorFor(eventId: string): string {
    return (
      layout.colors?.[eventId] ??
      eventGroupAccentColor(eventId, eventIndexById.get(eventId) ?? 0)
    );
  }

  const eventGroups = useMemo<FilesEaseEventGroup[]>(() => {
    const byEvent = new Map<string, CampaignFile[]>();
    for (const file of filteredSortedFiles) {
      const list = byEvent.get(file.eventId) ?? [];
      list.push(file);
      byEvent.set(file.eventId, list);
    }

    return data.events
      .filter((event) => byEvent.has(event.eventId))
      .map((event) => ({
        eventId: event.eventId,
        eventTitle: event.title,
        eventDate: event.date,
        eventHref: eventFilesHref(event.eventId),
        accentColor: accentColorFor(event.eventId),
        files: byEvent.get(event.eventId) ?? [],
      }))
      .sort(
        (a, b) =>
          a.eventDate.localeCompare(b.eventDate) ||
          a.eventTitle.localeCompare(b.eventTitle),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSortedFiles, data.events, layout.colors, eventIndexById]);

  const { comingUp: comingUpEvents, earlier: earlierEvents } = useMemo(
    () => splitComingUpEvents(data.events),
    [data.events],
  );

  if (!data.tablesAvailable) {
    return (
      <div className="rounded-[22px] border border-cos-border bg-cos-card p-8 text-center shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <h1 className="font-display text-2xl text-cos-text">Files unavailable</h1>
        <p className="mt-2 text-sm text-cos-muted">
          Run migration 046_campaign_files_enhanced.sql to enable the shared file
          library.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-[22px] before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']"
      onDragEnter={handleDropzoneDragEnter}
      onDragLeave={handleDropzoneDragLeave}
      onDragOver={handleDropzoneDragOver}
      onDrop={handleDropzoneDrop}
    >
      <div className="relative space-y-4">
        <header className="min-w-0">
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] tracking-[-0.02em] text-cos-text">
            Files
          </h1>
          <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-cos-muted">
            Everything your team has uploaded — grouped by event, same library
            that lives on each event’s Files tab.
          </p>
          {data.listCapped ? (
            <p className="mt-1.5 text-sm text-cos-muted" role="status">
              Showing the {data.listCap?.toLocaleString() ?? "recent"} newest
              files. Narrow by event or search for an older file.
            </p>
          ) : null}
        </header>

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
          <label className="flex min-w-[220px] max-w-md flex-1 items-center gap-2.5 rounded-full border border-cos-border bg-cos-card px-4 py-2.5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <span className="sr-only">Search files</span>
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px] shrink-0 stroke-cos-muted"
              fill="none"
              strokeWidth={1.8}
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by file or event name…"
              autoComplete="off"
              className="w-full border-none bg-transparent text-sm font-semibold text-cos-text outline-none placeholder:font-medium placeholder:text-cos-muted"
            />
          </label>

          {data.events.length > 0 ? (
            <label className="inline-flex min-w-[12rem] items-center gap-2">
              <span className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                Event
              </span>
              <select
                value={eventFilter ?? ""}
                onChange={(event) =>
                  handleEventFilterChange(event.target.value || null)
                }
                aria-label="Filter by event"
                className="appearance-none rounded-full border-0 bg-[rgba(47,74,60,0.12)] px-3.5 py-2 text-xs font-bold text-[#2f4a3c] outline-none"
              >
                <option value="">All events ({data.files.length})</option>
                {comingUpEvents.length > 0 ? (
                  <optgroup label="Coming up">
                    {comingUpEvents.map((event) => (
                      <option key={event.eventId} value={event.eventId}>
                        {event.title} ({event.fileCount})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {earlierEvents.length > 0 ? (
                  <optgroup label="More events">
                    {earlierEvents.map((event) => (
                      <option key={event.eventId} value={event.eventId}>
                        {event.title} ({event.fileCount})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
          ) : null}

          <div
            className="inline-flex items-center gap-0.5"
            role="group"
            aria-label="Sort files"
          >
            <span className="mr-1 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
              Sort
            </span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSortChange(option.id)}
                className={cn(
                  "rounded-full px-3 py-[7px] text-[13px] font-semibold transition",
                  sortMode === option.id
                    ? "bg-[rgba(255,252,247,0.85)] text-cos-text"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div
          role="region"
          aria-label="Drop files to upload"
          className={cn(
            "w-full rounded-[22px] border-[1.5px] border-dashed border-cos-border bg-[rgba(255,252,247,0.45)] px-5 py-5 text-center text-[13px] font-semibold text-cos-muted transition",
            isDraggingFiles && "border-[#6b8171] bg-[rgba(107,129,113,0.08)] text-cos-text",
          )}
        >
          Drop files here — then choose the event and label.
        </div>

        <div className="pt-1">
          <FilesEaseList
            eventGroups={eventGroups}
            onRenamed={handleRenamed}
            onDeleted={handleDeleted}
            emptyTitle="No files match"
            emptyBody="Try another search, clear the event filter, or drop files to upload."
          />
        </div>
      </div>

      <FileUploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setPendingUploadFiles([]);
        }}
        events={data.eventList}
        defaultUploaderName={data.currentUserName}
        initialFiles={pendingUploadFiles}
        preferredEventId={eventFilter}
      />
    </div>
  );
}
