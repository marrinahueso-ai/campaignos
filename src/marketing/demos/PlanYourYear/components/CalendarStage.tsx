"use client";

import { FadeSlide, Highlight, useTimeline } from "@/marketing/engine";
import { PLAN_YOUR_YEAR_DEMO } from "../demoData";

/** Compact month strip — enough to tell the story without overflowing the frame. */
const DAYS = Array.from({ length: 14 }, (_, i) => i + 1);

export function CalendarStage() {
  useTimeline();
  const byDay = new Map<number, (typeof PLAN_YOUR_YEAR_DEMO.events)[number]>(
    PLAN_YOUR_YEAR_DEMO.events.map((event) => [event.day, event]),
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 sm:p-4 md:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-[var(--cos-text)]">
            {PLAN_YOUR_YEAR_DEMO.labels.month}
          </p>
          <p className="text-[10px] tracking-wide text-[var(--cos-muted)] uppercase">
            {PLAN_YOUR_YEAR_DEMO.labels.school}
          </p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--cos-muted)] sm:text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {/* August 2026 starts Saturday — pad 6 empty cells for week alignment */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`pad-${i}`}
              className="min-h-[2.6rem] rounded border border-transparent sm:min-h-[3rem]"
              aria-hidden
            />
          ))}
          {DAYS.map((day) => {
            const event = byDay.get(day);
            const isFair = event?.title === "Back to School Fair";
            return (
              <div
                key={day}
                data-plan-day={day}
                className="relative min-h-[2.6rem] rounded border border-[var(--cos-border)] bg-[var(--cos-card)] p-1 sm:min-h-[3rem]"
              >
                <span className="text-[10px] text-[var(--cos-muted)]">{day}</span>
                {event ? (
                  isFair ? (
                    <Highlight
                      cue="select"
                      untilCue="detail"
                      className="mt-0.5 truncate rounded bg-[var(--cos-text)] px-1 py-0.5 text-[9px] text-[var(--cos-card)] sm:text-[10px]"
                    >
                      {event.title}
                    </Highlight>
                  ) : (
                    <p
                      className={
                        event.tone === "sage"
                          ? "mt-0.5 truncate rounded bg-[var(--cos-brand-sage)]/25 px-1 py-0.5 text-[9px] text-[var(--cos-text)] sm:text-[10px]"
                          : "mt-0.5 truncate rounded bg-[var(--cos-bg-alt)] px-1 py-0.5 text-[9px] text-[var(--cos-muted)] sm:text-[10px]"
                      }
                    >
                      {event.title}
                    </p>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-[var(--cos-muted)]">
          Showing early August · full year lives in Calendar
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto md:w-[42%]">
        <FadeSlide cue="detail" direction="left" distance={12} holdAfter>
          <aside className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3 sm:p-4">
            <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
              {PLAN_YOUR_YEAR_DEMO.labels.detail}
            </p>
            <p className="mt-1 font-serif text-lg text-[var(--cos-text)]">
              {PLAN_YOUR_YEAR_DEMO.selected.title}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm text-[var(--cos-muted)]">
              <div>
                <dt className="sr-only">Date</dt>
                <dd>{PLAN_YOUR_YEAR_DEMO.selected.date}</dd>
              </div>
              <div>
                <dt className="sr-only">Time</dt>
                <dd>{PLAN_YOUR_YEAR_DEMO.selected.time}</dd>
              </div>
              <div>
                <dt className="sr-only">Place</dt>
                <dd>{PLAN_YOUR_YEAR_DEMO.selected.place}</dd>
              </div>
            </dl>
            <p className="mt-3 rounded border border-[var(--cos-border)] bg-[var(--cos-bg)] px-2.5 py-2 text-sm text-[var(--cos-text)]">
              {PLAN_YOUR_YEAR_DEMO.selected.next}
            </p>
          </aside>
        </FadeSlide>

        <FadeSlide cue="heatmap" direction="up" distance={8} holdAfter>
          <div className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3">
            <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
              {PLAN_YOUR_YEAR_DEMO.labels.heatmap}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLAN_YOUR_YEAR_DEMO.heatmap.map((slot) => (
                <span
                  key={slot}
                  className="rounded-full border border-[var(--cos-brand-sage)]/40 bg-[var(--cos-brand-sage)]/15 px-2.5 py-1 text-xs text-[var(--cos-text)]"
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>
        </FadeSlide>
      </div>
    </div>
  );
}
