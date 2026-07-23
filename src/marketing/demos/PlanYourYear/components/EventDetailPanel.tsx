"use client";

import { AutoScroll, Highlight } from "@/marketing/engine";
import { PLAN_YOUR_YEAR_DEMO } from "../demoData";

/** Local event detail content for the month-view demo drawer. */
export function EventDetailPanel() {
  const { eventDetail } = PLAN_YOUR_YEAR_DEMO;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-[var(--cos-border)] px-3 py-3 sm:px-4">
        <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--cos-muted)] uppercase">
          {eventDetail.eyebrow}
        </p>
        <p className="mt-1 font-serif text-lg text-[var(--cos-text)] sm:text-xl">
          {eventDetail.title}
        </p>
        <p className="text-xs text-[var(--cos-muted)] sm:text-sm">
          {eventDetail.dateLine}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color-mix(in_srgb,var(--cos-accent)_40%,var(--cos-border))] bg-[var(--cos-accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--cos-warning-text)]">
            {eventDetail.status}
          </span>
          <span className="text-[11px] text-[var(--cos-muted)]">
            {eventDetail.location}
          </span>
        </div>
      </header>

      <AutoScroll
        cue="scroll"
        untilCue="toast"
        target="[data-planning-hub-cta]"
        duration={2.8}
        className="min-h-0 flex-1 space-y-4 p-3 sm:p-4"
      >
        <section>
          <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
            Overview
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--cos-text)]">
            {eventDetail.summary}
          </p>
        </section>

        <section>
          <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
            Campaign plan
          </p>
          <ul className="mt-2 space-y-2">
            {eventDetail.planItems.map((item) => (
              <li
                key={item.label}
                className="flex items-start justify-between gap-3 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg)]/50 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--cos-text)]">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-[var(--cos-muted)]">
                    {item.timing}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-[var(--cos-muted)]">
                  {item.state}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
            Before you publish
          </p>
          <ul className="mt-2 space-y-1.5">
            {eventDetail.notes.map((note) => (
              <li
                key={note}
                className="text-sm leading-relaxed text-[var(--cos-text)]"
              >
                <span className="mr-1.5 text-[var(--cos-muted)]">•</span>
                {note}
              </li>
            ))}
          </ul>
        </section>

        <div className="pt-1 pb-2" data-planning-hub-cta>
          <Highlight cue="hub" untilCue="toast" className="rounded-md">
            <span className="inline-flex w-full items-center justify-center rounded-md bg-[var(--cos-text)] px-3 py-2.5 text-sm text-[var(--cos-card)]">
              {eventDetail.hubCta}
            </span>
          </Highlight>
        </div>
      </AutoScroll>
    </div>
  );
}
