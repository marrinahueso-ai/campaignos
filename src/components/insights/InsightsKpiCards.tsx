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
  ArrowDownRight,
  ArrowUpRight,
  Check,
  GripVertical,
  Pencil,
} from "lucide-react";
import { MetricSparkline } from "@/components/insights/MetricSparkline";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { saveInsightsLayoutAction } from "@/lib/insights/insights-layout-actions";
import {
  reorderInsightsKpi,
  setInsightsKpiColor,
  type InsightsLayout,
} from "@/lib/insights/insights-layout";
import { formatChangePercent, formatInsightsNumber } from "@/lib/insights/format";
import type { InsightsKpi, InsightsKpiKey } from "@/lib/insights/types";
import { getDashboardCardTone } from "@/lib/today/dashboard-widget-colors";
import { cn } from "@/lib/utils/cn";

interface InsightsKpiCardsProps {
  kpis: InsightsKpi[];
  comparisonLabel: string;
  selectedKey?: InsightsKpiKey;
  onSelect?: (key: InsightsKpiKey) => void;
  initialLayout: InsightsLayout;
}

export function InsightsKpiCards({
  kpis,
  comparisonLabel,
  selectedKey,
  onSelect,
  initialLayout,
}: InsightsKpiCardsProps) {
  const [layout, setLayout] = useState(initialLayout);
  const layoutRef = useRef(initialLayout);
  const [editing, setEditing] = useState(false);
  const [activeId, setActiveId] = useState<InsightsKpiKey | null>(null);
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

  const kpiByKey = useMemo(
    () => new Map(kpis.map((kpi) => [kpi.key, kpi])),
    [kpis],
  );
  const order = layout.order.filter((key) => kpiByKey.has(key));

  function persist(next: InsightsLayout) {
    const previous = layoutRef.current;
    layoutRef.current = next;
    setLayout(next);
    setError(null);
    void (async () => {
      const result = await saveInsightsLayoutAction(next);
      if (!result.success) {
        layoutRef.current = previous;
        setLayout(previous);
        setError(result.error ?? "Could not save card layout.");
      }
    })();
  }

  function handleDragStart(event: DragStartEvent) {
    if (!editing) return;
    setActiveId(event.active.id as InsightsKpiKey);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!editing || !over || active.id === over.id) return;

    const next = reorderInsightsKpi(
      layoutRef.current,
      active.id as InsightsKpiKey,
      over.id as InsightsKpiKey,
    );
    if (next.order.join() === layoutRef.current.order.join()) return;
    persist(next);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeKpi = activeId ? kpiByKey.get(activeId) : null;

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
              "grid grid-cols-2 gap-3 lg:grid-cols-5",
              activeId && "select-none",
            )}
          >
            {order.map((key) => {
              const kpi = kpiByKey.get(key);
              if (!kpi) return null;
              return (
                <SortableKpiCard
                  key={key}
                  kpi={kpi}
                  comparisonLabel={comparisonLabel}
                  selected={selectedKey === key}
                  color={layout.colors?.[key] ?? null}
                  editing={editing}
                  interactive={Boolean(onSelect)}
                  onSelect={() => onSelect?.(key)}
                  onColorChange={(color) =>
                    persist(setInsightsKpiColor(layoutRef.current, key, color))
                  }
                />
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null} zIndex={50}>
          {activeKpi ? (
            <div className="min-h-[7.5rem] rounded-2xl bg-cos-bg-alt px-4 py-4 shadow-lg ring-1 ring-cos-brand-sage/40">
              <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
                {activeKpi.label}
              </p>
              <p className="mt-2 font-display text-3xl leading-none text-cos-text tabular-nums">
                {activeKpi.value != null
                  ? formatInsightsNumber(activeKpi.value)
                  : "—"}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableKpiCard({
  kpi,
  comparisonLabel,
  selected,
  color,
  editing,
  interactive,
  onSelect,
  onColorChange,
}: {
  kpi: InsightsKpi;
  comparisonLabel: string;
  selected: boolean;
  color: string | null;
  editing: boolean;
  interactive: boolean;
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
    id: kpi.key,
    disabled: !editing,
    animateLayoutChanges: () => false,
    transition: null,
  });
  const tone = color ? getDashboardCardTone(color) : null;
  const darkTone = Boolean(tone && tone.text === "#fffcf7");
  const change = formatChangePercent(kpi.changePercent);
  const positive = (kpi.changePercent ?? 0) >= 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    ...(active ? { transition: "none" } : null),
    ...(tone?.style ?? null),
  };

  const sparkStroke = tone
    ? darkTone
      ? "#f6f2eb"
      : "#5f735f"
    : selected
      ? "#f6f2eb"
      : "#5f735f";

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
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
          {kpi.label}
        </p>
        <MetricSparkline
          values={kpi.sparkline}
          className="h-8 w-20 shrink-0"
          stroke={sparkStroke}
        />
      </div>

      <div className="mt-2 flex items-end gap-2">
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
          {kpi.value != null ? formatInsightsNumber(kpi.value) : "—"}
        </p>
        {kpi.unavailableReason ? null : change ? (
          <div className="mb-0.5 flex items-center gap-0.5 text-xs">
            {positive ? (
              <ArrowUpRight
                className={cn(
                  "h-3.5 w-3.5",
                  selected || darkTone ? "text-emerald-300" : "text-cos-success",
                )}
              />
            ) : (
              <ArrowDownRight
                className={cn(
                  "h-3.5 w-3.5",
                  selected || darkTone ? "text-red-300" : "text-cos-error",
                )}
              />
            )}
            <span
              className={cn(
                "font-medium",
                selected || darkTone
                  ? positive
                    ? "text-emerald-300"
                    : "text-red-300"
                  : positive
                    ? "text-cos-success-text"
                    : "text-cos-error-text",
              )}
            >
              {change}
            </span>
          </div>
        ) : null}
      </div>

      {kpi.unavailableReason ? (
        <p
          className={cn(
            "mt-1.5 line-clamp-2 text-xs leading-snug",
            tone
              ? darkTone
                ? "text-white/75"
                : "text-cos-muted"
              : selected
                ? "text-white/70"
                : "text-cos-muted",
          )}
        >
          {kpi.unavailableReason}
        </p>
      ) : (
        <p
          className={cn(
            "mt-1.5 text-[11px]",
            tone
              ? darkTone
                ? "text-white/75"
                : "text-cos-muted"
              : selected
                ? "text-white/70"
                : "text-cos-muted",
          )}
        >
          {comparisonLabel}
        </p>
      )}
    </>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative min-h-[7.5rem] overflow-hidden rounded-2xl",
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
            label={kpi.label}
            value={color}
            onChange={onColorChange}
          />
          <button
            type="button"
            className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:text-cos-text active:cursor-grabbing"
            aria-label={`Drag to reorder ${kpi.label}`}
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      {interactive ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="min-h-[7.5rem] w-full px-4 py-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
        >
          {content}
        </button>
      ) : (
        <div className="min-h-[7.5rem] px-4 py-4">{content}</div>
      )}
    </div>
  );
}
