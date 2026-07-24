"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDndContext,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  ChevronRight,
  FolderOpen,
  GripVertical,
  Pencil,
} from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { saveFilesLayoutAction } from "@/lib/campaign-files/files-layout-actions";
import {
  FILES_ALL_EVENTS_KEY,
  normalizeFilesLayout,
  reorderFilesEventCard,
  setFilesEventCardColor,
  type FilesLayout,
} from "@/lib/campaign-files/files-layout";
import { getDashboardCardTone } from "@/lib/today/dashboard-widget-colors";
import type { CampaignFileEventSummary } from "@/types/campaign-files";
import { cn } from "@/lib/utils/cn";

interface FilesEventCarouselProps {
  events: CampaignFileEventSummary[];
  totalFileCount: number;
  selectedKey: string;
  onSelect: (key: string) => void;
  initialLayout: FilesLayout;
}

function EventThumbnail({
  artworkUrl,
  title,
  selected = false,
  darkTone = false,
}: {
  artworkUrl: string | null;
  title: string;
  selected?: boolean;
  darkTone?: boolean;
}) {
  if (!artworkUrl) {
    return (
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded text-[10px] font-semibold",
          selected || darkTone
            ? "bg-white/15 text-white"
            : "bg-cos-bg text-cos-muted",
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
        selected || darkTone
          ? "ring-1 ring-white/25"
          : "bg-cos-bg ring-1 ring-cos-border/60",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

export function FilesEventCarousel({
  events,
  totalFileCount,
  selectedKey,
  onSelect,
  initialLayout,
}: FilesEventCarouselProps) {
  const eventIds = useMemo(
    () => events.map((event) => event.eventId),
    [events],
  );
  const eventById = useMemo(
    () => new Map(events.map((event) => [event.eventId, event])),
    [events],
  );

  const [layout, setLayout] = useState(() =>
    normalizeFilesLayout(initialLayout, eventIds),
  );
  const layoutRef = useRef(layout);
  const [editing, setEditing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeId) return;
    const next = normalizeFilesLayout(initialLayout, eventIds);
    setLayout(next);
    layoutRef.current = next;
  }, [initialLayout, eventIds, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const order = layout.order;

  function persist(next: FilesLayout) {
    const previous = layoutRef.current;
    const normalized = normalizeFilesLayout(next, eventIds);
    layoutRef.current = normalized;
    setLayout(normalized);
    setError(null);
    void (async () => {
      const result = await saveFilesLayoutAction(normalized);
      if (!result.success) {
        layoutRef.current = previous;
        setLayout(previous);
        setError(result.error ?? "Could not save card layout.");
      }
    })();
  }

  function handleDragStart(event: DragStartEvent) {
    if (!editing) return;
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!editing || !over || active.id === over.id) return;

    const next = reorderFilesEventCard(
      layoutRef.current,
      String(active.id),
      String(over.id),
    );
    if (next.order.join() === layoutRef.current.order.join()) return;
    persist(next);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeEvent =
    activeId && activeId !== FILES_ALL_EVENTS_KEY
      ? eventById.get(activeId)
      : null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-cos-text">
          Files organized by event
        </h2>
        {editing ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cos-border bg-cos-text px-3 text-sm font-medium text-cos-card transition-colors hover:opacity-90"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Done
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cos-border bg-cos-card px-3 text-sm font-medium text-cos-text transition-colors hover:bg-cos-bg"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-cos-error" role="alert">
          {error}
        </p>
      ) : null}

      {editing ? (
        <p className="text-xs text-cos-muted">
          Drag to reorder · use the palette to color cards.
        </p>
      ) : null}

      <div className="relative">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{
            droppable: { strategy: MeasuringStrategy.BeforeDragging },
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={order} strategy={horizontalListSortingStrategy}>
            <div
              className={cn(
                "flex gap-3 overflow-x-auto pb-1 pr-10",
                activeId && "select-none",
              )}
            >
              {order.map((key) => {
                if (key === FILES_ALL_EVENTS_KEY) {
                  return (
                    <SortableEventCard
                      key={key}
                      id={key}
                      editing={editing}
                      selected={selectedKey === FILES_ALL_EVENTS_KEY}
                      color={layout.colors?.[key] ?? null}
                      onSelect={() => onSelect(FILES_ALL_EVENTS_KEY)}
                      onColorChange={(color) =>
                        persist(
                          setFilesEventCardColor(
                            layoutRef.current,
                            key,
                            color,
                          ),
                        )
                      }
                      variant="all"
                      title="All events"
                      subtitle={`${totalFileCount} ${totalFileCount === 1 ? "file" : "files"}`}
                    />
                  );
                }

                const event = eventById.get(key);
                if (!event) return null;
                return (
                  <SortableEventCard
                    key={key}
                    id={key}
                    editing={editing}
                    selected={selectedKey === key}
                    color={layout.colors?.[key] ?? null}
                    onSelect={() => onSelect(key)}
                    onColorChange={(color) =>
                      persist(
                        setFilesEventCardColor(layoutRef.current, key, color),
                      )
                    }
                    variant="event"
                    title={event.title}
                    subtitle={`${event.fileCount} ${event.fileCount === 1 ? "file" : "files"}`}
                    artworkUrl={event.artwork?.imageUrl ?? null}
                  />
                );
              })}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null} zIndex={50}>
            {activeId === FILES_ALL_EVENTS_KEY ? (
              <div className="flex min-w-[9.5rem] cursor-grabbing flex-col gap-2 rounded-2xl bg-cos-bg-alt px-4 py-3 shadow-lg ring-1 ring-cos-brand-sage/40">
                <FolderOpen className="h-5 w-5 text-cos-muted" strokeWidth={1.5} />
                <span className="text-sm font-medium text-cos-text">All events</span>
                <span className="text-xs text-cos-muted">
                  {totalFileCount} {totalFileCount === 1 ? "file" : "files"}
                </span>
              </div>
            ) : activeEvent ? (
              <div className="flex min-w-[11rem] cursor-grabbing items-center gap-3 rounded-2xl bg-cos-bg-alt px-3 py-3 shadow-lg ring-1 ring-cos-brand-sage/40">
                <EventThumbnail
                  artworkUrl={activeEvent.artwork?.imageUrl ?? null}
                  title={activeEvent.title}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-cos-text">
                    {activeEvent.title}
                  </span>
                  <span className="text-xs text-cos-muted">
                    {activeEvent.fileCount}{" "}
                    {activeEvent.fileCount === 1 ? "file" : "files"}
                  </span>
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <span
          className="pointer-events-none absolute top-1/2 right-0 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-muted shadow-sm"
          aria-hidden
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </section>
  );
}

function SortableEventCard({
  id,
  editing,
  selected,
  color,
  onSelect,
  onColorChange,
  variant,
  title,
  subtitle,
  artworkUrl = null,
}: {
  id: string;
  editing: boolean;
  selected: boolean;
  color: string | null;
  onSelect: () => void;
  onColorChange: (color: string | null) => void;
  variant: "all" | "event";
  title: string;
  subtitle: string;
  artworkUrl?: string | null;
}) {
  const { active } = useDndContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id,
    disabled: !editing,
    animateLayoutChanges: () => false,
    transition: null,
  });
  const tone = color ? getDashboardCardTone(color) : null;
  const darkTone = Boolean(tone && tone.text === "#fffcf7");

  const style = {
    transform: CSS.Transform.toString(transform),
    ...(active ? { transition: "none" } : null),
    ...(tone?.style ?? null),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl",
        variant === "all" ? "min-w-[9.5rem]" : "min-w-[11rem]",
        isDragging && "z-20 opacity-0",
        !tone &&
          (selected
            ? "bg-cos-dark text-white shadow-[0_12px_28px_rgba(42,38,34,0.22)] ring-1 ring-cos-dark"
            : "bg-cos-bg-alt text-cos-text shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]"),
        tone &&
          "shadow-[0_2px_4px_rgba(42,38,34,0.08),0_10px_22px_rgba(42,38,34,0.12)]",
        tone &&
          selected &&
          "ring-2 ring-cos-dark ring-offset-2 ring-offset-[var(--cos-bg)]",
        editing && "ring-1 ring-cos-brand-sage/35",
      )}
    >
      {editing ? (
        <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1">
          <DashboardWidgetColorPicker
            label={title}
            value={color}
            onChange={onColorChange}
          />
          <button
            type="button"
            className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:text-cos-text active:cursor-grabbing"
            aria-label={`Drag to reorder ${title}`}
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "w-full text-left transition-transform duration-200 hover:-translate-y-0.5",
          variant === "all"
            ? "flex flex-col gap-2 px-4 py-3"
            : "flex items-center gap-3 px-3 py-3",
        )}
      >
        {variant === "all" ? (
          <>
            <FolderOpen
              className={cn(
                "h-5 w-5",
                tone
                  ? darkTone
                    ? "text-white/75"
                    : "text-cos-muted"
                  : selected
                    ? "text-white/70"
                    : "text-cos-muted",
              )}
              strokeWidth={1.5}
            />
            <span
              className={cn(
                "text-sm font-medium",
                tone
                  ? "text-cos-text"
                  : selected
                    ? "text-white"
                    : "text-cos-text",
              )}
            >
              {title}
            </span>
            <span
              className={cn(
                "text-xs",
                tone
                  ? darkTone
                    ? "text-white/75"
                    : "text-cos-muted"
                  : selected
                    ? "text-white/70"
                    : "text-cos-muted",
              )}
            >
              {subtitle}
            </span>
          </>
        ) : (
          <>
            <EventThumbnail
              artworkUrl={artworkUrl}
              title={title}
              selected={selected}
              darkTone={darkTone}
            />
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate text-sm font-medium",
                  tone
                    ? "text-cos-text"
                    : selected
                      ? "text-white"
                      : "text-cos-text",
                )}
              >
                {title}
              </span>
              <span
                className={cn(
                  "text-xs",
                  tone
                    ? darkTone
                      ? "text-white/75"
                      : "text-cos-muted"
                    : selected
                      ? "text-white/70"
                      : "text-cos-muted",
                )}
              >
                {subtitle}
              </span>
            </span>
          </>
        )}
      </button>
    </div>
  );
}
