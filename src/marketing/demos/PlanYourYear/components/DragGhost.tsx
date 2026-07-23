"use client";

import { motion, useTransform } from "motion/react";
import { useTimeline } from "@/marketing/engine";
import { CalendarCard } from "./CalendarCard";
import { PLAN_YOUR_YEAR_DEMO } from "../demoData";

/**
 * Absolute ghost card that follows the drag path Wed → Fri during the DnD beat.
 */
export function DragGhost() {
  const timeline = useTimeline();
  const { dragPost } = PLAN_YOUR_YEAR_DEMO;

  const opacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    if (t < 5.5 || t > 10.9) return 0;
    if (t < 5.8) return (t - 5.5) / 0.3;
    if (t > 10.5) return 1 - (t - 10.5) / 0.4;
    return 1;
  });

  const left = useTransform(timeline.time, [5.5, 10.5], ["28%", "68%"]);
  const top = useTransform(timeline.time, [5.5, 7.5, 10.5], ["48%", "40%", "52%"]);
  const scale = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 1;
    if (t >= 5.5 && t <= 10.9) return 1.04;
    return 1;
  });
  const rotate = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return "0deg";
    if (t >= 5.5 && t <= 10.9) return "-2deg";
    return "0deg";
  });

  return (
    <motion.div
      className="pointer-events-none absolute z-30 w-[7.5rem] sm:w-[8.5rem]"
      style={{ opacity, left, top, scale, rotate }}
      aria-hidden
    >
      <CalendarCard
        category={dragPost.category}
        title={dragPost.title}
        status={dragPost.status}
        highlighted
        className="flex gap-1.5 rounded-lg border border-[var(--cos-accent)] bg-[var(--cos-card)] px-1.5 py-1.5 shadow-md ring-1 ring-[var(--cos-accent)]/25"
      />
    </motion.div>
  );
}
