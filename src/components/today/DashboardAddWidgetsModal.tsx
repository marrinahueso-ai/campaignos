"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getAddableDashboardWidgets,
  layoutContainsWidget,
  type DashboardLayout,
  type DashboardWidgetId,
} from "@/lib/today/dashboard-widgets";
import { cn } from "@/lib/utils/cn";

interface DashboardAddWidgetsModalProps {
  open: boolean;
  layout: DashboardLayout;
  onClose: () => void;
  onApply: (selectedIds: DashboardWidgetId[]) => void;
  pending?: boolean;
}

export function DashboardAddWidgetsModal({
  open,
  layout,
  onClose,
  onApply,
  pending = false,
}: DashboardAddWidgetsModalProps) {
  const catalog = useMemo(() => getAddableDashboardWidgets(3), []);
  const [selected, setSelected] = useState<Set<DashboardWidgetId>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelected(
      new Set(
        catalog
          .map((entry) => entry.id)
          .filter((id) => layoutContainsWidget(layout, id)),
      ),
    );
  }, [open, layout, catalog]);

  if (!open) return null;

  const mainWidgets = catalog.filter((entry) => entry.region !== "rail");
  const railWidgets = catalog.filter((entry) => entry.region === "rail");

  function toggle(id: DashboardWidgetId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0"
        onClick={onClose}
        disabled={pending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-add-widgets-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-cos-border bg-cos-card shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-cos-border px-6 py-5">
          <div>
            <h2
              id="dashboard-add-widgets-title"
              className="font-display text-2xl text-cos-text"
            >
              Add widgets
            </h2>
            <p className="mt-1 text-sm text-cos-muted">
              Choose what appears on your overview.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <CatalogGroup
            title="Main"
            widgets={mainWidgets}
            selected={selected}
            onToggle={toggle}
          />
          <CatalogGroup
            title="Right rail"
            widgets={railWidgets}
            selected={selected}
            onToggle={toggle}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-cos-border px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={pending || selected.size === 0}
            onClick={() => onApply([...selected])}
          >
            {pending ? "Saving…" : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CatalogGroup({
  title,
  widgets,
  selected,
  onToggle,
}: {
  title: string;
  widgets: ReturnType<typeof getAddableDashboardWidgets>;
  selected: Set<DashboardWidgetId>;
  onToggle: (id: DashboardWidgetId) => void;
}) {
  if (widgets.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cos-muted">
        {title}
      </p>
      <ul className="space-y-2">
        {widgets.map((entry) => {
          const checked = selected.has(entry.id);
          return (
            <li key={entry.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                  checked
                    ? "border-cos-brand-sage/40 bg-cos-bg-alt"
                    : "border-cos-border bg-cos-card hover:bg-cos-bg",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(entry.id)}
                  className="mt-0.5 h-4 w-4 rounded border-cos-border text-cos-brand-sage focus:ring-cos-brand-sage"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-cos-text">
                    {entry.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-cos-muted">
                    {entry.description}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
