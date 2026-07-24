"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Grid3x3,
  List,
  Search,
  Upload,
} from "lucide-react";
import { FileEditDialog } from "@/components/campaign-files/FileEditDialog";
import { FilePlatformIcons } from "@/components/campaign-files/FilePlatformIcons";
import { FileRowActions } from "@/components/campaign-files/FileRowActions";
import { FileTypeBadge } from "@/components/campaign-files/FileTypeBadge";
import { FileTypeIcon } from "@/components/campaign-files/FileTypeIcon";
import {
  FileUploadButton,
  FileUploadDialog,
} from "@/components/campaign-files/FileUploadDialog";
import {
  CAMPAIGN_FILES_MIGRATION,
  CAMPAIGN_FILE_CATEGORIES,
  CAMPAIGN_FILE_STATUSES,
  CAMPAIGN_FILE_TYPES,
  FILES_PAGE_SIZE,
  categoryLabel,
} from "@/lib/campaign-files/constants";
import {
  DEFAULT_FILES_SORT_DIRECTION,
  DEFAULT_FILES_SORT_FIELD,
  createDefaultFilesFilterState,
  filterCampaignFiles,
  nextFilesSortState,
  paginateFiles,
  sortCampaignFiles,
  totalPages,
} from "@/lib/campaign-files/filters";
import { formatFileSize, formatUploadedDate } from "@/lib/campaign-files/format";
import type {
  CampaignFile,
  CampaignFileEventSummary,
  FilesPageData,
  FilesSortDirection,
  FilesSortField,
  FilesViewMode,
} from "@/types/campaign-files";
import { cn } from "@/lib/utils/cn";

const SORTABLE_COLUMNS: {
  key: FilesSortField;
  label: string;
  globalOnly?: boolean;
}[] = [
  { key: "name", label: "File name" },
  { key: "event", label: "Event", globalOnly: true },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "platform", label: "Platform" },
  { key: "uploaded", label: "Uploaded" },
  { key: "size", label: "Size" },
];

function FilesSortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: FilesSortField;
  sortField: FilesSortField;
  sortDirection: FilesSortDirection;
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />;
  }

  return sortDirection === "asc" ? (
    <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
  ) : (
    <ArrowDown className="h-3 w-3" strokeWidth={1.5} />
  );
}

interface FilesDocumentsShellProps {
  data: FilesPageData;
  scope?: "global" | "event";
  lockedEventId?: string;
  initialEventId?: string;
}

