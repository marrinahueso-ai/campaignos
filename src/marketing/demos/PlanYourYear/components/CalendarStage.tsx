"use client";

import type { ReactNode } from "react";
import { motion, type MotionValue, useTransform } from "motion/react";
import { Drawer, Highlight, useTimeline } from "@/marketing/engine";
import { CalendarCard } from "./CalendarCard";
import { DragGhost } from "./DragGhost";
import { EventDetailPanel } from "./EventDetailPanel";
import { PLAN_YOUR_YEAR_DEMO } from "../demoData";

export function CalendarStage() {
  const timeline = useTimeline();
  const { days, weekdays, dragPost, openEvent, staticCards, labels, views, layers } =
    PLAN_YOUR_YEAR_DEMO;

  const sourceOpacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    if (t < 4.2) return 1;
    if (t < 4.5) return 1 - (t - 4.2) / 0.3;
    return 0;
  });

  const destOpacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 1;
    if (t < 8.2) return 0;
    if (t < 8.7) return (t - 8.2) / 0.5;
    return 1;
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cos-border)] bg-[var(--cos-card)]/80 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="font-serif text-base text-[var(--cos-text)] sm:text-lg">
            {labels.month}
          </p>
          <p className="text-[10px] tracking-wide text-[var(--cos-muted)] uppercase">
            {labels.school}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-md border border-[var(--cos-border)] bg-[var(--cos-bg)] p-0.5">
            {views.map((view) => (
              <span
                key={view}
                className={
                  view === "Month"
                    ? "rounded px-2 py-1 text-[10px] font-medium text-[var(--cos-text)] bg-[var(--cos-card)] shadow-sm sm:text-xs"
                    : "rounded px-2 py-1 text-[10px] text-[var(--cos-muted)] sm:text-xs"
                }
              >
                {view}
              </span>
            ))}
          </div>
          <span className="hidden rounded-md border border-[var(--cos-border)] px-2 py-1 text-[10px] text-[var(--cos-muted)] sm:inline">
            {labels.importReview}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--cos-border)] px-3 py-1.5 sm:px-4">
        {layers.map((layer) => (
          <span
            key={layer.id}
            className={
              layer.active
                ? "rounded-full border border-[var(--cos-text)]/15 bg-[var(--cos-text)] px-2 py-0.5 text-[10px] text-[var(--cos-card)]"
                : "rounded-full border border-[var(--cos-border)] px-2 py-0.5 text-[10px] text-[var(--cos-muted)]"
            }
          >
            {layer.label}
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)]">
          <div className="grid grid-cols-7 border-b border-[var(--cos-border)] bg-[var(--cos-bg)]/60">
            {weekdays.map((day) => (
              <div
                key={day}
                className="px-0.5 py-1.5 text-center text-[9px] font-medium text-[var(--cos-muted)] sm:text-[10px]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-4">
            {days.map((day) => {
              const staticOnDay = staticCards.filter((c) => c.day === day.key);
              const isSource = day.key === dragPost.fromDay;
              const isDest = day.key === dragPost.toDay;
              const hasOpenEvent = day.key === openEvent.day;

              return (
                <div
                  key={day.key}
                  className="flex min-h-0 flex-col border-b border-r border-[var(--cos-border)] p-0.5 last:border-r-0 sm:p-1"
                >
                  <span className="mb-0.5 px-0.5 text-[9px] font-medium text-[var(--cos-text)] sm:text-[10px]">
                    {day.date}
                  </span>
                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    {hasOpenEvent ? (
                      <Highlight
                        cue="open-event"
                        untilCue="drawer"
                        className="rounded-md"
                      >
                        <CalendarCard
                          kind={openEvent.kind}
                          category={openEvent.category}
                          title={openEvent.title}
                          status={openEvent.status}
                        />
                      </Highlight>
                    ) : null}

                    {staticOnDay.map((card) => (
                      <CalendarCard
                        key={card.id}
                        kind={card.kind}
                        category={card.category}
                        title={card.title}
                        status={card.status}
                        platforms={
                          "platforms" in card ? card.platforms : undefined
                        }
                      />
                    ))}

                    {isSource ? (
                      <Highlight cue="grab" untilCue="drag" className="rounded-md">
                        <OpacityWrap opacity={sourceOpacity}>
                          <CalendarCard
                            kind={dragPost.kind}
                            category={dragPost.category}
                            title={dragPost.title}
                            status={dragPost.status}
                            platforms={dragPost.platforms}
                            showGrip
                            highlighted
                          />
                        </OpacityWrap>
                      </Highlight>
                    ) : null}

                    {isDest ? (
                      <OpacityWrap opacity={destOpacity}>
                        <CalendarCard
                          kind={dragPost.kind}
                          category={dragPost.category}
                          title={dragPost.title}
                          status={dragPost.status}
                          platforms={dragPost.platforms}
                          showGrip
                        />
                      </OpacityWrap>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DragGhost />

      <Drawer
        cue="drawer"
        placement="right"
        size="78%"
        showOverlay
        panelClassName="absolute top-0 right-0 bottom-0 flex w-[min(100%,20rem)] flex-col overflow-hidden border-l border-[var(--cos-border)] bg-[var(--cos-card)] shadow-md sm:w-[72%]"
      >
        <EventDetailPanel />
      </Drawer>
    </div>
  );
}

function OpacityWrap({
  children,
  opacity,
}: {
  children: ReactNode;
  opacity: MotionValue<number>;
}) {
  return <motion.div style={{ opacity }}>{children}</motion.div>;
}
