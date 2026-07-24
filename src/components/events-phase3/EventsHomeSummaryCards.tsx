"use client";

import { useEffect, useRef, useState } from "react";
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
import { GripVertical } from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { saveEventsHomeLayoutAction } from "@/lib/events/events-home-layout-actions";
import {
  reorderEventsHomeCard,
  setEventsHomeCardColor,
  type EventsHomeLayout,
} from "@/lib/events/events-home-layout";
import {
  EVENTS_HOME_SUMMARY_CARDS,
  EVENTS_HOME_SUMMARY_OVERLAP_NOTE,
  type EventsHomeSummaryKey,
} from "@/lib/events/events-home-summary";
import { getDashboardCardTone } from "@/lib/today/dashboard-widget-colors";
import { cn } from "@/lib/utils/cn";

interface EventsHomeSummaryCardsProps {
  counts: Record<EventsHomeSummaryKey, number>;
  selected: EventsHomeSummaryKey | "all";
  onSelect: (key: EventsHomeSummaryKey | "all") => void;
  initialLayout: EventsHomeLayout;
}

const LABEL_BY_KEY = Object.fromEntries(
  EVENTS_HOME_SUMMARY_CARDS.map((card) => [card.key, card.label]),
) as Record<EventsHomeSummaryKey, string>;

export function EventsHomeSummaryCards({
  counts,
  selected,
  onSelect,
  initialLayout,
}: EventsHomeSummaryCardsProps) {
  const [layout, setLayout] = useState(initialLayout);
  const layoutRef = useRef(initialLayout);
  const [activeId, setActiveId] = useState<EventsHomeSummaryKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeId) return;
    setLayout(initialLayout);
    layoutRef.current = initialLayout;
  }, [initialLayout, activeId]);

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

  function persist(next: EventsHomeLayout) {
    const previous = layoutRef.current;
    layoutRef.current = next;
    setLayout(next);
    setError(null);
    void (async () => {
      const result = await saveEventsHomeLayoutAction(next);
      if (!result.success) {
        layoutRef.current = previous;
        setLayout(previous);
        setError(result.error ?? "Could not save card layout.");
      }
    })();
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as EventsHomeSummaryKey);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeKey = active.id as EventsHomeSummaryKey;
    const overKey = over.id as EventsHomeSummaryKey;
    const next = reorderEventsHomeCard(layoutRef.current, activeKey, overKey);
    if (next.order.join() === layoutRef.current.order.join()) return;
    persist(next);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeLabel = activeId ? LABEL_BY_KEY[activeId] : null;

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-sm text-cos-error" role="alert">
          {error}
        </p>
      ) : null}
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
              "grid gap-3 sm:grid-cols-2 lg:grid-cols-5",
              activeId && "select-none",
            )}
          >
            {order.map((key) => (
              <SortableSummaryCard
                key={key}
                id={key}
                label={LABEL_BY_KEY[key]}
                count={counts[key]}
                selected={selected === key}
                color={layout.colors?.[key] ?? null}
                onSelect={() =>
                  onSelect(selected === key ? "all" : key)
                }
                onColorChange={(color) =>
                  persist(setEventsHomeCardColor(layoutRef.current, key, color))
                }
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null} zIndex={50}>
          {activeLabel && activeId ? (
            <div className="flex min-h-[6rem] w-full max-w-[11rem] cursor-grabbing flex-col items-center justify-center gap-1.5 rounded-2xl bg-cos-bg-alt px-4 py-5 text-center shadow-lg ring-1 ring-cos-brand-sage/40">
              <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
                {activeLabel}
              </p>
              <p className="font-display text-3xl leading-none text-cos-text tabular-nums">
                {counts[activeId]}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <p className="text-xs text-cos-muted">{EVENTS_HOME_SUMMARY_OVERLAP_NOTE}</p>
    </div>
  );
}

function SortableSummaryCard({
  id,
  label,
  count,
  selected,
  color,
  onSelect,
  onColorChange,
}: {
  id: EventsHomeSummaryKey;
  label: string;
  count: number;
  selected: boolean;
  color: string | null;
  onSelect: () => void;
  onColorChange: (color: string | null) => void;
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
        "group relative min-h-[6rem] overflow-hidden rounded-2xl",
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
      )}
    >
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <DashboardWidgetColorPicker
          label={label}
          value={color}
          onChange={onColorChange}
        />
        <button
          type="button"
          className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:text-cos-text active:cursor-grabbing"
          aria-label={`Drag to reorder ${label}`}
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-[6rem] w-full flex-col items-center justify-center gap-1.5 px-4 py-5 text-center transition-transform duration-200 hover:-translate-y-0.5"
      >
        <p
          className={cn(
            "text-xs font-medium tracking-wide uppercase",
            tone
              ? darkTone
                ? "text-white/75"
                : "text-cos-muted"
              : selected
                ? "text-white/70"
                : "text-cos-muted",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "font-display text-3xl leading-none tabular-nums",
            tone
              ? "text-cos-text"
              : selected
                ? "text-white"
                : "text-cos-text",
          )}
        >
          {count}
        </p>
      </button>
    </div>
  );
}