function EventThumbnail({
  artworkUrl,
  title,
  selected = false,
}: {
  artworkUrl: string | null;
  title: string;
  selected?: boolean;
}) {
  if (!artworkUrl) {
    return (
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded text-[10px] font-semibold",
          selected ? "bg-white/15 text-white" : "bg-cos-bg text-cos-muted",
        )}
      >
        {title.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "h-8 w-8 shrink-0 overflow-hidden rounded",
        selected ? "ring-1 ring-white/25" : "bg-cos-bg ring-1 ring-cos-border/60",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

const eventCarouselCardClassName = (selected: boolean) =>
  cn(
    "shrink-0 rounded-2xl text-left transition-all duration-200",
    selected
      ? "bg-cos-dark text-white shadow-[0_12px_28px_rgba(42,38,34,0.22)] ring-1 ring-cos-dark"
      : "bg-cos-bg-alt text-cos-text shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04] hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,252,247,0.95)_inset,0_6px_12px_rgba(42,38,34,0.08),0_16px_32px_rgba(42,38,34,0.1)]",
  );

function FilterSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      aria-label={ariaLabel}
      className="h-9 min-w-0 border border-cos-border bg-cos-card px-2.5 text-xs text-cos-text outline-none focus:border-cos-dark"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function FilesDocumentsShell({
  data,
  scope = "global",
  lockedEventId,
  initialEventId,
}: FilesDocumentsShellProps) {
  const isEventScope = scope === "event";
  const presetEventId = lockedEventId ?? initialEventId;
  const [viewMode, setViewMode] = useState<FilesViewMode>("list");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragDepthRef = useRef(0);
  const [editFile, setEditFile] = useState<CampaignFile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState(() =>
    createDefaultFilesFilterState(presetEventId),
  );
  const [carouselEventId, setCarouselEventId] = useState<string | "all">(
    presetEventId ?? "all",
  );
  const [sortField, setSortField] = useState<FilesSortField>(
    DEFAULT_FILES_SORT_FIELD,
  );
  const [sortDirection, setSortDirection] = useState<FilesSortDirection>(
    DEFAULT_FILES_SORT_DIRECTION,
  );

  function isFileDrag(event: DragEvent) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function openUploadWithFile(file: File | null) {
    setPendingUploadFile(file);
    setUploadOpen(true);
  }

  function handlePageDragEnter(event: DragEvent) {
    if (!isFileDrag(event) || uploadOpen) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  }

  function handlePageDragLeave(event: DragEvent) {
    if (!isFileDrag(event) || uploadOpen) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDraggingFiles(false);
    }
  }

  function handlePageDragOver(event: DragEvent) {
    if (!isFileDrag(event) || uploadOpen) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handlePageDrop(event: DragEvent) {
    if (!isFileDrag(event) || uploadOpen) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      openUploadWithFile(file);
    }
  }

  const eventMap = useMemo(() => {
    const map = new Map<string, CampaignFileEventSummary>();
    for (const event of data.events) {
      map.set(event.eventId, event);
    }
    return map;
  }, [data.events]);

  const eventTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of data.events) {
      map.set(event.eventId, event.title);
    }
    return map;
  }, [data.events]);

  const effectiveEventFilter = isEventScope
    ? lockedEventId ?? "all"
    : carouselEventId !== "all"
      ? carouselEventId
      : filters.eventId;

  const filteredFiles = useMemo(() => {
    const filtered = filterCampaignFiles(
      data.files,
      {
        ...filters,
        eventId: effectiveEventFilter,
      },
      eventTitles,
    );
    return sortCampaignFiles(filtered, sortField, sortDirection, eventTitles);
  }, [
    data.files,
    filters,
    effectiveEventFilter,
    sortField,
    sortDirection,
    eventTitles,
  ]);

  const pageCount = totalPages(filteredFiles.length, FILES_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount);
  const pageFiles = paginateFiles(filteredFiles, currentPage, FILES_PAGE_SIZE);
  const rangeStart = filteredFiles.length === 0 ? 0 : (currentPage - 1) * FILES_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * FILES_PAGE_SIZE, filteredFiles.length);

  function handleSort(field: FilesSortField) {
    const next = nextFilesSortState(sortField, sortDirection, field);
    setSortField(next.field);
    setSortDirection(next.direction);
    setPage(1);
  }

  function updateFilter<K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearAllFilters() {
    setFilters(createDefaultFilesFilterState(presetEventId));
    setCarouselEventId(presetEventId ?? "all");
    setPage(1);
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(pageFiles.map((file) => file.id)));
  }

  function toggleSelect(fileId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(fileId);
      } else {
        next.delete(fileId);
      }
      return next;
    });
  }

  if (!data.tablesAvailable) {
    return (
      <div className="cos-card">
        <h2 className="font-display text-2xl text-cos-text">Files &amp; Documents</h2>
        <p className="mt-3 text-sm text-cos-muted">
          Run migration {CAMPAIGN_FILES_MIGRATION} to enable file tracking and uploads.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative space-y-6"
      onDragEnter={handlePageDragEnter}
      onDragLeave={handlePageDragLeave}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
      {isDraggingFiles && !uploadOpen ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-cos-accent bg-cos-bg/90"
          aria-hidden
        >
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <Upload className="h-8 w-8 text-cos-accent" strokeWidth={1.5} />
            <p className="font-display text-xl text-cos-text">Drop file to upload</p>
            <p className="text-sm text-cos-muted">
              PDF, Word, Excel, PNG, or JPG up to 25 MB
            </p>
          </div>
        </div>
      ) : null}

      {!isEventScope ? (
        <div>
          <h1 className="font-display text-3xl text-cos-text">Files &amp; Documents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
            Store, organize, and access all your campaign files in one place. All files can be
            downloaded as PDF.
          </p>
        </div>
      ) : null}

      <div className="border border-cos-border bg-cos-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            ariaLabel="Filter by file type"
            value={filters.fileType}
            options={[
              { value: "all", label: "All file types" },
              ...CAMPAIGN_FILE_TYPES.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ]}
            onChange={(value) => updateFilter("fileType", value)}
          />

          <FilterSelect
            ariaLabel="Filter by category"
            value={filters.category}
            options={[
              { value: "all", label: "All categories" },
              ...CAMPAIGN_FILE_CATEGORIES.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ]}
            onChange={(value) => updateFilter("category", value)}
          />

          <FilterSelect
            ariaLabel="Filter by status"
            value={filters.status}
            options={[
              { value: "all", label: "All statuses" },
              ...CAMPAIGN_FILE_STATUSES.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ]}
            onChange={(value) => updateFilter("status", value)}
          />

          <div className="inline-flex border border-cos-border bg-cos-bg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid"
                  ? "bg-cos-card text-cos-text"
                  : "text-cos-muted hover:text-cos-text",
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <Grid3x3 className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-cos-card text-cos-text"
                  : "text-cos-muted hover:text-cos-text",
              )}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <FileUploadButton onClick={() => openUploadWithFile(null)} />

          <label className="inline-flex h-9 items-center gap-2 border border-cos-border bg-cos-card px-2.5 text-xs text-cos-muted">
            <Calendar className="h-3.5 w-3.5" />
            <input
              type="date"
              value={filters.dateStart}
              onChange={(event) => updateFilter("dateStart", event.target.value)}
              className="bg-transparent text-cos-text outline-none"
              aria-label="Start date"
            />
            <span>to</span>
            <input
              type="date"
              value={filters.dateEnd}
              onChange={(event) => updateFilter("dateEnd", event.target.value)}
              className="bg-transparent text-cos-text outline-none"
              aria-label="End date"
            />
          </label>

          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-medium text-cos-muted hover:text-cos-text"
          >
            Clear all
          </button>

          <label className="relative ml-auto min-w-[12rem] flex-1 basis-[14rem] sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder={
                isEventScope ? "Search files..." : "Search files or events..."
              }
              aria-label={
                isEventScope ? "Search files" : "Search files or events"
              }
              className="h-9 w-full border border-cos-border bg-cos-bg py-0 pr-3 pl-9 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
            />
          </label>
        </div>
      </div>

      {!isEventScope && data.events.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-cos-text">
            Files organized by event
          </h2>
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-1 pr-10">
              <button
                type="button"
                onClick={() => {
                  setCarouselEventId("all");
                  updateFilter("eventId", "all");
                }}
                className={cn(
                  "flex min-w-[9.5rem] flex-col gap-2 px-4 py-3",
                  eventCarouselCardClassName(carouselEventId === "all"),
                )}
              >
                <FolderOpen
                  className={cn(
                    "h-5 w-5",
                    carouselEventId === "all" ? "text-white/70" : "text-cos-muted",
                  )}
                  strokeWidth={1.5}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    carouselEventId === "all" ? "text-white" : "text-cos-text",
                  )}
                >
                  All events
                </span>
                <span
                  className={cn(
                    "text-xs",
                    carouselEventId === "all" ? "text-white/70" : "text-cos-muted",
                  )}
                >
                  {data.files.length} {data.files.length === 1 ? "file" : "files"}
                </span>
              </button>

              {data.events.map((event) => {
                const selected = carouselEventId === event.eventId;
                return (
                  <button
                    key={event.eventId}
                    type="button"
                    onClick={() => {
                      setCarouselEventId(event.eventId);
                      updateFilter("eventId", event.eventId);
                    }}
                    className={cn(
                      "flex min-w-[11rem] items-center gap-3 px-3 py-3",
                      eventCarouselCardClassName(selected),
                    )}
                  >
                    <EventThumbnail
                      artworkUrl={event.artwork?.imageUrl ?? null}
                      title={event.title}
                      selected={selected}
                    />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-sm font-medium",
                          selected ? "text-white" : "text-cos-text",
                        )}
                      >
                        {event.title}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          selected ? "text-white/70" : "text-cos-muted",
                        )}
                      >
                        {event.fileCount} {event.fileCount === 1 ? "file" : "files"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <span
              className="pointer-events-none absolute top-1/2 right-0 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-muted shadow-sm"
              aria-hidden
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </section>
      )}

      {filteredFiles.length === 0 ? (
        <div
          className={cn(
            "border border-dashed bg-cos-card px-6 py-16 text-center transition-colors",
            isDraggingFiles
              ? "border-cos-accent bg-cos-bg-alt"
              : "border-cos-border",
          )}
        >
          <FolderOpen className="mx-auto h-10 w-10 text-cos-muted" strokeWidth={1.5} />
          <p className="mt-4 font-display text-xl text-cos-text">No files yet</p>
          <p className="mt-2 text-sm text-cos-muted">
            Drag and drop a file here, or upload vendor lists, flyers, contracts, and other campaign
            documents to keep everything in one place.
          </p>
          <div className="mt-6">
            <FileUploadButton onClick={() => openUploadWithFile(null)} />
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="overflow-x-auto border border-cos-border bg-cos-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-cos-border bg-cos-bg/50 text-[10px] font-semibold tracking-[0.14em] text-cos-muted uppercase">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={
                      pageFiles.length > 0 &&
                      pageFiles.every((file) => selectedIds.has(file.id))
                    }
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                    aria-label="Select all files on this page"
                  />
                </th>
                {SORTABLE_COLUMNS.filter(
                  (column) => !column.globalOnly || !isEventScope,
                ).map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-3"
                    aria-sort={
                      sortField === column.key
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 transition-colors hover:text-cos-text",
                        sortField === column.key && "text-cos-text",
                      )}
                    >
                      {column.label}
                      <FilesSortIcon
                        field={column.key}
                        sortField={sortField}
                        sortDirection={sortDirection}
                      />
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageFiles.map((file) => {
                const event = eventMap.get(file.eventId);
                return (
                  <tr key={file.id} className="border-b border-cos-border/70 last:border-0">
                    <td className="px-3 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(file.id)}
                        onChange={(event) => toggleSelect(file.id, event.target.checked)}
                        aria-label={`Select ${file.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="flex min-w-[12rem] items-center gap-2">
                        <FileTypeIcon fileType={file.fileType} />
                        <span className="truncate font-medium text-cos-text">{file.name}</span>
                      </span>
                    </td>
                    {!isEventScope && (
                      <td className="px-3 py-3 align-middle">
                        <Link
                          href={`/events/${file.eventId}#files`}
                          className="flex min-w-[10rem] items-center gap-2 hover:text-cos-accent"
                        >
                          <EventThumbnail
                            artworkUrl={event?.artwork?.imageUrl ?? null}
                            title={event?.title ?? "Event"}
                          />
                          <span className="truncate">{event?.title ?? "Event"}</span>
                        </Link>
                      </td>
                    )}
                    <td className="px-3 py-3 align-middle">
                      <FileTypeBadge fileType={file.fileType} />
                    </td>
                    <td className="px-3 py-3 align-middle text-cos-muted">
                      {categoryLabel(file.category)}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <FilePlatformIcons platforms={file.platforms} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="block text-cos-text">
                        {formatUploadedDate(file.uploadedAt)}
                      </span>
                      <span className="text-xs text-cos-muted">
                        by {file.uploaderName ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-cos-muted">
                      {formatFileSize(file.sizeBytes)}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <FileRowActions file={file} onEdit={setEditFile} compact />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageFiles.map((file) => {
            const event = eventMap.get(file.eventId);
            return (
              <article
                key={file.id}
                className="flex flex-col border border-cos-border bg-cos-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileTypeIcon fileType={file.fileType} />
                    <h3 className="truncate font-medium text-cos-text">{file.name}</h3>
                  </div>
                  <FileTypeBadge fileType={file.fileType} />
                </div>

                {!isEventScope && event && (
                  <Link
                    href={`/events/${file.eventId}#files`}
                    className="mt-3 flex items-center gap-2 text-sm text-cos-muted hover:text-cos-text"
                  >
                    <EventThumbnail
                      artworkUrl={event.artwork?.imageUrl ?? null}
                      title={event.title}
                    />
                    <span className="truncate">{event.title}</span>
                  </Link>
                )}

                <dl className="mt-4 space-y-2 text-xs text-cos-muted">
                  <div className="flex justify-between gap-3">
                    <dt>Category</dt>
                    <dd className="text-cos-text">{categoryLabel(file.category)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Platform</dt>
                    <dd>
                      <FilePlatformIcons platforms={file.platforms} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Uploaded</dt>
                    <dd className="text-right text-cos-text">
                      {formatUploadedDate(file.uploadedAt)}
                      <span className="block text-cos-muted">
                        by {file.uploaderName ?? "Unknown"}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Size</dt>
                    <dd className="text-cos-text">{formatFileSize(file.sizeBytes)}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex justify-end border-t border-cos-border pt-3">
                  <FileRowActions file={file} onEdit={setEditFile} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filteredFiles.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-cos-muted">
            Showing {rangeStart}–{rangeEnd} of {filteredFiles.length}{" "}
            {filteredFiles.length === 1 ? "file" : "files"}
          </p>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
              className="flex h-8 w-8 items-center justify-center border border-cos-border bg-cos-card text-cos-muted disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: pageCount }, (_, index) => index + 1)
              .filter((pageNumber) => {
                if (pageCount <= 5) return true;
                if (pageNumber === 1 || pageNumber === pageCount) return true;
                return Math.abs(pageNumber - currentPage) <= 1;
              })
              .map((pageNumber, index, visible) => {
                const prev = visible[index - 1];
                const showEllipsis = prev !== undefined && pageNumber - prev > 1;
                return (
                  <span key={pageNumber} className="inline-flex items-center gap-1">
                    {showEllipsis && (
                      <span className="px-1 text-xs text-cos-muted">…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={cn(
                        "flex h-8 min-w-8 items-center justify-center border text-xs font-medium",
                        pageNumber === currentPage
                          ? "border-cos-accent bg-cos-bg-alt text-cos-text"
                          : "border-cos-border bg-cos-card text-cos-muted hover:text-cos-text",
                      )}
                    >
                      {pageNumber}
                    </button>
                  </span>
                );
              })}

            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={currentPage >= pageCount}
              className="flex h-8 w-8 items-center justify-center border border-cos-border bg-cos-card text-cos-muted disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <FileUploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setPendingUploadFile(null);
        }}
        events={data.eventList}
        lockedEventId={lockedEventId}
        defaultUploaderName={data.currentUserName}
        initialFile={pendingUploadFile}
      />

      {editFile && (
        <FileEditDialog file={editFile} onClose={() => setEditFile(null)} />
      )}
    </div>
  );
}
