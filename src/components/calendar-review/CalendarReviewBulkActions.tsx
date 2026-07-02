"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CalendarReviewBulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  onApplyRecommendedPlans: () => void;
  disabled?: boolean;
}

export function CalendarReviewBulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onDeleteAll,
  onApplyRecommendedPlans,
  disabled = false,
}: CalendarReviewBulkActionsProps) {
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-cos-border bg-cos-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-cos-muted">
        {selectedCount > 0 ? (
          <span>
            <span className="font-medium text-cos-text">{selectedCount}</span>{" "}
            selected
          </span>
        ) : (
          <span>Select rows to remove bad imports before adding them to your calendar.</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onApplyRecommendedPlans}
          disabled={disabled}
        >
          <RefreshCw className="h-4 w-4" />
          Apply recommended plans
        </Button>
        {selectedCount < totalCount ? (
          <Button type="button" variant="secondary" size="sm" onClick={onSelectAll} disabled={disabled}>
            Select all
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClearSelection}
            disabled={disabled}
          >
            Clear selection
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={onDeleteSelected}
          disabled={disabled || selectedCount === 0}
        >
          <Trash2 className="h-4 w-4" />
          Delete selected
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={onDeleteAll}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
          Delete all
        </Button>
      </div>
    </div>
  );
}
