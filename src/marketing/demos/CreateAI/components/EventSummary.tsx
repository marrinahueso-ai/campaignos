"use client";

import { BadgeChange, Highlight, Pulse } from "@/marketing/engine";
import { CREATE_AI_DEMO } from "../demoData";

interface EventSummaryProps {
  /** Element id used by the cursor to target the CTA. */
  ctaId?: string;
}

/**
 * Event summary column: meta, status badge, Create with AI CTA.
 */
export function EventSummary({ ctaId = "create-ai-cta" }: EventSummaryProps) {
  const { event, school, status, cta } = CREATE_AI_DEMO;

  return (
    <section className="flex h-full flex-col justify-between gap-4 p-3 sm:p-4 md:p-5">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-serif text-xl leading-tight text-[var(--cos-text)] sm:text-2xl">
            {event.title}
          </h2>
          <p className="text-sm text-[var(--cos-muted)]">{school}</p>
        </div>

        <dl className="grid gap-1.5 text-sm text-[var(--cos-text)]">
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-[var(--cos-muted)]">Date</dt>
            <dd>{event.date}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-[var(--cos-muted)]">Time</dt>
            <dd>{event.time}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-[var(--cos-muted)]">Place</dt>
            <dd className="min-w-0 truncate">{event.location}</dd>
          </div>
        </dl>

        <div className="pt-1">
          <BadgeChange
            cue="ready"
            fromLabel={status.start}
            toLabel={status.end}
            duration={0.55}
            fromClassName="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--cos-border)] bg-[var(--cos-bg)] px-2.5 text-xs font-medium text-[var(--cos-muted)]"
            toClassName="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--cos-warning-text)]/20 bg-[var(--cos-warning)] px-2.5 text-xs font-medium text-[var(--cos-warning-text)]"
            className="relative inline-flex min-w-[8.5rem] items-center justify-center overflow-hidden rounded-full"
          />
        </div>
      </div>

      <div className="relative inline-flex self-start">
        <Highlight
          cue="create-cta"
          untilCue="panel-open"
          variant="outline"
          className="rounded-xl"
        >
          <Pulse cue="create-cta" untilCue="create-click" maxPulses={1} period={1.1}>
            <button
              id={ctaId}
              type="button"
              tabIndex={-1}
              className="rounded-xl bg-[var(--cos-primary)] px-4 py-2.5 text-sm font-medium text-[#f6f2eb] shadow-sm"
              aria-hidden
            >
              {cta}
            </button>
          </Pulse>
        </Highlight>
      </div>
    </section>
  );
}
