"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface ArtworkV2ReviewAdjustPanelProps {
  selectedVersionIndex: number | null;
  adjustmentComments: string;
  isBusy?: boolean;
  onCommentsChange: (value: string) => void;
  onGenerateWithEdits: () => void;
  onApproveAsIs: () => void;
}

export function ArtworkV2ReviewAdjustPanel({
  selectedVersionIndex,
  adjustmentComments,
  isBusy = false,
  onCommentsChange,
  onGenerateWithEdits,
  onApproveAsIs,
}: ArtworkV2ReviewAdjustPanelProps) {
  const hasSelection = selectedVersionIndex != null;
  const hasComments = adjustmentComments.trim().length > 0;

  return (
    <section className="mt-4 rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm sm:p-5">
      <header className="space-y-1">
        <h3 className="text-base font-semibold text-cos-text">Prefer one, with edits?</h3>
        <p className="text-sm text-cos-muted">
          Select the version you like best, describe what to change, then generate updated options —
          or approve your selection as-is.
        </p>
      </header>

      <div className="mt-4 space-y-2">
        <label htmlFor="artwork-v2-adjust-comments" className="text-sm font-medium text-cos-text">
          Your edits
          {hasSelection && (
            <span className="ml-2 font-normal text-cos-muted">
              (for Version {selectedVersionIndex})
            </span>
          )}
        </label>
        <Textarea
          id="artwork-v2-adjust-comments"
          value={adjustmentComments}
          onChange={(event) => onCommentsChange(event.target.value)}
          placeholder={
            hasSelection
              ? "Describe what you'd like different — colors, layout, text, spacing..."
              : "Select a version above first, then describe your edits here..."
          }
          rows={4}
          disabled={!hasSelection || isBusy}
          className="min-h-[120px] resize-y"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          disabled={isBusy || !hasSelection || !hasComments}
          onClick={onGenerateWithEdits}
        >
          {isBusy ? "Generating…" : "Generate with my edits"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy || !hasSelection}
          onClick={onApproveAsIs}
        >
          {isBusy ? "Saving approval…" : "Approve selected as-is"}
        </Button>
      </div>

      {!hasSelection && (
        <p className="mt-3 text-xs text-cos-muted">Select a version above to continue.</p>
      )}
    </section>
  );
}
