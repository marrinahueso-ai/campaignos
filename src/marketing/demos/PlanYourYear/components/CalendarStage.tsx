"use client";

import type { ReactNode } from "react";
import { motion, type MotionValue, useTransform } from "motion/react";
import { Highlight, useTimeline } from "@/marketing/engine";
import { CalendarCard } from "./CalendarCard";
import { DragGhost } from "./DragGhost";
import { PLAN_YOUR_YEAR_DEMO } from "../demoData";

export function CalendarStage() {
  const timeline = useTimeline();
  const { days, dragPost, staticCards, labels } = PLAN_YOUR_YEAR_DEMO;

  const sourceOpacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    if (t < 5.5) return 1;
    if (t < 5.8) return 1 - (t - 5.5) / 0.3;
    return 0;
  });

  const destOpacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 1;
    if (t < 10.7) return 0;
    if (t < 11.2) return (t - 10.7) / 0.5;
    return 1;
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--cos-text)]">
            {labels.weekLabel}
          </p>
          <p className="text-[10px] tracking-wide text-[var(--cos-muted)] uppercase">
            {labels.school}
          </p>
        </div>
        <p className="text-[10px] text-[var(--cos-muted)]">{labels.month}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day) => {
          const staticOnDay = staticCards.filter((c) => c.day === day.key);
          const isSource = day.key === dragPost.fromDay;
          const isDest = day.key === dragPost.toDay;

          return (
            <div
              key={day.key}
              className="flex min-h-0 flex-col rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg)]/50 p-1"
            >
              <div className="mb-1 flex items-baseline justify-between px-0.5">
                <span className="text-[10px] text-[var(--cos-muted)]">
                  {day.label}
                </span>
                <span className="text-[10px] font-medium text-[var(--cos-text)]">
                  {day.date}
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                {staticOnDay.map((card) => (
                  <CalendarCard
                    key={card.title}
                    category={card.category}
                    title={card.title}
                    status={card.status}
                  />
                ))}

                {isSource ? (
                  <Highlight cue="grab" untilCue="drag" className="rounded-lg">
                    <OpacityWrap opacity={sourceOpacity}>
                      <CalendarCard
                        category={dragPost.category}
                        title={dragPost.title}
                        status={dragPost.status}
                        highlighted
                      />
                    </OpacityWrap>
                  </Highlight>
                ) : null}

                {isDest ? (
                  <OpacityWrap opacity={destOpacity}>
                    <CalendarCard
                      category={dragPost.category}
                      title={dragPost.title}
                      status={dragPost.status}
                    />
                  </OpacityWrap>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-[var(--cos-muted)]">
        Drag the grip to reschedule Meta posts on the calendar
      </p>

      <DragGhost />
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
