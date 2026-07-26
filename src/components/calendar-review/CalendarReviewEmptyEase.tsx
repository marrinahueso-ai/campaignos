"use client";

import Link from "next/link";

interface CalendarReviewEmptyEaseProps {
  onGoToImport?: () => void;
}

export function CalendarReviewEmptyEase({
  onGoToImport,
}: CalendarReviewEmptyEaseProps) {
  return (
    <div className="rounded-[22px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-cos-text">
        Nothing to review yet
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-cos-muted">
        Import from Google, a subscribe link, or a file first — then we’ll focus
        what needs a decision here.
      </p>
      {onGoToImport ? (
        <button
          type="button"
          onClick={onGoToImport}
          className="mt-4 inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card"
        >
          Go to Import
        </button>
      ) : (
        <Link
          href="/calendar?tab=import"
          className="mt-4 inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card"
        >
          Go to Import
        </Link>
      )}
    </div>
  );
}
