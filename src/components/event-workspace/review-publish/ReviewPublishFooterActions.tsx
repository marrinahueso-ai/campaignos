"use client";

import { Button } from "@/components/ui/Button";
import type { ReviewPublishTimingOption } from "@/components/event-workspace/review-publish/schedule-utils";

interface ReviewPublishFooterActionsProps {
  timingOption: ReviewPublishTimingOption;
  isPending?: boolean;
  isPlatformPending?: boolean;
  onSaveDraft: () => void;
  onScheduleForLater: () => void;
  onPublishNow: () => void;
}

export function ReviewPublishFooterActions({
  timingOption,
  isPending = false,
  isPlatformPending = false,
  onSaveDraft,
  onScheduleForLater,
  onPublishNow,
}: ReviewPublishFooterActionsProps) {
  const actionsDisabled = isPending || isPlatformPending;

  return (
    <footer className="flex flex-col gap-3 border-t border-cos-border bg-cos-bg/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5 sm:py-5">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-9 border-cos-accent-soft bg-cos-bg px-4 hover:bg-cos-accent-soft/60"
        onClick={onSaveDraft}
        disabled={actionsDisabled}
      >
        Save as draft
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-9 px-4"
        onClick={onScheduleForLater}
        disabled={actionsDisabled}
      >
        {isPending && timingOption === "schedule" ? "Scheduling…" : "Schedule for later"}
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-9 px-4"
        onClick={onPublishNow}
        disabled={actionsDisabled}
      >
        {isPending && timingOption === "now" ? "Publishing…" : "Publish now"}
      </Button>
    </footer>
  );
}
