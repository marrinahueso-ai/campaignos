"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type ImportMethod = "google" | "subscribe" | "upload";

interface CalendarImportEasePanelProps {
  googleSection: ReactNode;
  subscribeSection: ReactNode;
  uploadSection: ReactNode;
  onContinueToReview?: () => void;
  onViewImportedItems?: () => void;
  /** When true, hide the page-level title (calendar shell already has Calendar H1). */
  embedded?: boolean;
  settingsHref?: string;
}

const TILES: Array<{
  id: ImportMethod;
  title: string;
  copy: string;
  art: string;
}> = [
  {
    id: "google",
    title: "Google Calendar",
    copy: "Connect the calendar your organization already uses.",
    art: "bg-gradient-to-br from-[#0b2f5b] via-[#2f9fb3] to-[#7fd0df]",
  },
  {
    id: "subscribe",
    title: "Subscribe link",
    copy: "Paste a calendar feed URL and keep it up to date.",
    art: "bg-gradient-to-br from-[#2f4a3c] via-[#6b8171] to-[#b8c9bc]",
  },
  {
    id: "upload",
    title: "Upload file",
    copy: "Drop a calendar export when you only need a one-time pass.",
    art: "bg-gradient-to-br from-[#c4922e] via-[#e0b65a] to-[#f5e6c2]",
  },
];

export function CalendarImportEasePanel({
  googleSection,
  subscribeSection,
  uploadSection,
  onContinueToReview,
  onViewImportedItems,
  embedded = false,
  settingsHref = "/settings/integrations/calendar",
}: CalendarImportEasePanelProps) {
  const [method, setMethod] = useState<ImportMethod | null>(null);

  return (
    <div className="space-y-5">
      {!embedded ? (
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Calendar
          </p>
          <h1 className="mt-1 font-display text-[clamp(1.75rem,4vw,2.25rem)] tracking-[-0.02em] text-cos-text">
            Bring in your calendar
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-cos-muted">
            Pull events from Google Calendar, a subscribe link, or a file —
            then review before they land on your year.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
          Bring your year in
        </p>
        {embedded ? (
          <ol className="flex flex-wrap items-center gap-2 text-xs font-bold text-cos-muted">
            <li className="inline-flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-cos-text text-[11px] text-cos-card">
                1
              </span>
              Choose source
            </li>
            <span aria-hidden="true">—</span>
            <li>2. Review</li>
            <span aria-hidden="true">—</span>
            <li>3. Calendar</li>
          </ol>
        ) : null}
      </div>

      <div
        className="relative overflow-hidden rounded-[22px] border border-cos-border bg-cos-card p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)] before:pointer-events-none before:absolute before:top-0 before:left-0 before:h-full before:w-1/2 before:bg-[radial-gradient(ellipse_at_left,rgba(47,74,60,0.1),transparent_60%)] before:content-[''] after:pointer-events-none after:absolute after:top-0 after:right-0 after:h-full after:w-1/2 after:bg-[radial-gradient(ellipse_at_right,rgba(196,146,46,0.12),transparent_55%)] after:content-['']"
      >
        <div className="relative space-y-4">
          {embedded ? (
            <div>
              <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-cos-text">
                Bring in your calendar
              </h3>
              <p className="mt-1.5 max-w-[46ch] text-[13px] leading-snug text-cos-muted">
                Pull events from Google Calendar, a subscribe link, or a file —
                then review before they land on your year.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            {TILES.map((tile) => {
              const on = method === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() =>
                    setMethod((current) =>
                      current === tile.id ? null : tile.id,
                    )
                  }
                  className={cn(
                    "overflow-hidden rounded-[18px] border border-cos-border bg-cos-bg text-left transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
                    on && "ring-2 ring-[#2f4a3c]/35",
                  )}
                >
                  <div className={cn("h-[88px]", tile.art)} aria-hidden />
                  <div className="px-3.5 py-3.5">
                    <strong className="block text-sm font-bold text-cos-text">
                      {tile.title}
                    </strong>
                    <span className="mt-1 block text-xs leading-snug text-cos-muted">
                      {tile.copy}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onContinueToReview ? (
              <button
                type="button"
                onClick={onContinueToReview}
                className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px"
              >
                Continue to Review →
              </button>
            ) : (
              <Link
                href="/calendar?tab=review"
                className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px"
              >
                Continue to Review →
              </Link>
            )}
            {onViewImportedItems ? (
              <button
                type="button"
                onClick={onViewImportedItems}
                className="rounded-full px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-cos-text"
              >
                View imported items
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {method === "google" ? (
        <section className="scroll-mt-8 space-y-3">
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Google Calendar
          </p>
          {googleSection}
        </section>
      ) : null}

      {method === "subscribe" ? (
        <section className="scroll-mt-8 space-y-3">
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Subscribe link
          </p>
          {subscribeSection}
        </section>
      ) : null}

      {method === "upload" ? (
        <section className="scroll-mt-8">
          <div className="rounded-[22px] border border-cos-border bg-cos-card p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-cos-text">
              Upload a file
            </h2>
            <p className="mt-1.5 mb-5 max-w-[46ch] text-[13px] leading-relaxed text-cos-muted">
              Upload your organization calendar (PDF, Word, or calendar export).
              We pull out dates, let you clean up mistakes, then add view-only
              events.
            </p>
            {uploadSection}
          </div>
        </section>
      ) : null}

      <p className="text-sm text-cos-muted">
        Manage connections anytime from{" "}
        <Link
          href={settingsHref}
          className="font-medium text-cos-text underline-offset-2 hover:underline"
        >
          Integrations → Google Calendar
        </Link>
        .
      </p>
    </div>
  );
}
