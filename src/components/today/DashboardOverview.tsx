"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
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
import { saveDashboardLayoutAction } from "@/lib/today/dashboard-layout-actions";
import {
  applyDashboardWidgetSelection,
  getDashboardWidgetDefinition,
  placeDashboardWidget,
  removeDashboardWidget,
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
  className?: string;
}

export function DashboardOverview({
  initialLayout,
  widgets,
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
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
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

  function persist(next: DashboardLayout) {
    const previous = layoutRef.current;
    const normalized = pinWeatherInLayout(next);
    layoutRef.current = normalized;
    setLayout(normalized);
    setError(null);
    startTransition(async () => {
      const result = await saveDashboardLayoutAction(normalized);
      if (!result.success) {
        layoutRef.current = previous;
        setLayout(previous);
        setError(result.error ?? "Could not save dashboard layout.");
        return;
      }
      router.refresh();
    });
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
    persist(next);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as DashboardWidgetId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/*
          Two-column board from the top: header + main tiles on the left,
          Weather pinned in the true top-right corner of the overview.
        */}
        <div
          className={cn(
            "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-x-6",
            activeId && "select-none",
          )}
        >
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-cos-text">
                Your overview
              </h2>
              <div className="flex items-center gap-2">{overviewActions}</div>
            </div>

            {editing ? (
              <p className="text-sm text-cos-muted">
                Remove tiles you don&apos;t need, then tap Done. Drag the grip
                to rearrange — Weather stays pinned top right.
              </p>
            ) : null}

            <WidgetRegion
              region="main"
              ids={mainIds}
              widgets={widgets}
              editing={editing}
              onRemove={(id) =>
                updateDraft((current) => removeDashboardWidget(current, id))
              }
              emptyLabel="No main widgets. Use Add to bring some back."
            />
          </div>

          <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-4 lg:z-20 lg:max-w-sm lg:flex-none lg:basis-[min(100%,20rem)] lg:self-start">
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
              editing={editing}
              stacked
              hideEmpty={hasPinnedWeather}
              onRemove={(id) =>
                updateDraft((current) => removeDashboardWidget(current, id))
              }
              emptyLabel="No rail widgets. Use Add to bring some back."
            />
          </aside>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLabel ? (
            <div className="rounded-2xl border border-cos-brand-sage/40 bg-cos-bg-alt px-4 py-3 text-sm font-semibold text-cos-text shadow-lg ring-1 ring-black/[0.06]">
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
  editing,
  stacked = false,
  hideEmpty = false,
  onRemove,
  emptyLabel,
}: {
  region: DashboardWidgetRegion;
  ids: DashboardWidgetId[];
  widgets: DashboardWidgetNodes;
  editing: boolean;
  stacked?: boolean;
  hideEmpty?: boolean;
  onRemove: (id: DashboardWidgetId) => void;
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
              onRemove={() => onRemove(heroId)}
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
                  onRemove={() => onRemove(id)}
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
            onRemove={() => onRemove(id)}
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
  onRemove,
  children,
  className,
  uniform = false,
}: {
  id: DashboardWidgetId;
  editing: boolean;
  onRemove: () => void;
  children: React.ReactNode;
  className?: string;
  uniform?: boolean;
}) {
  const label = getDashboardWidgetDefinition(id)?.label ?? id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative min-w-0",
        uniform && "h-full min-h-[16.5rem]",
        className,
        isDragging && "z-20 opacity-40",
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
          editing && "rounded-2xl ring-2 ring-cos-brand-sage/25",
        )}
      >
        {children}
      </div>
    </div>
  );
}
