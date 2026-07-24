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
import { Check, GripVertical, Pencil } from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { saveApprovalsLayoutAction } from "@/lib/approvals-scheduling/approvals-layout-actions";
import {
  APPROVALS_SUMMARY_CARDS,
  reorderApprovalsCard,
  setApprovalsCardColor,
  type ApprovalsLayout,
  type ApprovalsSummaryCardKey,
} from "@/lib/approvals-scheduling/approvals-layout";
import type {
  UnifiedApprovalSummaryCounts,
  UnifiedTabId,
} from "@/lib/approvals-scheduling/types";
import { getDashboardCardTone } from "@/lib/today/dashboard-widget-colors";
import { cn } from "@/lib/utils/cn";

interface SummaryCardsProps {
  summary: UnifiedApprovalSummaryCounts;
  activeFilter: UnifiedTabId;
  onFilterChange: (filter: UnifiedTabId) => void;
  initialLayout: ApprovalsLayout;
}

const CARD_BY_KEY = Object.fromEntries(
  APPROVALS_SUMMARY_CARDS.map((card) => [card.key, card]),
) as Record<ApprovalsSummaryCardKey, (typeof APPROVALS_SUMMARY_CARDS)[number]>;

export function SummaryCards({
  summary,
  activeFilter,
  onFilterChange,
  initialLayout,
}: SummaryCardsProps) {
  const [layout, setLayout] = useState(initialLayout);
  const layoutRef = useRef(initialLayout);
  const [editing, setEditing] = useState(false);
  const [activeId, setActiveId] = useState<ApprovalsSummaryCardKey | null>(
    null,
  );
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

  function persist(next: ApprovalsLayout) {
    const previous = layoutRef.current;
    layoutRef.current = next;
    setLayout(next);
    setError(null);
    void (async () => {
      const result = await saveApprovalsLayoutAction(next);
      if (!result.success) {
        layoutRef.current = previous;
        setLayout(previous);
        setError(result.error ?? "Could not save card layout.");
      }
    })();
  }

  function handleDragStart(event: DragStartEvent) {
    if (!editing) return;
    setActiveId(event.active.id as ApprovalsSummaryCardKey);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!editing || !over || active.id === over.id) return;

    const next = reorderApprovalsCard(
      layoutRef.current,
      active.id as ApprovalsSummaryCardKey,
      over.id as ApprovalsSummaryCardKey,
    );
    if (next.order.join() === layoutRef.current.order.join()) return;
    persist(next);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeCard = activeId ? CARD_BY_KEY[activeId] : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
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
              "grid gap-3 sm:grid-cols-2 xl:grid-cols-5",
              activeId && "select-none",
            )}
          >
            {order.map((key) => {
              const card = CARD_BY_KEY[key];
              return (
                <SortableSummaryCard
                  key={key}
                  id={key}
                  label={card.label}
                  description={card.description}
                  count={summary[card.countKey]}
                  selected={activeFilter === key}
                  color={layout.colors?.[key] ?? null}
                  editing={editing}
                  onSelect={() =>
                    onFilterChange(activeFilter === key ? "all" : key)
                  }
                  onColorChange={(color) =>
                    persist(
                      setApprovalsCardColor(layoutRef.current, key, color),
                    )
                  }
                />
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null} zIndex={50}>
          {activeCard && activeId ? (
            <div className="flex min-h-[6rem] w-full max-w-[11rem] cursor-grabbing flex-col items-center justify-center gap-1.5 rounded-2xl bg-cos-bg-alt px-4 py-5 text-center shadow-lg ring-1 ring-cos-brand-sage/40">
              <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
                {activeCard.label}
              </p>
              <p className="font-display text-3xl leading-none text-cos-text tabular-nums">
                {summary[activeCard.countKey]}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableSummaryCard({
  id,
  label,
  description,
  count,
  selected,
  color,
  editing,
  onSelect,
  onColorChange,
}: {
  id: ApprovalsSummaryCardKey;
  label: string;
  description: string;
  count: number;
  selected: boolean;
  color: string | null;
  editing: boolean;
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
        "relative min-h-[6rem] overflow-hidden rounded-2xl",
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
        <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
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
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex min-h-[6rem] w-full flex-col items-center justify-center gap-1.5 px-4 py-5 text-center transition-transform duration-200 hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cos-bg",
        )}
      >
        <span
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
        </span>
        <span
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
          {description}
        </span>
      </button>
    </div>
  );
}
