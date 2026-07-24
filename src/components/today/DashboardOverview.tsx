"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Plus, X } from "lucide-react";
import { DashboardAddWidgetsModal } from "@/components/today/DashboardAddWidgetsModal";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { saveDashboardLayoutAction } from "@/lib/today/dashboard-layout-actions";
import {
  dashboardWidgetSupportsColor,
  getDashboardCardTone,
} from "@/lib/today/dashboard-widget-colors";
import {
  applyDashboardWidgetSelection,
  getDashboardWidgetColor,
  getDashboardWidgetDefinition,
  placeDashboardWidget,
  removeDashboardWidget,
  setDashboardWidgetColor,
  type DashboardLayout,
  type DashboardWidgetId,
  type DashboardWidgetRegion,
} from "@/lib/today/dashboard-widgets";
import { cn } from "@/lib/utils/cn";

export type DashboardWidgetNodes = Partial<
  Record<DashboardWidgetId, React.ReactNode>
>;

interface DashboardOverviewProps {
  initialLayout: DashboardLayout;
  widgets: DashboardWidgetNodes;
  /** Greeting / onboarding — left column, top-aligned with Weather. */
  header?: React.ReactNode;
  className?: string;
}

export function DashboardOverview({
  initialLayout,
  widgets,
  header,
  className,
}: DashboardOverviewProps) {
  const router = useRouter();
  const [layout, setLayout] = useState(() => pinWeatherInLayout(initialLayout));
  const layoutRef = useRef(pinWeatherInLayout(initialLayout));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DashboardLayout | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<DashboardWidgetId | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Small distance only — avoids stealing clicks without a press-hold delay.
      activationConstraint: { distance: 2 },
    }),
    useSensor(TouchSensor, {
      // Distance-based (not delay) so touch drag feels as immediate as mouse.
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (editing || addOpen || activeId) return;
    const next = pinWeatherInLayout(initialLayout);
    setLayout(next);
    layoutRef.current = next;
  }, [initialLayout, editing, addOpen, activeId]);

  const displayLayout = draft ?? layout;
  const mainIds = displayLayout.main;
  const hasPinnedWeather = displayLayout.rail.includes("weather");
  const railIds = useMemo(
    () => displayLayout.rail.filter((id) => id !== "weather"),
    [displayLayout.rail],
  );

  /**
   * Optimistic layout update (instant). Persist in the background like calendar DnD —
   * never block the drag/drop paint on the server round-trip.
   */
  function persist(
    next: DashboardLayout,
    options: { refresh?: boolean } = {},
  ) {
    const previous = layoutRef.current;
    const normalized = pinWeatherInLayout(next);
    layoutRef.current = normalized;
    setLayout(normalized);
    setError(null);

    void (async () => {
      const result = await saveDashboardLayoutAction(normalized);
      if (!result.success) {
        layoutRef.current = previous;
        setLayout(previous);
        setError(result.error ?? "Could not save dashboard layout.");
        return;
      }
      // Only refresh when newly added widgets need server-rendered data.
      if (options.refresh) {
        startTransition(() => {
          router.refresh();
        });
      }
    })();
  }

  function enterEdit() {
    setAddOpen(false);
    setDraft(pinWeatherInLayout(layout));
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
    setActiveId(null);
  }

  function doneEdit() {
    if (draft) {
      persist(draft);
    }
    setDraft(null);
    setEditing(false);
    setActiveId(null);
  }

  function updateDraft(
    updater: (current: DashboardLayout) => DashboardLayout,
  ) {
    setDraft((current) => pinWeatherInLayout(updater(current ?? layout)));
  }

  function handleApplyAdd(selectedIds: DashboardWidgetId[]) {
    const next = applyDashboardWidgetSelection(layout, selectedIds, 3);
    setAddOpen(false);
    persist(next, { refresh: true });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as DashboardWidgetId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    // Clear drag chrome first so the drop paint isn't competing with overlay state.
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeWidgetId = active.id as DashboardWidgetId;
    const overWidgetId = over.id as DashboardWidgetId;
    if (activeWidgetId === "weather") return;

    const next = placeDashboardWidget(
      displayLayout,
      activeWidgetId,
      overWidgetId,
    );
    if (
      next.main.join() === displayLayout.main.join() &&
      next.rail.join() === displayLayout.rail.join()
    ) {
      return;
    }

    if (editing) {
      setDraft(pinWeatherInLayout(next));
      return;
    }

    // Instant board reorder; save happens off the UI thread path.
    persist(next);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeLabel = activeId
    ? (getDashboardWidgetDefinition(activeId)?.label ?? activeId)
    : null;

  const overviewActions = editing ? (
    <>
      <button
        type="button"
        onClick={cancelEdit}
        disabled={isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cos-border bg-cos-card px-3 text-sm font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={doneEdit}
        disabled={isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cos-border bg-cos-text px-3 text-sm font-medium text-cos-card transition-colors hover:opacity-90 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        {isPending ? "Saving…" : "Done"}
      </button>
    </>
  ) : (
    <>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        disabled={isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cos-border bg-cos-card px-3 text-sm font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add
      </button>
      <button
        type="button"
        onClick={enterEdit}
        disabled={isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cos-border bg-cos-card px-3 text-sm font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:opacity-50"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit
      </button>
    </>
  );

  return (
    <section className={cn("space-y-4", className)}>
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
        {/*
          Two independent columns (not a 2×2 row grid):
          Left stacks greeting → Add/Edit → Up Next…
          Right stacks Weather → Calendar…
          So a tall Weather card cannot open a blank gap under the greeting.
        */}
        <div
          className={cn(
            "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start lg:gap-x-6",
            activeId && "select-none",
          )}
        >
          <div className="min-w-0 space-y-4">
            {header}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {overviewActions}
              </div>
              {editing ? (
                <p className="text-sm text-cos-muted">
                  Remove tiles, change card colors (palette), then tap Done.
                  Drag the grip to rearrange — Weather, Up Next, and Calendar
                  stay fixed in look.
                </p>
              ) : null}
              <WidgetRegion
                region="main"
                ids={mainIds}
                widgets={widgets}
                layout={displayLayout}
                editing={editing}
                onRemove={(id) =>
                  updateDraft((current) => removeDashboardWidget(current, id))
                }
                onColorChange={(id, color) =>
                  updateDraft((current) =>
                    setDashboardWidgetColor(current, id, color),
                  )
                }
                emptyLabel="No main widgets. Use Add to bring some back."
              />
            </div>
          </div>

          <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-4 lg:z-20">
            {hasPinnedWeather ? (
              <PinnedWeatherFrame
                editing={editing}
                onRemove={() =>
                  updateDraft((current) =>
                    removeDashboardWidget(current, "weather"),
                  )
                }
              >
                {widgets.weather ?? <WidgetLoadingPlaceholder id="weather" />}
              </PinnedWeatherFrame>
            ) : null}
            <WidgetRegion
              region="rail"
              ids={railIds}
              widgets={widgets}
              layout={displayLayout}
              editing={editing}
              stacked
              hideEmpty={false}
              onRemove={(id) =>
                updateDraft((current) => removeDashboardWidget(current, id))
              }
              onColorChange={(id, color) =>
                updateDraft((current) =>
                  setDashboardWidgetColor(current, id, color),
                )
              }
              emptyLabel="No rail widgets. Use Add to bring some back."
            />
          </aside>
        </div>

        <DragOverlay dropAnimation={null} zIndex={50}>
          {activeLabel ? (
            <div className="w-56 cursor-grabbing rounded-2xl border border-cos-brand-sage/40 bg-cos-bg-alt px-4 py-3 text-sm font-semibold text-cos-text shadow-lg ring-1 ring-black/[0.06]">
              {activeLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DashboardAddWidgetsModal
        open={addOpen}
        layout={layout}
        pending={isPending}
        onClose={() => setAddOpen(false)}
        onApply={handleApplyAdd}
      />
    </section>
  );
}

function WidgetRegion({
  region,
  ids,
  widgets,
  layout,
  editing,
  stacked = false,
  hideEmpty = false,
  onRemove,
  onColorChange,
  emptyLabel,
}: {
  region: DashboardWidgetRegion;
  ids: DashboardWidgetId[];
  widgets: DashboardWidgetNodes;
  layout: DashboardLayout;
  editing: boolean;
  stacked?: boolean;
  hideEmpty?: boolean;
  onRemove: (id: DashboardWidgetId) => void;
  onColorChange: (id: DashboardWidgetId, color: string | null) => void;
  emptyLabel: string;
}) {
  if (ids.length === 0) {
    if (hideEmpty) return null;
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-cos-border px-4 py-8 text-center text-sm text-cos-muted",
          !stacked && "sm:col-span-2",
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  if (!stacked) {
    const heroId = ids.includes("up_next") ? ("up_next" as const) : null;
    const tileIds = ids.filter((id) => id !== "up_next");

    return (
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="flex flex-col gap-4">
          {heroId ? (
            <SortableWidgetFrame
              key={`${region}-${heroId}`}
              id={heroId}
              editing={editing}
              color={getDashboardWidgetColor(layout, heroId)}
              onRemove={() => onRemove(heroId)}
              onColorChange={(color) => onColorChange(heroId, color)}
            >
              {widgets[heroId] ?? <WidgetLoadingPlaceholder id={heroId} />}
            </SortableWidgetFrame>
          ) : null}
          {tileIds.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch">
              {tileIds.map((id) => (
                <SortableWidgetFrame
                  key={`${region}-${id}`}
                  id={id}
                  editing={editing}
                  uniform
                  color={getDashboardWidgetColor(layout, id)}
                  onRemove={() => onRemove(id)}
                  onColorChange={(color) => onColorChange(id, color)}
                >
                  {widgets[id] ?? <WidgetLoadingPlaceholder id={id} />}
                </SortableWidgetFrame>
              ))}
            </div>
          ) : null}
        </div>
      </SortableContext>
    );
  }

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col gap-4">
        {ids.map((id) => (
          <SortableWidgetFrame
            key={`${region}-${id}`}
            id={id}
            editing={editing}
            color={getDashboardWidgetColor(layout, id)}
            onRemove={() => onRemove(id)}
            onColorChange={(color) => onColorChange(id, color)}
          >
            {widgets[id] ?? <WidgetLoadingPlaceholder id={id} />}
          </SortableWidgetFrame>
        ))}
      </div>
    </SortableContext>
  );
}

function pinWeatherFirst(ids: DashboardWidgetId[]): DashboardWidgetId[] {
  if (!ids.includes("weather")) return ids;
  return ["weather", ...ids.filter((id) => id !== "weather")];
}

function pinWeatherInLayout(layout: DashboardLayout): DashboardLayout {
  return {
    ...layout,
    rail: pinWeatherFirst(layout.rail),
  };
}

function WidgetLoadingPlaceholder({ id }: { id: DashboardWidgetId }) {
  const label = getDashboardWidgetDefinition(id)?.label ?? "Widget";
  return (
    <div className="rounded-2xl bg-cos-bg-alt p-5 text-sm text-cos-muted shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]">
      Loading {label}…
    </div>
  );
}

function PinnedWeatherFrame({
  editing,
  onRemove,
  children,
}: {
  editing: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {editing ? (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
          <span className="rounded-md bg-cos-card/90 px-1.5 py-0.5 text-[11px] font-medium text-cos-muted ring-1 ring-black/[0.06]">
            Pinned
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:text-cos-error"
            aria-label="Remove Weather"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      <div
        className={cn(editing && "rounded-2xl ring-2 ring-cos-brand-sage/25")}
      >
        {children}
      </div>
    </div>
  );
}

function SortableWidgetFrame({
  id,
  editing,
  color,
  onRemove,
  onColorChange,
  children,
  className,
  uniform = false,
}: {
  id: DashboardWidgetId;
  editing: boolean;
  color: string | null;
  onRemove: () => void;
  onColorChange: (color: string | null) => void;
  children: React.ReactNode;
  className?: string;
  uniform?: boolean;
}) {
  const label = getDashboardWidgetDefinition(id)?.label ?? id;
  const colorable = dashboardWidgetSupportsColor(id);
  const tone =
    colorable && color ? getDashboardCardTone(color) : null;
  const { active } = useDndContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id,
    // No layout animation — matches calendar “move now, persist later” feel.
    animateLayoutChanges: () => false,
    transition: null,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    // Skip CSS transitions while any drag is active (avoids hitching on heavy cards).
    ...(active ? { transition: "none" } : null),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative min-w-0",
        uniform && "h-full min-h-[16.5rem]",
        className,
        // Hide the heavy card while dragging; DragOverlay is the lightweight preview.
        isDragging && "z-20 opacity-0",
      )}
    >
      <div
        className={cn(
          "absolute right-3 top-3 z-20 flex items-center gap-1",
          // Keep cards clean; reveal drag controls on hover/focus or while editing.
          !editing &&
            "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        {editing && colorable ? (
          <DashboardWidgetColorPicker
            label={label}
            value={color}
            onChange={onColorChange}
          />
        ) : null}
        {editing ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:text-cos-error"
            aria-label={`Remove ${label}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:text-cos-text active:cursor-grabbing"
          aria-label={`Drag to move ${label}`}
          title="Drag to move"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div
        className={cn(
          "h-full",
          uniform && "flex flex-col [&>*]:h-full [&>*]:min-h-0",
          // Colored cards: one outer radius clips the fill so cream ring/shadow
          // from the inner section cannot show as square “ghost” edges.
          tone &&
            "overflow-hidden rounded-2xl shadow-[0_2px_4px_rgba(42,38,34,0.08),0_10px_22px_rgba(42,38,34,0.12)] [&>section]:rounded-none [&>section]:bg-transparent [&>section]:shadow-none [&>section]:ring-0",
          editing && "rounded-2xl ring-2 ring-cos-brand-sage/25",
        )}
        style={tone?.style}
      >
        {children}
      </div>
    </div>
  );
}
