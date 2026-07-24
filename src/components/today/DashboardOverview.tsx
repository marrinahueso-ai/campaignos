"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { DashboardAddWidgetsModal } from "@/components/today/DashboardAddWidgetsModal";
import { saveDashboardLayoutAction } from "@/lib/today/dashboard-layout-actions";
import {
  applyDashboardWidgetSelection,
  getDashboardWidgetDefinition,
  moveDashboardWidget,
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
  const [layout, setLayout] = useState(initialLayout);
  const layoutRef = useRef(initialLayout);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DashboardLayout | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (editing || addOpen) return;
    setLayout(initialLayout);
    layoutRef.current = initialLayout;
  }, [initialLayout, editing, addOpen]);

  const displayLayout = draft ?? layout;

  function persist(next: DashboardLayout) {
    const previous = layoutRef.current;
    layoutRef.current = next;
    setLayout(next);
    setError(null);
    startTransition(async () => {
      const result = await saveDashboardLayoutAction(next);
      if (!result.success) {
        layoutRef.current = previous;
        setLayout(previous);
        setError(result.error ?? "Could not save dashboard layout.");
      }
    });
  }

  function enterEdit() {
    setAddOpen(false);
    setDraft(layout);
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function doneEdit() {
    if (draft) {
      persist(draft);
    }
    setDraft(null);
    setEditing(false);
  }

  function updateDraft(
    updater: (current: DashboardLayout) => DashboardLayout,
  ) {
    setDraft((current) => updater(current ?? layout));
  }

  function handleApplyAdd(selectedIds: DashboardWidgetId[]) {
    const next = applyDashboardWidgetSelection(layout, selectedIds, 2);
    setAddOpen(false);
    persist(next);
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-cos-text">Your overview</h2>
        <div className="flex items-center gap-2">
          {editing ? (
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
          )}
        </div>
      </div>

      {editing ? (
        <p className="text-sm text-cos-muted">
          Reorder or remove widgets, then tap Done to save.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-cos-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-x-6">
        <div className="min-w-0 flex-1">
          <WidgetRegion
            region="main"
            ids={displayLayout.main}
            widgets={widgets}
            editing={editing}
            onRemove={(id) =>
              updateDraft((current) => removeDashboardWidget(current, id))
            }
            onMove={(id, direction) =>
              updateDraft((current) =>
                moveDashboardWidget(current, "main", id, direction),
              )
            }
            emptyLabel="No main widgets. Use Add to bring some back."
          />
        </div>
        <aside className="flex w-full flex-col gap-4 lg:max-w-sm lg:flex-none lg:basis-[min(100%,20rem)]">
          <WidgetRegion
            region="rail"
            ids={displayLayout.rail}
            widgets={widgets}
            editing={editing}
            stacked
            onRemove={(id) =>
              updateDraft((current) => removeDashboardWidget(current, id))
            }
            onMove={(id, direction) =>
              updateDraft((current) =>
                moveDashboardWidget(current, "rail", id, direction),
              )
            }
            emptyLabel="No rail widgets. Use Add to bring some back."
          />
        </aside>
      </div>

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
  onRemove,
  onMove,
  emptyLabel,
}: {
  region: DashboardWidgetRegion;
  ids: DashboardWidgetId[];
  widgets: DashboardWidgetNodes;
  editing: boolean;
  stacked?: boolean;
  onRemove: (id: DashboardWidgetId) => void;
  onMove: (id: DashboardWidgetId, direction: -1 | 1) => void;
  emptyLabel: string;
}) {
  const visible = ids.filter((id) => widgets[id] != null);

  if (visible.length === 0) {
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

  return (
    <div
      className={cn(
        stacked ? "flex flex-col gap-4" : "grid gap-4 sm:grid-cols-2",
      )}
    >
      {visible.map((id, index) => (
        <EditableWidgetFrame
          key={`${region}-${id}`}
          id={id}
          editing={editing}
          canMoveUp={index > 0}
          canMoveDown={index < visible.length - 1}
          onRemove={() => onRemove(id)}
          onMoveUp={() => onMove(id, -1)}
          onMoveDown={() => onMove(id, 1)}
        >
          {widgets[id]}
        </EditableWidgetFrame>
      ))}
    </div>
  );
}

function EditableWidgetFrame({
  id,
  editing,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMoveUp,
  onMoveDown,
  children,
}: {
  id: DashboardWidgetId;
  editing: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  children: React.ReactNode;
}) {
  const label = getDashboardWidgetDefinition(id)?.label ?? id;

  return (
    <div className="space-y-2">
      {editing ? (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted transition-colors hover:text-cos-text disabled:opacity-30"
            aria-label={`Move ${label} up`}
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted transition-colors hover:text-cos-text disabled:opacity-30"
            aria-label={`Move ${label} down`}
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted transition-colors hover:text-cos-error"
            aria-label={`Remove ${label}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      <div
        className={cn(
          editing &&
            "pointer-events-none select-none rounded-2xl ring-2 ring-cos-brand-sage/25",
        )}
      >
        {children}
      </div>
    </div>
  );
}
